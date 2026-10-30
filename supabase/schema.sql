 -- Relocates schema. Run once in the Supabase SQL editor.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  store_url text,
  store jsonb,
  brand jsonb,
  profile jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  goal text,
  city text,
  timing text,
  budget text,
  status text not null default 'draft',
  scout jsonb,
  chosen_spot text,
  kit jsonb not null default '{}'::jsonb,
  trace jsonb not null default '[]'::jsonb,
  share_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outreach (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  partner jsonb not null,
  role text not null,
  subject text,
  body text,
  status text not null default 'to_contact'
    check (status in ('to_contact', 'sent', 'replied', 'booked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plans_workspace_idx on public.plans (workspace_id);
create index if not exists outreach_plan_idx on public.outreach (plan_id);

alter table public.workspaces enable row level security;
alter table public.plans enable row level security;
alter table public.outreach enable row level security;

drop policy if exists "own workspaces" on public.workspaces;
create policy "own workspaces" on public.workspaces for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "own plans" on public.plans;
create policy "own plans" on public.plans for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "own outreach" on public.outreach;
create policy "own outreach" on public.outreach for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Launch-kit media (posters, tracks). Public read by unguessable path; users write only to their own folder.
insert into storage.buckets (id, name, public)
values ('kit', 'kit', true)
on conflict (id) do nothing;

drop policy if exists "kit insert own folder" on storage.objects;
create policy "kit insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'kit' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kit update own folder" on storage.objects;
create policy "kit update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'kit' and (storage.foldername(name))[1] = auth.uid()::text);
