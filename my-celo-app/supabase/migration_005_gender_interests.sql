alter table profiles
  add column if not exists gender    text    default null,
  add column if not exists interests text[]  default '{}';
