-- PDFMint account foundation for Supabase Postgres.
-- Run once in the Supabase SQL editor. Safe public clients are restricted by RLS.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  avatar_url text,
  language text not null default 'English',
  currency text not null default 'GBP - British Pound (£)',
  timezone text not null default 'Europe/London',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  promotions boolean not null default true,
  product_updates boolean not null default true,
  education boolean not null default true,
  login_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  storage_path text not null,
  mime_type text,
  byte_size bigint not null default 0 check (byte_size >= 0),
  source_tool text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists documents_user_updated_idx on public.documents(user_id, updated_at desc);

create table if not exists public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null default 'sign_in',
  created_at timestamptz not null default now()
);
create index if not exists login_events_user_created_idx on public.login_events(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists preferences_set_updated_at on public.user_preferences;
create trigger preferences_set_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();
drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,email,first_name,last_name,avatar_url)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'first_name',''),coalesce(new.raw_user_meta_data->>'last_name',''),new.raw_user_meta_data->>'avatar_url')
  on conflict(id) do nothing;
  insert into public.user_preferences(user_id) values(new.id) on conflict(user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.documents enable row level security;
alter table public.login_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "preferences_manage_own" on public.user_preferences;
create policy "preferences_manage_own" on public.user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "documents_manage_own" on public.documents;
create policy "documents_manage_own" on public.documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "login_events_read_own" on public.login_events;
create policy "login_events_read_own" on public.login_events for select using (auth.uid() = user_id);
drop policy if exists "login_events_insert_own" on public.login_events;
create policy "login_events_insert_own" on public.login_events for insert with check (auth.uid() = user_id);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('user-documents','user-documents',false,104857600,null)
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=null;

drop policy if exists "document_objects_read_own" on storage.objects;
create policy "document_objects_read_own" on storage.objects for select using (bucket_id='user-documents' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "document_objects_insert_own" on storage.objects;
create policy "document_objects_insert_own" on storage.objects for insert with check (bucket_id='user-documents' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "document_objects_update_own" on storage.objects;
create policy "document_objects_update_own" on storage.objects for update using (bucket_id='user-documents' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "document_objects_delete_own" on storage.objects;
create policy "document_objects_delete_own" on storage.objects for delete using (bucket_id='user-documents' and (storage.foldername(name))[1]=auth.uid()::text);
