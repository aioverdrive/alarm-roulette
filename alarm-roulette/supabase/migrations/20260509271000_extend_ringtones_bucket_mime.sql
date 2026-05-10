-- Existing projects already ran create_ringtones_bucket; append MIME browsers use for M4A.
update storage.buckets
set allowed_mime_types = coalesce(allowed_mime_types, '{}'::text[]) || array['audio/mp4'::text]
where id = 'ringtones';
