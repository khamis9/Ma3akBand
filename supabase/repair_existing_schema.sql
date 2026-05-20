-- Ma3akBand repair script for an existing Supabase project.
-- Use this when the old profiles-based schema was already run before the app
-- switched to the users-based schema.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  created_at timestamp default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text,
  band_name text default 'Ma3akBand',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists email text;
alter table public.users add column if not exists username text;
alter table public.users add column if not exists band_name text default 'Ma3akBand';
alter table public.users add column if not exists created_at timestamptz not null default now();
alter table public.users add column if not exists updated_at timestamptz not null default now();

insert into public.users (id, email, username, created_at, updated_at)
select
  au.id,
  coalesce(au.email, ''),
  coalesce(p.username, au.raw_user_meta_data ->> 'username', split_part(coalesce(au.email, ''), '@', 1)),
  coalesce(p.created_at::timestamptz, now()),
  now()
from auth.users au
left join public.profiles p on p.id = au.id
on conflict (id) do update set
  email = excluded.email,
  username = coalesce(public.users.username, excluded.username),
  updated_at = now();

insert into public.profiles (id, username, created_at)
select id, username, created_at::timestamp
from public.users
on conflict (id) do update set
  username = excluded.username;

create table if not exists public.pairs (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  user1_id uuid,
  user2_id uuid,
  created_at timestamptz not null default now(),
  paired_at timestamptz
);

alter table public.pairs add column if not exists paired_at timestamptz;
alter table public.pairs alter column created_at type timestamptz using created_at::timestamptz;

create table if not exists public.sensor_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  pair_id uuid,
  bpm integer default 0,
  gsr integer default 0,
  ax double precision default 0,
  ay double precision default 0,
  az double precision default 0,
  anomaly boolean default false,
  recorded_at timestamptz not null default now()
);

alter table public.sensor_data alter column ax type double precision using ax::double precision;
alter table public.sensor_data alter column ay type double precision using ay::double precision;
alter table public.sensor_data alter column az type double precision using az::double precision;
alter table public.sensor_data alter column recorded_at type timestamptz using recorded_at::timestamptz;
alter table public.sensor_data alter column bpm set default 0;
alter table public.sensor_data alter column gsr set default 0;
alter table public.sensor_data alter column ax set default 0;
alter table public.sensor_data alter column ay set default 0;
alter table public.sensor_data alter column az set default 0;
alter table public.sensor_data alter column anomaly set default false;

create table if not exists public.anomaly_alerts (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null,
  user_id uuid not null,
  type text not null check (type in ('high_hr', 'low_gsr', 'no_motion')),
  severity text not null check (severity in ('low', 'medium', 'high')),
  message text,
  timestamp timestamptz not null default now()
);

do $$
declare
  fk record;
begin
  for fk in
    select distinct c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join unnest(c.conkey) cols(attnum) on true
    join pg_attribute a on a.attrelid = t.oid and a.attnum = cols.attnum
    where n.nspname = 'public'
      and t.relname = 'pairs'
      and c.contype = 'f'
      and a.attname in ('user1_id', 'user2_id')
  loop
    execute format('alter table public.pairs drop constraint %I', fk.conname);
  end loop;
end $$;

alter table public.pairs
  add constraint pairs_user1_id_users_fkey
  foreign key (user1_id) references public.users(id) on delete cascade;

alter table public.pairs
  add constraint pairs_user2_id_users_fkey
  foreign key (user2_id) references public.users(id) on delete set null;

do $$
declare
  fk record;
begin
  for fk in
    select distinct c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join unnest(c.conkey) cols(attnum) on true
    join pg_attribute a on a.attrelid = t.oid and a.attnum = cols.attnum
    where n.nspname = 'public'
      and t.relname = 'sensor_data'
      and c.contype = 'f'
      and a.attname in ('user_id', 'pair_id')
  loop
    execute format('alter table public.sensor_data drop constraint %I', fk.conname);
  end loop;
end $$;

alter table public.sensor_data
  add constraint sensor_data_user_id_users_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.sensor_data
  add constraint sensor_data_pair_id_pairs_fkey
  foreign key (pair_id) references public.pairs(id) on delete cascade;

do $$
declare
  fk record;
begin
  for fk in
    select distinct c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    join unnest(c.conkey) cols(attnum) on true
    join pg_attribute a on a.attrelid = t.oid and a.attnum = cols.attnum
    where n.nspname = 'public'
      and t.relname = 'anomaly_alerts'
      and c.contype = 'f'
      and a.attname in ('user_id', 'pair_id')
  loop
    execute format('alter table public.anomaly_alerts drop constraint %I', fk.conname);
  end loop;
end $$;

alter table public.anomaly_alerts
  add constraint anomaly_alerts_user_id_users_fkey
  foreign key (user_id) references public.users(id) on delete cascade;

alter table public.anomaly_alerts
  add constraint anomaly_alerts_pair_id_pairs_fkey
  foreign key (pair_id) references public.pairs(id) on delete cascade;

create unique index if not exists pairs_invite_code_unique_idx on public.pairs(invite_code);
create index if not exists pairs_user1_id_idx on public.pairs(user1_id);
create index if not exists pairs_user2_id_idx on public.pairs(user2_id);
create index if not exists pairs_invite_code_idx on public.pairs(invite_code);
create index if not exists sensor_data_pair_recorded_idx on public.sensor_data(pair_id, recorded_at desc);
create index if not exists anomaly_alerts_pair_timestamp_idx on public.anomaly_alerts(pair_id, timestamp desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, username)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update set
    username = excluded.username;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_pair_member(target_pair_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pairs p
    where p.id = target_pair_id
      and (p.user1_id = target_user_id or p.user2_id = target_user_id)
  );
$$;

create or replace function public.join_pair_by_code(code text)
returns public.pairs
language plpgsql
security definer
set search_path = public
as $$
declare
  target_pair public.pairs;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to join a pair.';
  end if;

  select *
  into target_pair
  from public.pairs
  where invite_code = upper(trim(code))
  for update;

  if not found then
    raise exception 'Invite code not found.';
  end if;

  if target_pair.user1_id = auth.uid() then
    raise exception 'You cannot join your own invite code.';
  end if;

  if target_pair.user2_id is not null and target_pair.user2_id <> auth.uid() then
    raise exception 'Invite code is already paired.';
  end if;

  update public.pairs
  set user2_id = auth.uid(),
      paired_at = coalesce(paired_at, now())
  where id = target_pair.id
  returning * into target_pair;

  return target_pair;
end;
$$;

grant execute on function public.join_pair_by_code(text) to authenticated;
grant execute on function public.is_pair_member(uuid, uuid) to authenticated;

alter table public.users enable row level security;
alter table public.pairs enable row level security;
alter table public.sensor_data enable row level security;
alter table public.anomaly_alerts enable row level security;

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
on public.users for insert
with check (auth.uid() = id);

drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
on public.users for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can create own pair invite" on public.pairs;
create policy "Users can create own pair invite"
on public.pairs for insert
with check (auth.uid() = user1_id and user2_id is null);

drop policy if exists "Users can view their pairs" on public.pairs;
create policy "Users can view their pairs"
on public.pairs for select
using (auth.uid() = user1_id or auth.uid() = user2_id);

drop policy if exists "Pair members can read sensor data" on public.sensor_data;
create policy "Pair members can read sensor data"
on public.sensor_data for select
using (public.is_pair_member(pair_id, auth.uid()));

drop policy if exists "Users can insert own sensor data" on public.sensor_data;
create policy "Users can insert own sensor data"
on public.sensor_data for insert
with check (auth.uid() = user_id and public.is_pair_member(pair_id, auth.uid()));

drop policy if exists "Pair members can read alerts" on public.anomaly_alerts;
create policy "Pair members can read alerts"
on public.anomaly_alerts for select
using (public.is_pair_member(pair_id, auth.uid()));

drop policy if exists "Users can insert own alerts" on public.anomaly_alerts;
create policy "Users can insert own alerts"
on public.anomaly_alerts for insert
with check (auth.uid() = user_id and public.is_pair_member(pair_id, auth.uid()));

alter table public.sensor_data replica identity full;
alter table public.anomaly_alerts replica identity full;
alter table public.pairs replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.sensor_data;
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.anomaly_alerts;
exception when duplicate_object then
  null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.pairs;
exception when duplicate_object then
  null;
end $$;
