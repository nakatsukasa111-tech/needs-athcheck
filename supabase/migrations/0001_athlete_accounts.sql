-- アスチェック専用の新しい Supabase プロジェクトへ適用する。
-- physical-check のDBや、現行スプレッドシートへは適用しない。
begin;
create schema if not exists athlete_private;
revoke all on schema athlete_private from public;
grant usage on schema athlete_private to authenticated;

create table public.athlete_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  active boolean not null default true
);
create table public.athlete_staff (
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.athlete_companies(id),
  role text not null check (role in ('admin', 'trainer')),
  display_name text not null,
  active boolean not null default true,
  primary key (user_id, company_id)
);
create table public.athlete_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.athlete_companies(id),
  display_name text not null check (length(trim(display_name)) > 0),
  birth_date date,
  threshold_sex text check (threshold_sex in ('M', 'F')),
  external_customer_no text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, company_id)
);
-- 本人確認済みのAuthユーザーだけを管理側で結び付ける。メールや自己申告のメタデータで自動昇格しない。
create table public.athlete_member_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null,
  company_id uuid not null,
  active boolean not null default true,
  primary key (user_id, member_id),
  unique (member_id),
  foreign key (member_id, company_id) references public.athlete_members(id, company_id)
);
create table public.athlete_measurements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  member_id uuid not null,
  measured_on date not null,
  values jsonb not null default '{}' check (jsonb_typeof(values) = 'object'),
  weight numeric check (weight > 0),
  estimated_items text[] not null default '{}',
  age_band text not null check (age_band in ('adult', 'junior', 'elementary')),
  threshold_sex text not null check (threshold_sex in ('M', 'F')),
  definition_version text not null default 'athlete-v1',
  saved_score jsonb not null default '{}' check (jsonb_typeof(saved_score) = 'object'),
  public_comment text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  foreign key (member_id, company_id) references public.athlete_members(id, company_id),
  unique (id, company_id)
);
create table public.athlete_internal_notes (
  member_id uuid primary key,
  company_id uuid not null,
  note text not null default '',
  foreign key (member_id, company_id) references public.athlete_members(id, company_id)
);
create table public.athlete_scoring_settings (
  company_id uuid primary key references public.athlete_companies(id),
  thresholds jsonb not null default '{}' check (jsonb_typeof(thresholds) = 'object'),
  rules jsonb not null default '{}' check (jsonb_typeof(rules) = 'object')
);
create index on public.athlete_members(company_id);
create index on public.athlete_measurements(company_id, member_id, measured_on);

create function athlete_private.staff_role(target uuid) returns text
language sql stable security definer set search_path = '' as $$
  select s.role from public.athlete_staff s join public.athlete_companies c on c.id = s.company_id
  where s.user_id = (select auth.uid()) and s.company_id = target and s.active and c.active
$$;
create function athlete_private.owns_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.athlete_member_access a
    join public.athlete_members m on m.id = a.member_id and m.company_id = a.company_id
    join public.athlete_companies c on c.id = a.company_id
    where a.user_id = (select auth.uid()) and a.member_id = target and a.active and m.active and c.active)
$$;
create function athlete_private.member_company(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.athlete_member_access a
    join public.athlete_members m on m.id = a.member_id and m.company_id = a.company_id
    join public.athlete_companies c on c.id = a.company_id
    where a.user_id = (select auth.uid()) and a.company_id = target and a.active and m.active and c.active)
$$;
revoke all on all functions in schema athlete_private from public;
grant execute on all functions in schema athlete_private to authenticated;

alter table public.athlete_companies enable row level security;
alter table public.athlete_staff enable row level security;
alter table public.athlete_members enable row level security;
alter table public.athlete_member_access enable row level security;
alter table public.athlete_measurements enable row level security;
alter table public.athlete_internal_notes enable row level security;
alter table public.athlete_scoring_settings enable row level security;

revoke all on public.athlete_companies, public.athlete_staff, public.athlete_members,
  public.athlete_member_access, public.athlete_measurements, public.athlete_internal_notes,
  public.athlete_scoring_settings from anon, authenticated;
grant select on public.athlete_companies, public.athlete_staff, public.athlete_member_access to authenticated;
grant select, insert, update on public.athlete_members, public.athlete_measurements,
  public.athlete_internal_notes, public.athlete_scoring_settings to authenticated;
grant all on public.athlete_companies, public.athlete_staff, public.athlete_members,
  public.athlete_member_access, public.athlete_measurements, public.athlete_internal_notes,
  public.athlete_scoring_settings to service_role;

create policy company_read on public.athlete_companies for select to authenticated
  using (athlete_private.staff_role(id) is not null or athlete_private.member_company(id));
create policy staff_read on public.athlete_staff for select to authenticated
  using (athlete_private.staff_role(company_id) is not null);
create policy access_read on public.athlete_member_access for select to authenticated
  using ((user_id = (select auth.uid()) and athlete_private.owns_member(member_id))
    or athlete_private.staff_role(company_id) = 'admin');
create policy member_read on public.athlete_members for select to authenticated
  using (athlete_private.staff_role(company_id) is not null or athlete_private.owns_member(id));
create policy member_insert on public.athlete_members for insert to authenticated
  with check (athlete_private.staff_role(company_id) is not null);
create policy member_update on public.athlete_members for update to authenticated
  using (athlete_private.staff_role(company_id) is not null)
  with check (athlete_private.staff_role(company_id) is not null);
create policy measurement_read on public.athlete_measurements for select to authenticated
  using (athlete_private.staff_role(company_id) is not null or (published and athlete_private.owns_member(member_id)));
create policy measurement_insert on public.athlete_measurements for insert to authenticated
  with check (athlete_private.staff_role(company_id) is not null);
create policy measurement_update on public.athlete_measurements for update to authenticated
  using (athlete_private.staff_role(company_id) is not null)
  with check (athlete_private.staff_role(company_id) is not null);
create policy notes_staff on public.athlete_internal_notes for all to authenticated
  using (athlete_private.staff_role(company_id) is not null)
  with check (athlete_private.staff_role(company_id) is not null);
create policy settings_read on public.athlete_scoring_settings for select to authenticated
  using (athlete_private.staff_role(company_id) is not null or athlete_private.member_company(company_id));
create policy settings_insert on public.athlete_scoring_settings for insert to authenticated
  with check (athlete_private.staff_role(company_id) = 'admin');
create policy settings_update on public.athlete_scoring_settings for update to authenticated
  using (athlete_private.staff_role(company_id) = 'admin')
  with check (athlete_private.staff_role(company_id) = 'admin');
commit;
