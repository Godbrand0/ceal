-- Add media_url column to messages for image/video sharing
alter table messages add column if not exists media_url text;
