begin;
create table public.athlete_photo_sessions (
 id uuid primary key, company_id uuid not null, member_id uuid not null,
 measurement_id uuid, created_at timestamptz not null default now(),
 foreign key(member_id,company_id) references public.athlete_members(id,company_id),
 foreign key(measurement_id,company_id) references public.athlete_measurements(id,company_id),
 unique(id,company_id,member_id), check(measurement_id is null or measurement_id=id)
);
create table public.athlete_photos (
 id uuid primary key, session_id uuid not null, company_id uuid not null, member_id uuid not null,
 field_key text not null, phase text not null check(phase in ('before','after','normal')),
 source text not null check(source in ('camera','library')), captured_at timestamptz,
 uploaded_at timestamptz not null default now(), created_by uuid not null references auth.users(id),
 object_path text not null unique, mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
 byte_size integer not null check(byte_size>0 and byte_size<=20971520),
 status text not null default 'pending' check(status in ('pending','ready')),
 foreign key(session_id,company_id,member_id) references public.athlete_photo_sessions(id,company_id,member_id)
);
create index on public.athlete_photos(member_id,uploaded_at desc);
create index on public.athlete_photos(session_id,field_key);
alter table public.athlete_photo_sessions enable row level security;
alter table public.athlete_photos enable row level security;
revoke all on public.athlete_photo_sessions,public.athlete_photos from anon,authenticated;
grant select on public.athlete_photo_sessions,public.athlete_photos to authenticated;
grant all on public.athlete_photo_sessions,public.athlete_photos to service_role;
create policy photo_session_staff_read on public.athlete_photo_sessions for select to authenticated using(athlete_private.staff_role(company_id) is not null);
create policy photo_staff_read on public.athlete_photos for select to authenticated using(status='ready' and athlete_private.staff_role(company_id) is not null);
create function athlete_private.attach_photo_session() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.athlete_photo_sessions s where s.id=new.id and (s.member_id<>new.member_id or s.company_id<>new.company_id)) then raise exception 'Photo session owner mismatch'; end if;
 update public.athlete_photo_sessions set measurement_id=new.id where id=new.id and member_id=new.member_id and company_id=new.company_id;
 return new;
end $$;
revoke all on function athlete_private.attach_photo_session() from public;
create trigger attach_measurement_photos after insert on public.athlete_measurements for each row execute function athlete_private.attach_photo_session();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('athlete-photos','athlete-photos',false,20971520,array['image/jpeg','image/png','image/webp']);
-- No client Storage policies: files are accessed only through authorized server operations.
commit;
