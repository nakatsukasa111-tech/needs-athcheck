begin;

alter table public.athlete_photos alter column field_key drop not null;
alter table public.athlete_photos add column memo text check(char_length(memo)<=500);
alter table public.athlete_photos drop constraint athlete_photos_phase_check;
update public.athlete_photos set phase='other' where phase='normal';
alter table public.athlete_photos add constraint athlete_photos_phase_check check(phase in ('before','after','other'));
alter table public.athlete_photos add column sort_order bigint not null default (extract(epoch from clock_timestamp())*1000000)::bigint;
with ordered as (select id,row_number() over(order by uploaded_at,id) as position from public.athlete_photos)
update public.athlete_photos p set sort_order=o.position from ordered o where p.id=o.id;
create function public.swap_athlete_photo_order(first_id uuid,second_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare first_photo public.athlete_photos%rowtype; second_photo public.athlete_photos%rowtype;
begin
 select * into first_photo from public.athlete_photos where id=first_id and status='ready' for update;
 select * into second_photo from public.athlete_photos where id=second_id and status='ready' for update;
 if first_photo.id is null or second_photo.id is null or first_photo.id=second_photo.id
    or first_photo.company_id<>second_photo.company_id or first_photo.member_id<>second_photo.member_id
    or first_photo.session_id<>second_photo.session_id then raise exception 'Photo order mismatch'; end if;
 update public.athlete_photos set sort_order=case id when first_id then second_photo.sort_order else first_photo.sort_order end
 where id in(first_id,second_id);
end $$;
revoke all on function public.swap_athlete_photo_order(uuid,uuid) from public,anon,authenticated;
grant execute on function public.swap_athlete_photo_order(uuid,uuid) to service_role;

commit;
