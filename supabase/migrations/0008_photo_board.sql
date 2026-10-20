begin;
alter table public.athlete_photo_sessions
 add column photo_layout jsonb,
 add column layout_revision integer not null default 0;
alter table public.athlete_photos
 add column deleted_at timestamptz,
 add column preview_path text;
create index athlete_photos_trash on public.athlete_photos(deleted_at) where deleted_at is not null;
drop policy photo_staff_read on public.athlete_photos;
create policy photo_staff_read on public.athlete_photos for select to authenticated
 using(status='ready' and (deleted_at is null or deleted_at>now()-interval '30 days') and athlete_private.staff_role(company_id) is not null);

-- A session lock and compare-and-swap keep upload completion, edits and moves atomic.
-- Only the authenticated server can call this; company/member ownership is checked here too.
create function public.commit_athlete_photo_board(
 p_session uuid,p_company uuid,p_member uuid,p_revision integer,p_layout jsonb,p_changes jsonb
) returns integer language plpgsql security definer set search_path='' as $$
declare current_revision integer; change jsonb; photo public.athlete_photos%rowtype;
begin
 select layout_revision into current_revision from public.athlete_photo_sessions
 where id=p_session and company_id=p_company and member_id=p_member for update;
 if current_revision is null or current_revision<>p_revision then raise exception 'PHOTO_CONFLICT'; end if;
 if jsonb_typeof(p_layout->'rows')<>'array' or jsonb_typeof(p_layout->'other')<>'array'
 or octet_length(p_layout::text)>1048576 then raise exception 'PHOTO_LAYOUT'; end if;
 for change in select value from jsonb_array_elements(p_changes) loop
  select * into photo from public.athlete_photos where id=(change->>'id')::uuid
   and session_id=p_session and company_id=p_company and member_id=p_member for update;
  if photo.id is null then raise exception 'PHOTO_OWNER'; end if;
  if change ? 'expected_revision' and photo.annotation_revision<>(change->>'expected_revision')::integer then raise exception 'PHOTO_EDIT_CONFLICT'; end if;
  if change ? 'restore' and (photo.deleted_at is null or photo.deleted_at<=now()-interval '30 days') then raise exception 'PHOTO_RESTORE_EXPIRED'; end if;
  if photo.deleted_at is not null and not (change ? 'restore') then raise exception 'PHOTO_DELETED'; end if;
  update public.athlete_photos set
   status=case when change ? 'status' then change->>'status' else status end,
   phase=case when change ? 'phase' then change->>'phase' else phase end,
   memo=case when change ? 'memo' then change->>'memo' else memo end,
   field_key=case when change ? 'field_key' then change->>'field_key' else field_key end,
   annotations=case when change ? 'annotations' then change->'annotations' else annotations end,
   annotation_revision=annotation_revision+case when change ? 'annotations' or change ? 'phase' or change ? 'delete' or change ? 'restore' then 1 else 0 end,
   preview_path=case when change ? 'preview_path' then change->>'preview_path' else preview_path end,
   deleted_at=case when change ? 'delete' then now() when change ? 'restore' then null else deleted_at end
  where id=photo.id;
 end loop;
 update public.athlete_photo_sessions set photo_layout=p_layout,layout_revision=current_revision+1 where id=p_session;
 return current_revision+1;
end $$;
revoke all on function public.commit_athlete_photo_board(uuid,uuid,uuid,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.commit_athlete_photo_board(uuid,uuid,uuid,integer,jsonb,jsonb) to service_role;
commit;
