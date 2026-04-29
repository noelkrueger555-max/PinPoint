-- ============================================================
-- PinPoint — full schema (Phase 1–4)
-- Run via: supabase db push  OR  paste into SQL editor.
-- ============================================================

create extension if not exists "postgis";
create extension if not exists "uuid-ossp";

-- -----------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Spieler',
  username text unique,                 -- handle for friend-search (lowercase)
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

-- Backfill columns for installs that ran the v1 schema before.
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists avatar_url text;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_username_key' and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_username_key unique (username);
  end if;
end $$;

create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists profiles_display_name_idx on public.profiles(lower(display_name));

-- -----------------------------
-- Photos
-- -----------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'photo_visibility') then
    create type photo_visibility as enum ('private', 'friends', 'public');
  end if;
end $$;

create table if not exists public.photos (
  id uuid primary key default uuid_generate_v4(),
  owner uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,         -- bucket: photos/{owner}/{id}.jpg
  thumb_path text not null,           -- bucket: thumbs/{owner}/{id}.jpg
  lat double precision not null,
  lng double precision not null,
  geom geography(point,4326) generated always as (st_makepoint(lng, lat)::geography) stored,
  taken_at timestamptz,
  caption text,
  difficulty smallint not null check (difficulty between 1 and 5),
  auto_difficulty smallint check (auto_difficulty between 1 and 5),
  visibility photo_visibility not null default 'private',
  moderation_status text not null default 'ok' check (moderation_status in ('ok','flagged','removed')),
  created_at timestamptz not null default now()
);

create index if not exists photos_owner_idx on public.photos(owner);
create index if not exists photos_visibility_idx on public.photos(visibility);
create index if not exists photos_geom_idx on public.photos using gist (geom);

-- -----------------------------
-- Lanes
-- -----------------------------
create table if not exists public.lanes (
  id uuid primary key default uuid_generate_v4(),
  owner uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  cover_photo uuid references public.photos(id) on delete set null,
  visibility photo_visibility not null default 'private',
  created_at timestamptz not null default now()
);

create table if not exists public.lane_photos (
  lane_id uuid not null references public.lanes(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  position int not null,
  primary key (lane_id, photo_id)
);
create index if not exists lane_photos_lane_pos on public.lane_photos(lane_id, position);

-- -----------------------------
-- Lobbies (shareable with code)
-- -----------------------------
create table if not exists public.lobbies (
  id uuid primary key default uuid_generate_v4(),
  owner uuid not null references public.profiles(id) on delete cascade,
  code text unique not null,                   -- 6 char short code
  title text not null default 'Lobby',
  photo_ids uuid[] not null default '{}',
  lane_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists lobbies_code_idx on public.lobbies(code);

-- -----------------------------
-- Sessions + Guesses (validated)
-- -----------------------------
create table if not exists public.sessions (
  id uuid primary key default uuid_generate_v4(),
  player uuid not null references public.profiles(id) on delete cascade,
  mode text not null,
  lobby_id uuid references public.lobbies(id) on delete set null,
  total_score int not null default 0,
  photo_count int not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists sessions_player_idx on public.sessions(player, started_at desc);

create table if not exists public.guesses (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  guess_lat double precision not null,
  guess_lng double precision not null,
  distance_km double precision not null,
  score int not null,
  hints_used smallint not null default 0,
  time_ms int not null default 0,
  validated boolean not null default false,    -- set true by edge function
  created_at timestamptz not null default now()
);

-- -----------------------------
-- Daily challenge (deterministic, server-picked)
-- -----------------------------
create table if not exists public.daily_sets (
  date date primary key,
  photo_ids uuid[] not null,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_scores (
  date date not null references public.daily_sets(date) on delete cascade,
  player uuid not null references public.profiles(id) on delete cascade,
  score int not null,
  created_at timestamptz not null default now(),
  primary key (date, player)
);
create index if not exists daily_scores_rank on public.daily_scores(date, score desc);

-- -----------------------------
-- Seasons + ranked
-- -----------------------------
create table if not exists public.seasons (
  id serial primary key,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null
);

create table if not exists public.season_scores (
  season_id int not null references public.seasons(id) on delete cascade,
  player uuid not null references public.profiles(id) on delete cascade,
  rating int not null default 1000,
  wins int not null default 0,
  losses int not null default 0,
  primary key (season_id, player)
);

-- -----------------------------
-- Duel rooms (ephemeral, realtime)
-- -----------------------------
create table if not exists public.duel_rooms (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  host uuid not null references public.profiles(id) on delete cascade,
  challenger uuid references public.profiles(id) on delete set null,
  photo_ids uuid[] not null,
  state text not null default 'waiting' check (state in ('waiting','playing','finished')),
  host_score int not null default 0,
  challenger_score int not null default 0,
  current_round smallint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists duel_rooms_code_idx on public.duel_rooms(code);

-- -----------------------------
-- Reports / moderation queue
-- -----------------------------
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter uuid not null references public.profiles(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  handled boolean not null default false
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.photos enable row level security;
alter table public.lanes enable row level security;
alter table public.lane_photos enable row level security;
alter table public.lobbies enable row level security;
alter table public.sessions enable row level security;
alter table public.guesses enable row level security;
alter table public.daily_scores enable row level security;
alter table public.season_scores enable row level security;
alter table public.duel_rooms enable row level security;
alter table public.reports enable row level security;

-- Profiles: self-read+write, public-read of display_name only via view
drop policy if exists "profiles self read" on public.profiles;
drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "profiles self write" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self read" on public.profiles for select using (auth.uid() = id);
create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles self write" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

-- Photos: owners see their own; everyone sees public+ok.
drop policy if exists "photos owner all" on public.photos;
drop policy if exists "photos public read" on public.photos;
create policy "photos owner all" on public.photos for all using (auth.uid() = owner);
create policy "photos public read"
  on public.photos for select
  using (visibility = 'public' and moderation_status = 'ok');

-- Lanes: same model
drop policy if exists "lanes owner all" on public.lanes;
drop policy if exists "lanes public read" on public.lanes;
create policy "lanes owner all" on public.lanes for all using (auth.uid() = owner);
create policy "lanes public read" on public.lanes for select using (visibility = 'public');

-- Lane-photo membership follows the lane
drop policy if exists "lane_photos owner" on public.lane_photos;
drop policy if exists "lane_photos public" on public.lane_photos;
create policy "lane_photos owner" on public.lane_photos for all
  using (exists (select 1 from public.lanes l where l.id = lane_id and l.owner = auth.uid()));
create policy "lane_photos public" on public.lane_photos for select
  using (exists (select 1 from public.lanes l where l.id = lane_id and l.visibility = 'public'));

-- Lobbies: anyone can SELECT by code (so guests can join), only owner writes
drop policy if exists "lobbies anyone read" on public.lobbies;
drop policy if exists "lobbies owner write" on public.lobbies;
create policy "lobbies anyone read" on public.lobbies for select using (true);
create policy "lobbies owner write" on public.lobbies for all using (auth.uid() = owner);

-- Sessions / guesses: only the player
drop policy if exists "sessions player" on public.sessions;
drop policy if exists "guesses player" on public.guesses;
create policy "sessions player" on public.sessions for all using (auth.uid() = player);
create policy "guesses player" on public.guesses for all
  using (exists (select 1 from public.sessions s where s.id = session_id and s.player = auth.uid()));

-- Daily scores: read-all, write-own
drop policy if exists "daily public read" on public.daily_scores;
drop policy if exists "daily self write" on public.daily_scores;
create policy "daily public read" on public.daily_scores for select using (true);
create policy "daily self write" on public.daily_scores for insert with check (auth.uid() = player);

-- Season scores
drop policy if exists "season public read" on public.season_scores;
create policy "season public read" on public.season_scores for select using (true);

-- Duel rooms: read by code, host/challenger write
drop policy if exists "duel public read" on public.duel_rooms;
drop policy if exists "duel host insert" on public.duel_rooms;
drop policy if exists "duel participants update" on public.duel_rooms;
create policy "duel public read" on public.duel_rooms for select using (true);
create policy "duel host insert" on public.duel_rooms for insert with check (auth.uid() = host);
create policy "duel participants update" on public.duel_rooms for update
  using (auth.uid() in (host, challenger));

-- Reports: any auth user can insert, only service role reads
drop policy if exists "reports insert" on public.reports;
create policy "reports insert" on public.reports for insert with check (auth.uid() = reporter);

-- ============================================================
-- Friendships (Phase 5b)
-- ============================================================
-- Symmetric pair stored once with user_a < user_b. Status drives invite UX.
create table if not exists public.friendships (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists friendships_a_idx on public.friendships(user_a);
create index if not exists friendships_b_idx on public.friendships(user_b);

alter table public.friendships enable row level security;

drop policy if exists "friendships participants read" on public.friendships;
drop policy if exists "friendships invite" on public.friendships;
drop policy if exists "friendships participants update" on public.friendships;
drop policy if exists "friendships participants delete" on public.friendships;

-- Read: only the two participants.
create policy "friendships participants read" on public.friendships for select
  using (auth.uid() in (user_a, user_b));

-- Insert: caller must be one side AND must be requested_by.
create policy "friendships invite" on public.friendships for insert
  with check (
    auth.uid() in (user_a, user_b)
    and auth.uid() = requested_by
  );

-- Update: either participant may accept / block / cancel.
create policy "friendships participants update" on public.friendships for update
  using (auth.uid() in (user_a, user_b));

-- Delete: either participant may remove the friendship.
create policy "friendships participants delete" on public.friendships for delete
  using (auth.uid() in (user_a, user_b));

-- Helper: send a friend request without worrying about user-ordering.
create or replace function public.send_friend_request(target uuid)
returns void language plpgsql security definer as $$
declare
  ua uuid; ub uuid;
begin
  if target = auth.uid() then
    raise exception 'cannot befriend yourself';
  end if;
  if auth.uid() < target then
    ua := auth.uid(); ub := target;
  else
    ua := target;     ub := auth.uid();
  end if;
  insert into public.friendships (user_a, user_b, requested_by, status)
  values (ua, ub, auth.uid(), 'pending')
  on conflict (user_a, user_b) do nothing;
end; $$;

revoke all on function public.send_friend_request(uuid) from public;
grant execute on function public.send_friend_request(uuid) to authenticated;

-- View: expanded friend rows from the perspective of the current user.
create or replace view public.my_friends as
  select
    case when f.user_a = auth.uid() then f.user_b else f.user_a end as friend_id,
    p.display_name,
    p.username,
    p.avatar_url,
    f.status,
    f.requested_by,
    f.created_at,
    f.accepted_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.user_a = auth.uid() then f.user_b else f.user_a end
  where auth.uid() in (f.user_a, f.user_b);

grant select on public.my_friends to authenticated;

-- ============================================================
-- Helpful views
-- ============================================================
create or replace view public.daily_leaderboard as
  select d.date, p.id as player_id, p.display_name, p.avatar_url, ds.score,
         rank() over (partition by d.date order by ds.score desc) as rank
  from public.daily_sets d
  join public.daily_scores ds on ds.date = d.date
  join public.profiles p on p.id = ds.player;

-- ============================================================
-- Trigger: auto-create profile row on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Storage buckets (run separately via Supabase Studio or CLI)
-- ============================================================
-- supabase storage create bucket photos --public=false
-- supabase storage create bucket thumbs --public=true
--
-- After bucket creation, apply these RLS policies via SQL editor:
--
-- Photos bucket (private, requires signed URL or owner auth)
--
--   create policy "photos_owner_read"
--     on storage.objects for select
--     using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
--
--   create policy "photos_owner_write"
--     on storage.objects for insert
--     with check (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
--
--   create policy "photos_owner_delete"
--     on storage.objects for delete
--     using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- Thumbs bucket (public read, owner write)
--
--   create policy "thumbs_public_read"
--     on storage.objects for select
--     using (bucket_id = 'thumbs');
--
--   create policy "thumbs_owner_write"
--     on storage.objects for insert
--     with check (bucket_id = 'thumbs' and auth.uid()::text = (storage.foldername(name))[1]);
--
--   create policy "thumbs_owner_delete"
--     on storage.objects for delete
--     using (bucket_id = 'thumbs' and auth.uid()::text = (storage.foldername(name))[1]);
