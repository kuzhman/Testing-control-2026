-- Выполнить в SQL Editor Supabase. Доступ к данным только через Edge Function.
create table if not exists public.tc_companies(id text primary key, data jsonb not null);
create table if not exists public.tc_entries(id uuid primary key, data jsonb not null);
create table if not exists public.tc_photos(id uuid primary key, data jsonb not null);
alter table public.tc_companies enable row level security;
alter table public.tc_entries enable row level security;
alter table public.tc_photos enable row level security;
-- Не создавайте публичных RLS policies: доступ только через серверный service_role.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('tc-photos','tc-photos',false,10485760,array['image/jpeg']) on conflict(id) do nothing;
