-- Vibe Board Database Schema
-- Run this in Supabase SQL Editor (SQL Editor -> New Query)

-- Boards table
create table public.boards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null
);

-- Tasks table
create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  board_id uuid references public.boards(id) on delete cascade not null,
  title text not null,
  description text,
  status text not null default 'backlog',
  priority text not null default 'medium',
  labels text[] default '{}',
  subtasks jsonb default '[]',
  due_date timestamptz,
  "order" integer not null default 0,
  created_at timestamptz default now() not null,
  archived_at timestamptz
);

-- Quick todos (sidebar)
create table public.todos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  completed boolean default false not null,
  created_at timestamptz default now() not null
);

-- Notes (sidebar)
create table public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text default '' not null,
  updated_at timestamptz default now() not null
);

-- User settings
create table public.user_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  active_board_id uuid references public.boards(id) on delete set null,
  theme text default 'dark' not null,
  compact_mode boolean default false not null,
  column_colors jsonb default '{}' not null
);

-- Enable Row Level Security
alter table public.boards enable row level security;
alter table public.tasks enable row level security;
alter table public.todos enable row level security;
alter table public.notes enable row level security;
alter table public.user_settings enable row level security;

-- RLS Policies for boards
create policy "Users can view own boards"
  on public.boards for select
  using (auth.uid() = user_id);

create policy "Users can create own boards"
  on public.boards for insert
  with check (auth.uid() = user_id);

create policy "Users can update own boards"
  on public.boards for update
  using (auth.uid() = user_id);

create policy "Users can delete own boards"
  on public.boards for delete
  using (auth.uid() = user_id);

-- RLS Policies for tasks
create policy "Users can view own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can create own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- RLS Policies for todos
create policy "Users can view own todos"
  on public.todos for select
  using (auth.uid() = user_id);

create policy "Users can create own todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

create policy "Users can update own todos"
  on public.todos for update
  using (auth.uid() = user_id);

create policy "Users can delete own todos"
  on public.todos for delete
  using (auth.uid() = user_id);

-- RLS Policies for notes
create policy "Users can view own notes"
  on public.notes for select
  using (auth.uid() = user_id);

create policy "Users can create own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on public.notes for update
  using (auth.uid() = user_id);

create policy "Users can delete own notes"
  on public.notes for delete
  using (auth.uid() = user_id);

-- RLS Policies for user_settings
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can create own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);
