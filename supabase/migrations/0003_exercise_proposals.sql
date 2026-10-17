begin;
-- 本文・動画・秘密URLは複製しない。教材元で確認した公開状態をサーバー経由で同期する。
create table public.athlete_lessons (
 company_id uuid not null references public.athlete_companies(id),
 id text not null check (id ~ '^[a-zA-Z0-9_-]+$'),
 title text not null,
 tags text[] not null default '{}',
 source_approved boolean not null default false,
 demo_approved boolean not null default false,
 member_enabled boolean not null default false,
 member_url text check (member_url is null or member_url ~ '^https://[^[:space:]]+$'),
 source_revision text not null,
 synced_at timestamptz not null default now(),
 primary key (company_id,id)
);
create table public.athlete_exercise_rules (
 company_id uuid not null references public.athlete_companies(id),
 id text not null,
 field text not null,
 max_point numeric not null check (max_point > 0 and max_point <= 3),
 tags text[] not null default '{}',
 lesson_ids text[] not null default '{}',
 reason text not null,
 approved boolean not null default false,
 primary key(company_id,id),
 check (cardinality(tags)>0 or cardinality(lesson_ids)>0)
);
create table public.athlete_exercise_assignments (
 company_id uuid not null,
 measurement_id uuid not null,
 lesson_id text not null,
 trainer_note text not null default '' check (length(trainer_note)<=2000),
 confirmed boolean not null default false,
 primary key(measurement_id,lesson_id),
 foreign key(measurement_id,company_id) references public.athlete_measurements(id,company_id),
 foreign key(company_id,lesson_id) references public.athlete_lessons(company_id,id)
);
create function athlete_private.lesson_ready(company uuid, lesson text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.athlete_lessons l where l.company_id=company and l.id=lesson and (l.source_approved or l.demo_approved) and l.member_enabled and l.member_url is not null)
$$;
create function athlete_private.lesson_visible(company uuid, lesson text) returns boolean
language sql stable security definer set search_path='' as $$
 select athlete_private.lesson_ready(company,lesson) and exists(
 select 1 from public.athlete_exercise_assignments a join public.athlete_measurements m on m.id=a.measurement_id and m.company_id=a.company_id
 where a.company_id=company and a.lesson_id=lesson and a.confirmed and m.published and athlete_private.owns_member(m.member_id))
$$;
revoke all on function athlete_private.lesson_ready(uuid,text),athlete_private.lesson_visible(uuid,text) from public;
grant execute on function athlete_private.lesson_ready(uuid,text),athlete_private.lesson_visible(uuid,text) to authenticated;
alter table public.athlete_lessons enable row level security;
alter table public.athlete_exercise_rules enable row level security;
alter table public.athlete_exercise_assignments enable row level security;
revoke all on public.athlete_lessons,public.athlete_exercise_rules,public.athlete_exercise_assignments from anon,authenticated;
grant select on public.athlete_lessons to authenticated;
grant select,insert,update,delete on public.athlete_exercise_rules,public.athlete_exercise_assignments to authenticated;
grant all on public.athlete_lessons,public.athlete_exercise_rules,public.athlete_exercise_assignments to service_role;
create policy lessons_read on public.athlete_lessons for select to authenticated using (athlete_private.staff_role(company_id) is not null or athlete_private.lesson_visible(company_id,id));
create policy rules_read on public.athlete_exercise_rules for select to authenticated using (athlete_private.staff_role(company_id) is not null);
create policy rules_manage on public.athlete_exercise_rules for all to authenticated using (athlete_private.staff_role(company_id)='admin') with check (athlete_private.staff_role(company_id)='admin');
create policy assignments_read on public.athlete_exercise_assignments for select to authenticated using (
 athlete_private.staff_role(company_id) is not null or (confirmed and athlete_private.lesson_ready(company_id,lesson_id) and exists(select 1 from public.athlete_measurements m where m.id=measurement_id and m.company_id=athlete_exercise_assignments.company_id and m.published and athlete_private.owns_member(m.member_id))));
create policy assignments_insert on public.athlete_exercise_assignments for insert to authenticated with check (athlete_private.staff_role(company_id) is not null and (not confirmed or athlete_private.lesson_ready(company_id,lesson_id)));
create policy assignments_update on public.athlete_exercise_assignments for update to authenticated using (athlete_private.staff_role(company_id) is not null) with check (athlete_private.staff_role(company_id) is not null and (not confirmed or athlete_private.lesson_ready(company_id,lesson_id)));
create policy assignments_delete on public.athlete_exercise_assignments for delete to authenticated using (athlete_private.staff_role(company_id) is not null);
commit;
