-- ==========================================
-- FlashMind - Supabase Schema
-- ==========================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Folders
create table public.folders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  parent_id uuid references public.folders(id) on delete cascade,
  icon text default '📁',
  color text,
  position int default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.folders enable row level security;
create policy "Users CRUD own folders" on public.folders for all using (auth.uid() = user_id);

-- Documents
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  folder_id uuid references public.folders(id) on delete set null,
  title text not null default 'Sem título',
  content text default '',
  summary text,
  is_favorite boolean default false,
  position int default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.documents enable row level security;
create policy "Users CRUD own documents" on public.documents for all using (auth.uid() = user_id);

-- Decks
create table public.decks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  color text default '#6366f1',
  icon text,
  card_count int default 0,
  due_count int default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.decks enable row level security;
create policy "Users CRUD own decks" on public.decks for all using (auth.uid() = user_id);

-- Flashcards
create table public.flashcards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  document_id uuid references public.documents(id) on delete set null,
  deck_id uuid references public.decks(id) on delete cascade not null,
  front text not null,
  back text not null,
  ease_factor real default 2.5,
  interval int default 0,
  repetitions int default 0,
  next_review timestamptz default now(),
  last_reviewed timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.flashcards enable row level security;
create policy "Users CRUD own flashcards" on public.flashcards for all using (auth.uid() = user_id);

-- Mind Maps
create table public.mindmaps (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  document_id uuid references public.documents(id) on delete set null,
  title text not null,
  data jsonb not null default '{"id":"root","label":"Central","children":[]}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.mindmaps enable row level security;
create policy "Users CRUD own mindmaps" on public.mindmaps for all using (auth.uid() = user_id);

-- Study Sessions
create table public.study_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  deck_id uuid references public.decks(id) on delete set null,
  cards_reviewed int default 0,
  cards_correct int default 0,
  duration_minutes int default 0,
  started_at timestamptz default now() not null,
  ended_at timestamptz
);

alter table public.study_sessions enable row level security;
create policy "Users CRUD own sessions" on public.study_sessions for all using (auth.uid() = user_id);

-- Indexes for performance
create index idx_documents_user on public.documents(user_id);
create index idx_documents_folder on public.documents(folder_id);
create index idx_flashcards_user on public.flashcards(user_id);
create index idx_flashcards_deck on public.flashcards(deck_id);
create index idx_flashcards_next_review on public.flashcards(next_review);
create index idx_folders_user on public.folders(user_id);
create index idx_folders_parent on public.folders(parent_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles for each row execute function update_updated_at();
create trigger update_folders_updated_at before update on public.folders for each row execute function update_updated_at();
create trigger update_documents_updated_at before update on public.documents for each row execute function update_updated_at();
create trigger update_decks_updated_at before update on public.decks for each row execute function update_updated_at();
create trigger update_flashcards_updated_at before update on public.flashcards for each row execute function update_updated_at();
create trigger update_mindmaps_updated_at before update on public.mindmaps for each row execute function update_updated_at();
