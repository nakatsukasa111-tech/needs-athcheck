begin;
create table public.athlete_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  member_id uuid not null,
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (member_id, company_id) references public.athlete_members(id, company_id),
  unique (member_id)
);
alter table public.athlete_invitations enable row level security;
revoke all on public.athlete_invitations from anon, authenticated;
grant select, delete on public.athlete_invitations to authenticated;
grant insert(company_id,member_id,email) on public.athlete_invitations to authenticated;
grant all on public.athlete_invitations to service_role;
create policy invitations_admin_read on public.athlete_invitations for select to authenticated
  using (athlete_private.staff_role(company_id) = 'admin');
create policy invitations_admin_insert on public.athlete_invitations for insert to authenticated
  with check (athlete_private.staff_role(company_id) = 'admin');
create policy invitations_admin_delete on public.athlete_invitations for delete to authenticated
  using (athlete_private.staff_role(company_id) = 'admin' and accepted_at is null);

-- Auth側で検証済みのメールだけを使用する。JWTの自己申告情報は使わない。
create function public.accept_athlete_invitation() returns integer
language plpgsql security definer set search_path = '' as $$
declare verified_email text; invitation record; total integer := 0;
begin
  select lower(u.email) into verified_email from auth.users u
    where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
  if verified_email is null then return 0; end if;
  for invitation in select i.* from public.athlete_invitations i
    join public.athlete_companies c on c.id=i.company_id
    join public.athlete_members m on m.id=i.member_id and m.company_id=i.company_id
    where i.email=verified_email and i.accepted_at is null and i.expires_at > now() and c.active and m.active
    for update of i
  loop
    insert into public.athlete_member_access(user_id,member_id,company_id)
      values((select auth.uid()),invitation.member_id,invitation.company_id)
      on conflict(member_id) do nothing;
    if exists(select 1 from public.athlete_member_access a
      where a.member_id=invitation.member_id and a.user_id=(select auth.uid()) and a.active) then
      update public.athlete_invitations set accepted_at=now() where id=invitation.id;
      total := total+1;
    end if;
  end loop;
  return total;
end;
$$;
revoke all on function public.accept_athlete_invitation() from public;
grant execute on function public.accept_athlete_invitation() to authenticated;
commit;
