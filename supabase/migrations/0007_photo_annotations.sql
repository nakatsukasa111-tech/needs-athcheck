begin;

alter table public.athlete_photos
 add column annotations jsonb not null default '[]'::jsonb,
 add column annotation_revision integer not null default 0,
 add constraint athlete_photos_annotations_array check(jsonb_typeof(annotations)='array'),
 add constraint athlete_photos_annotations_size check(octet_length(annotations::text)<=65536);

commit;
