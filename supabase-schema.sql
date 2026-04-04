create table if not exists public.traffic_users (
  id bigserial primary key,
  username text not null unique,
  password text not null,
  role text not null default 'client',
  client_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.traffic_performance (
  id bigserial primary key,
  client_id text not null,
  date date not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  spend numeric(12,2) not null default 0,
  conversions integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_traffic_performance_client_date on public.traffic_performance(client_id, date desc);

create table if not exists public.traffic_client_visibility (
  client_id text primary key,
  show_spend boolean not null default true,
  show_conversions boolean not null default true,
  show_cpa boolean not null default true,
  show_ctr boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.traffic_access_log (
  id bigserial primary key,
  user_id bigint,
  username text,
  role text,
  ip_address text,
  user_agent text,
  accessed_at timestamptz not null default now()
);

create or replace function public.touch_traffic_visibility_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_traffic_visibility_updated_at on public.traffic_client_visibility;
create trigger trg_touch_traffic_visibility_updated_at
before update on public.traffic_client_visibility
for each row execute function public.touch_traffic_visibility_updated_at();

insert into public.traffic_users (username, password, role, client_id)
values ('admin', '$2b$12$J2ca0IgmNkjdHq4Uth8kTOMU2Yix7sK6A0DP5nqM2tO7Q4E4S1v1C', 'admin', null)
on conflict (username) do nothing;
