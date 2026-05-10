-- Create the ringtones storage bucket.
-- Supabase Storage buckets live in the storage schema and can be
-- provisioned via SQL — no dashboard required.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ringtones',
  'ringtones',
  true,                -- public bucket so getPublicUrl() works without signed URLs
  10485760,            -- 10 MB hard cap per file (enforced by storage layer)
  array[
    'audio/mpeg',      -- .mp3
    'audio/mp3',       -- some browsers send this variant
    'audio/wav',
    'audio/ogg',
    'audio/m4a',
    'audio/mp4',       -- common for .m4a / AAC in browsers
    'audio/aac',
    'audio/x-m4a'
  ]
)
on conflict (id) do update set
  public             = true,
  file_size_limit    = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── Storage RLS policies ─────────────────────────────────────
-- Anyone authenticated can read (needed for public URL playback)
create policy "Authenticated users can read ringtones"
  on storage.objects for select
  using (bucket_id = 'ringtones' and auth.role() = 'authenticated');

-- Users can only upload into their own folder  (user_id/filename)
create policy "Users can upload their own ringtones"
  on storage.objects for insert
  with check (
    bucket_id = 'ringtones' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own files
create policy "Users can delete their own ringtones"
  on storage.objects for delete
  using (
    bucket_id = 'ringtones' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
