-- Stencil core schema (applied to project babzsbnsxhtgjafhvndw)
-- profiles, entries, stencils, memory_notes + RLS + signup trigger

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 20000),
  created_at timestamptz not null default now()
);

create index if not exists entries_user_id_created_at_idx
  on public.entries (user_id, created_at desc);

create table if not exists public.stencils (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  entry_id uuid references public.entries (id) on delete set null,
  template_type text not null check (template_type in (
    'quadrant', 'triangle', 'identity_shift', 'forgiveness', 'cognitive_distortions'
  )),
  title text not null,
  source_citation text,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  worksheet jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stencils_user_id_created_at_idx
  on public.stencils (user_id, created_at desc);

create table if not exists public.memory_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'pattern', 'role', 'value', 'distortion', 'quadrant', 'note'
  )),
  label text not null,
  detail text,
  source_stencil_id uuid references public.stencils (id) on delete set null,
  weight real not null default 1.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_notes_user_id_kind_idx
  on public.memory_notes (user_id, kind);

alter table public.profiles enable row level security;
alter table public.entries enable row level security;
alter table public.stencils enable row level security;
alter table public.memory_notes enable row level security;

-- policies omitted here for brevity; see applied migration in Supabase dashboard
