-- ============================================================
--  PinPoint — complete drop-in schema
-- ============================================================
--  How to install:
--    1. Open Supabase Studio → SQL Editor → New query
--    2. Paste this entire file
--    3. Run.
--
--  This file is idempotent: running it on an empty project sets
--  up everything; running it again on an existing project is a
--  safe no-op (uses `if not exists`, `drop policy if exists`,
--  `create or replace`). You can re-paste after every change.
--
--  What it provisions:
--    • Extensions  (postgis, uuid-ossp)
--    • Tables      (profiles, photos, lanes, lobbies, sessions,
--                   guesses, daily_sets, daily_scores, seasons,
--                   season_scores, duel_rooms, albums,
--                   album_photos, album_members, friendships,
--                   reports)
--    • Indexes, check constraints, validation triggers
--    • Functions   (handle_new_user, handle_new_album,
--                   send_friend_request, cleanup_stale_rooms,
--                   validate_photo_hints)
--    • Triggers    (on_auth_user_created, albums_add_owner,
--                   photos_validate_hints)
--    • Views       (my_friends, daily_leaderboard)
--    • RLS policies for every table
--    • Storage buckets `photos` (private) and `thumbs` (public)
--      with owner-scoped policies
-- ============================================================


-- ─────────────────────────────────────────────
-- 0. Extensions
-- ─────────────────────────────────────────────
create extension if not exists "postgis";
create extension if not exists "uuid-ossp";


-- ─────────────────────────────────────────────
-- 1. Profiles  (1:1 with auth.users)
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default 'Spieler',
  username      text unique,
  avatar_url    text,
  bio           text,
  created_at    timestamptz not null default now()
);

-- Backfills for older installs.
alter table public.profiles add column if not exists username   text;
alter table public.profiles add column if not exists bio        text;
alter table public.profiles add column if not exists avatar_url text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_key' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_username_key unique (username);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_len') then
    alter table public.profiles add constraint profiles_display_name_len
      check (char_length(display_name) between 1 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_len') then
    alter table public.profiles add constraint profiles_username_len
      check (username is null or (char_length(username) between 3 and 30 and username ~ '^[a-z0-9_]+$'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_bio_len') then
    alter table public.profiles add constraint profiles_bio_len
      check (bio is null or char_length(bio) <= 280);
  end if;
end $$;

create index if not exists profiles_username_idx     on public.profiles(username);
create index if not exists profiles_display_name_idx on public.profiles(lower(display_name));


-- ─────────────────────────────────────────────
-- 2. Photos
-- ─────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'photo_visibility') then
    create type photo_visibility as enum ('private', 'friends', 'public');
  end if;
end $$;

create table if not exists public.photos (
  id                 uuid primary key default uuid_generate_v4(),
  owner              uuid not null references public.profiles(id) on delete cascade,
  storage_path       text not null,                            -- bucket: photos/{owner}/{id}.jpg
  thumb_path         text not null,                            -- bucket: thumbs/{owner}/{id}.jpg
  lat                double precision not null,
  lng                double precision not null,
  geom               geography(point,4326) generated always as (st_makepoint(lng, lat)::geography) stored,
  taken_at           timestamptz,
  caption            text,
  difficulty         smallint not null check (difficulty between 1 and 5),
  auto_difficulty    smallint check (auto_difficulty between 1 and 5),
  visibility         photo_visibility not null default 'private',
  moderation_status  text not null default 'ok' check (moderation_status in ('ok','flagged','removed')),
  hints              text[] not null default '{}',
  story              text,
  created_at         timestamptz not null default now()
);

-- Backfills.
alter table public.photos add column if not exists hints text[] not null default '{}';
alter table public.photos add column if not exists story text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'photos_caption_len') then
    alter table public.photos add constraint photos_caption_len
      check (caption is null or char_length(caption) <= 280);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'photos_story_len') then
    alter table public.photos add constraint photos_story_len
      check (story is null or char_length(story) <= 2000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'photos_hints_count') then
    alter table public.photos add constraint photos_hints_count
      check (cardinality(hints) <= 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'photos_lat_range') then
    alter table public.photos add constraint photos_lat_range check (lat between  -90 and  90);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'photos_lng_range') then
    alter table public.photos add constraint photos_lng_range check (lng between -180 and 180);
  end if;
end $$;

create index if not exists photos_owner_idx      on public.photos(owner);
create index if not exists photos_visibility_idx on public.photos(visibility);
create index if not exists photos_geom_idx       on public.photos using gist (geom);

-- Per-element hint length guard.
create or replace function public.validate_photo_hints()
returns trigger language plpgsql as $$
declare h text;
begin
  if new.hints is null then return new; end if;
  foreach h in array new.hints loop
    if char_length(h) > 200 then
      raise exception 'hint too long (max 200 chars)';
    end if;
  end loop;
  return new;
end; $$;

drop trigger if exists photos_validate_hints on public.photos;
create trigger photos_validate_hints
  before insert or update on public.photos
  for each row execute function public.validate_photo_hints();


-- ─────────────────────────────────────────────
-- 3. Lanes  (legacy — kept for compatibility)
-- ─────────────────────────────────────────────
create table if not exists public.lanes (
  id          uuid primary key default uuid_generate_v4(),
  owner       uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  cover_photo uuid references public.photos(id) on delete set null,
  visibility  photo_visibility not null default 'private',
  created_at  timestamptz not null default now()
);

create table if not exists public.lane_photos (
  lane_id  uuid not null references public.lanes(id)   on delete cascade,
  photo_id uuid not null references public.photos(id)  on delete cascade,
  position int  not null,
  primary key (lane_id, photo_id)
);
create index if not exists lane_photos_lane_pos on public.lane_photos(lane_id, position);


-- ─────────────────────────────────────────────
-- 4. Albums  (current playable collection)
-- ─────────────────────────────────────────────
create table if not exists public.albums (
  id           uuid primary key default uuid_generate_v4(),
  owner        uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  cover_photo  uuid references public.photos(id) on delete set null,
  invite_code  text unique not null,
  created_at   timestamptz not null default now()
);
create index if not exists albums_owner_idx       on public.albums(owner);
create index if not exists albums_invite_code_idx on public.albums(invite_code);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'albums_title_len') then
    alter table public.albums add constraint albums_title_len
      check (char_length(title) between 1 and 80);
  end if;
end $$;

create table if not exists public.album_photos (
  album_id uuid not null references public.albums(id)   on delete cascade,
  photo_id uuid not null references public.photos(id)   on delete cascade,
  added_by uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  position int not null default 0,
  primary key (album_id, photo_id)
);
create index if not exists album_photos_album_idx on public.album_photos(album_id, position);

create table if not exists public.album_members (
  album_id  uuid not null references public.albums(id)   on delete cascade,
  member    uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'player' check (role in ('owner','editor','player')),
  joined_at timestamptz not null default now(),
  primary key (album_id, member)
);
create index if not exists album_members_member_idx on public.album_members(member);

-- Auto-add the owner as a member with role 'owner'.
create or replace function public.handle_new_album()
returns trigger language plpgsql security definer as $$
begin
  insert into public.album_members (album_id, member, role)
  values (new.id, new.owner, 'owner')
  on conflict (album_id, member) do update set role = 'owner';
  return new;
end; $$;

drop trigger if exists albums_add_owner on public.albums;
create trigger albums_add_owner
  after insert on public.albums
  for each row execute procedure public.handle_new_album();


-- ─────────────────────────────────────────────
-- 5. Lobbies, sessions, guesses
-- ─────────────────────────────────────────────
create table if not exists public.lobbies (
  id         uuid primary key default uuid_generate_v4(),
  owner      uuid not null references public.profiles(id) on delete cascade,
  code       text unique not null,
  title      text not null default 'Lobby',
  photo_ids  uuid[] not null default '{}',
  lane_ids   uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists lobbies_code_idx on public.lobbies(code);

create table if not exists public.sessions (
  id           uuid primary key default uuid_generate_v4(),
  player       uuid not null references public.profiles(id) on delete cascade,
  mode         text not null,
  lobby_id     uuid references public.lobbies(id) on delete set null,
  total_score  int  not null default 0,
  photo_count  int  not null default 0,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index if not exists sessions_player_idx on public.sessions(player, started_at desc);

create table if not exists public.guesses (
  id           uuid primary key default uuid_generate_v4(),
  session_id   uuid not null references public.sessions(id) on delete cascade,
  photo_id     uuid not null references public.photos(id)   on delete cascade,
  guess_lat    double precision not null,
  guess_lng    double precision not null,
  distance_km  double precision not null,
  score        int not null,
  hints_used   smallint not null default 0,
  time_ms      int not null default 0,
  validated    boolean not null default false,
  created_at   timestamptz not null default now()
);


-- ─────────────────────────────────────────────
-- 6. Daily challenge & seasons
-- ─────────────────────────────────────────────
create table if not exists public.daily_sets (
  date       date primary key,
  photo_ids  uuid[] not null,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_scores (
  date       date not null references public.daily_sets(date) on delete cascade,
  player     uuid not null references public.profiles(id)     on delete cascade,
  score      int  not null,
  created_at timestamptz not null default now(),
  primary key (date, player)
);
create index if not exists daily_scores_rank on public.daily_scores(date, score desc);

create table if not exists public.seasons (
  id         serial primary key,
  name       text not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null
);

create table if not exists public.season_scores (
  season_id int  not null references public.seasons(id)     on delete cascade,
  player    uuid not null references public.profiles(id)    on delete cascade,
  rating    int  not null default 1000,
  wins      int  not null default 0,
  losses    int  not null default 0,
  primary key (season_id, player)
);


-- ─────────────────────────────────────────────
-- 7. Duel rooms
-- ─────────────────────────────────────────────
create table if not exists public.duel_rooms (
  id                uuid primary key default uuid_generate_v4(),
  code              text unique not null,
  host              uuid not null references public.profiles(id) on delete cascade,
  challenger        uuid references public.profiles(id) on delete set null,
  photo_ids         uuid[] not null,
  state             text not null default 'waiting' check (state in ('waiting','playing','finished')),
  host_score        int not null default 0,
  challenger_score  int not null default 0,
  current_round     smallint not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists duel_rooms_code_idx on public.duel_rooms(code);


-- ─────────────────────────────────────────────
-- 8. Friendships
-- ─────────────────────────────────────────────
create table if not exists public.friendships (
  user_a       uuid not null references public.profiles(id) on delete cascade,
  user_b       uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists friendships_a_idx on public.friendships(user_a);
create index if not exists friendships_b_idx on public.friendships(user_b);


-- ─────────────────────────────────────────────
-- 9. Reports / moderation queue
-- ─────────────────────────────────────────────
create table if not exists public.reports (
  id         uuid primary key default uuid_generate_v4(),
  reporter   uuid not null references public.profiles(id) on delete cascade,
  photo_id   uuid not null references public.photos(id)   on delete cascade,
  reason     text not null,
  created_at timestamptz not null default now(),
  handled    boolean not null default false
);


-- ============================================================
-- Row Level Security  (enable + policies)
-- ============================================================
alter table public.profiles       enable row level security;
alter table public.photos         enable row level security;
alter table public.lanes          enable row level security;
alter table public.lane_photos    enable row level security;
alter table public.lobbies        enable row level security;
alter table public.sessions       enable row level security;
alter table public.guesses        enable row level security;
alter table public.daily_scores   enable row level security;
alter table public.season_scores  enable row level security;
alter table public.duel_rooms     enable row level security;
alter table public.albums         enable row level security;
alter table public.album_photos   enable row level security;
alter table public.album_members  enable row level security;
alter table public.friendships    enable row level security;
alter table public.reports        enable row level security;


-- ─────────────────────────────────────────────
-- RLS helpers (declared before any policy uses them)
-- ─────────────────────────────────────────────
-- These SECURITY DEFINER helpers bypass RLS internally so policies
-- on `album_members` can ask "is this user a member?" without
-- recursing back into themselves (Postgres infinite-recursion error).
create or replace function public.is_album_member(_album_id uuid, _user_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.album_members
    where album_id = _album_id and member = _user_id
  );
$$;

create or replace function public.is_album_editor(_album_id uuid, _user_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.album_members
    where album_id = _album_id
      and member   = _user_id
      and role in ('owner','editor')
  );
$$;

create or replace function public.is_album_owner(_album_id uuid, _user_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.albums
    where id = _album_id and owner = _user_id
  );
$$;

revoke all on function public.is_album_member(uuid, uuid) from public;
revoke all on function public.is_album_editor(uuid, uuid) from public;
revoke all on function public.is_album_owner(uuid, uuid)  from public;
grant execute on function public.is_album_member(uuid, uuid) to authenticated;
grant execute on function public.is_album_editor(uuid, uuid) to authenticated;
grant execute on function public.is_album_owner(uuid, uuid)  to authenticated;


-- profiles ----------------------------------------------------
drop policy if exists "profiles self read"   on public.profiles;
drop policy if exists "profiles public read" on public.profiles;
drop policy if exists "profiles self write"  on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles public read" on public.profiles for select using (true);
create policy "profiles self write"  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);


-- photos ------------------------------------------------------
drop policy if exists "photos owner all"          on public.photos;
drop policy if exists "photos owner select"       on public.photos;
drop policy if exists "photos owner insert"       on public.photos;
drop policy if exists "photos owner update"       on public.photos;
drop policy if exists "photos owner delete"       on public.photos;
drop policy if exists "photos public read"        on public.photos;
drop policy if exists "photos album member read"  on public.photos;
-- Explicit per-action policies (safer than `for all` for upsert flows).
create policy "photos owner select" on public.photos for select using (auth.uid() = owner);
create policy "photos owner insert" on public.photos for insert with check (auth.uid() = owner);
create policy "photos owner update" on public.photos for update using (auth.uid() = owner) with check (auth.uid() = owner);
create policy "photos owner delete" on public.photos for delete using (auth.uid() = owner);
create policy "photos public read"  on public.photos for select
  using (visibility = 'public' and moderation_status = 'ok');
create policy "photos album member read" on public.photos for select using (
  exists (
    select 1 from public.album_photos ap
    where ap.photo_id = photos.id
      and public.is_album_member(ap.album_id, auth.uid())
  )
);


-- lanes -------------------------------------------------------
drop policy if exists "lanes owner all"   on public.lanes;
drop policy if exists "lanes public read" on public.lanes;
drop policy if exists "lane_photos owner"  on public.lane_photos;
drop policy if exists "lane_photos public" on public.lane_photos;
create policy "lanes owner all"   on public.lanes for all using (auth.uid() = owner);
create policy "lanes public read" on public.lanes for select using (visibility = 'public');
create policy "lane_photos owner" on public.lane_photos for all
  using (exists (select 1 from public.lanes l where l.id = lane_id and l.owner = auth.uid()));
create policy "lane_photos public" on public.lane_photos for select
  using (exists (select 1 from public.lanes l where l.id = lane_id and l.visibility = 'public'));


-- albums ------------------------------------------------------
drop policy if exists "albums member read"   on public.albums;
drop policy if exists "albums owner write"   on public.albums;
drop policy if exists "albums owner update"  on public.albums;
drop policy if exists "albums owner delete"  on public.albums;
create policy "albums member read" on public.albums for select using (
  auth.uid() = owner
  or public.is_album_member(albums.id, auth.uid())
);
create policy "albums owner write"  on public.albums for insert with check (auth.uid() = owner);
create policy "albums owner update" on public.albums for update using (auth.uid() = owner);
create policy "albums owner delete" on public.albums for delete using (auth.uid() = owner);

drop policy if exists "album_photos member read"    on public.album_photos;
drop policy if exists "album_photos editor write"   on public.album_photos;
drop policy if exists "album_photos editor delete"  on public.album_photos;
create policy "album_photos member read"   on public.album_photos for select
  using (public.is_album_member(album_id, auth.uid()));
create policy "album_photos editor write"  on public.album_photos for insert
  with check (public.is_album_editor(album_id, auth.uid()));
create policy "album_photos editor delete" on public.album_photos for delete
  using (public.is_album_editor(album_id, auth.uid()));

drop policy if exists "album_members member read"    on public.album_members;
drop policy if exists "album_members self join"      on public.album_members;
drop policy if exists "album_members owner invite"   on public.album_members;
drop policy if exists "album_members owner manage"   on public.album_members;
drop policy if exists "album_members self leave"     on public.album_members;
-- A member sees: their own row + every row of any album they're in.
-- The helper bypasses RLS so this no longer self-references.
create policy "album_members member read" on public.album_members for select using (
  member = auth.uid()
  or public.is_album_member(album_id, auth.uid())
);
create policy "album_members self join" on public.album_members for insert with check (
  member = auth.uid() and role = 'player'
);
-- Owners may insert other members with any role (player/editor).
create policy "album_members owner invite" on public.album_members for insert with check (
  public.is_album_owner(album_id, auth.uid())
  and role in ('player','editor')
);
create policy "album_members owner manage" on public.album_members for update using (
  public.is_album_owner(album_id, auth.uid())
);
create policy "album_members self leave" on public.album_members for delete using (
  member = auth.uid()
  or public.is_album_owner(album_id, auth.uid())
);


-- lobbies / sessions / guesses --------------------------------
drop policy if exists "lobbies anyone read" on public.lobbies;
drop policy if exists "lobbies owner write" on public.lobbies;
drop policy if exists "sessions player"     on public.sessions;
drop policy if exists "guesses player"      on public.guesses;
create policy "lobbies anyone read" on public.lobbies for select using (true);
create policy "lobbies owner write" on public.lobbies for all using (auth.uid() = owner);
create policy "sessions player"     on public.sessions for all using (auth.uid() = player);
create policy "guesses player"      on public.guesses  for all
  using (exists (select 1 from public.sessions s where s.id = session_id and s.player = auth.uid()));


-- daily / season ----------------------------------------------
drop policy if exists "daily public read"   on public.daily_scores;
drop policy if exists "daily self write"    on public.daily_scores;
drop policy if exists "season public read"  on public.season_scores;
create policy "daily public read"  on public.daily_scores  for select using (true);
create policy "daily self write"   on public.daily_scores  for insert with check (auth.uid() = player);
create policy "season public read" on public.season_scores for select using (true);


-- duel rooms --------------------------------------------------
drop policy if exists "duel public read"          on public.duel_rooms;
drop policy if exists "duel host insert"          on public.duel_rooms;
drop policy if exists "duel participants update"  on public.duel_rooms;
create policy "duel public read"          on public.duel_rooms for select using (true);
create policy "duel host insert"          on public.duel_rooms for insert with check (auth.uid() = host);
create policy "duel participants update"  on public.duel_rooms for update using (auth.uid() in (host, challenger));


-- friendships -------------------------------------------------
drop policy if exists "friendships participants read"   on public.friendships;
drop policy if exists "friendships invite"              on public.friendships;
drop policy if exists "friendships participants update" on public.friendships;
drop policy if exists "friendships participants delete" on public.friendships;
create policy "friendships participants read"   on public.friendships for select using (auth.uid() in (user_a, user_b));
create policy "friendships invite"              on public.friendships for insert
  with check (auth.uid() in (user_a, user_b) and auth.uid() = requested_by);
create policy "friendships participants update" on public.friendships for update using (auth.uid() in (user_a, user_b));
create policy "friendships participants delete" on public.friendships for delete using (auth.uid() in (user_a, user_b));


-- reports -----------------------------------------------------
drop policy if exists "reports insert" on public.reports;
create policy "reports insert" on public.reports for insert with check (auth.uid() = reporter);


-- ============================================================
-- Functions
-- ============================================================

-- Auto-create profile row when an auth.users row is created.
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

-- Backfill: ensure every existing auth.users row has a profile row.
-- Without this, photo / album inserts FK-violate for users who
-- signed up before the trigger existed.
insert into public.profiles (id, display_name)
  select u.id, coalesce(u.raw_user_meta_data->>'display_name', split_part(u.email, '@', 1), 'Spieler')
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null;


-- Helper RPC to send a friend request without ordering hassles.
create or replace function public.send_friend_request(target uuid)
returns void language plpgsql security definer as $$
declare ua uuid; ub uuid;
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

revoke all   on function public.send_friend_request(uuid) from public;
grant execute on function public.send_friend_request(uuid) to authenticated;


-- Cron-friendly cleanup for stale lobbies / duels.
create or replace function public.cleanup_stale_rooms()
returns void language plpgsql security definer as $$
begin
  delete from public.lobbies
   where expires_at is not null and expires_at < now();
  delete from public.duel_rooms
   where created_at < now() - interval '24 hours'
     and state in ('waiting','playing');
  delete from public.duel_rooms
   where state = 'finished'
     and created_at < now() - interval '7 days';
end; $$;

revoke all on function public.cleanup_stale_rooms() from public;


-- ============================================================
-- Views
-- ============================================================
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

create or replace view public.daily_leaderboard as
  select d.date, p.id as player_id, p.display_name, p.avatar_url, ds.score,
         rank() over (partition by d.date order by ds.score desc) as rank
  from public.daily_sets d
  join public.daily_scores ds on ds.date = d.date
  join public.profiles      p  on p.id   = ds.player;


-- ============================================================
-- Storage buckets + policies
-- ============================================================
-- Buckets: `photos` (private) holds full-res JPEGs; `thumbs`
-- (public-read) holds thumbnails. Object paths are namespaced
-- by user-id: `{auth.uid()}/{photo.id}.jpg`.

insert into storage.buckets (id, name, public)
  values ('photos', 'photos', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('thumbs', 'thumbs', true)
  on conflict (id) do nothing;

-- photos bucket -----------------------------------------------
drop policy if exists "photos_owner_read"   on storage.objects;
drop policy if exists "photos_owner_write"  on storage.objects;
drop policy if exists "photos_owner_update" on storage.objects;
drop policy if exists "photos_owner_delete" on storage.objects;
create policy "photos_owner_read" on storage.objects for select
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "photos_owner_write" on storage.objects for insert
  with check (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "photos_owner_update" on storage.objects for update
  using      (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "photos_owner_delete" on storage.objects for delete
  using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);

-- thumbs bucket -----------------------------------------------
drop policy if exists "thumbs_public_read"  on storage.objects;
drop policy if exists "thumbs_owner_write"  on storage.objects;
drop policy if exists "thumbs_owner_update" on storage.objects;
drop policy if exists "thumbs_owner_delete" on storage.objects;
create policy "thumbs_public_read" on storage.objects for select
  using (bucket_id = 'thumbs');
create policy "thumbs_owner_write" on storage.objects for insert
  with check (bucket_id = 'thumbs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "thumbs_owner_update" on storage.objects for update
  using      (bucket_id = 'thumbs' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'thumbs' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "thumbs_owner_delete" on storage.objects for delete
  using (bucket_id = 'thumbs' and auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================
--  ✓ done — every paste produces the same final state.
-- ============================================================
