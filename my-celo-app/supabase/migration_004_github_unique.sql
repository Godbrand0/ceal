-- Ensure each GitHub username can only be linked to one profile (nulls are exempt)
create unique index if not exists idx_profiles_github_username
  on profiles (lower(github_username))
  where github_username is not null;
