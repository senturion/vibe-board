-- Vibe Board Database Schema
-- Run this in Supabase SQL Editor (SQL Editor -> New Query)

-- Boards table
create table public.boards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null,
  stale_days_threshold integer default null -- days before tasks are flagged stale; null = 7
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
  updated_at timestamptz default now() not null,
  completed_at timestamptz,
  archived_at timestamptz,
  snoozed_until timestamptz -- stale detection snooze expiry
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

-- =====================================================
-- LIFE DASHBOARD TABLES
-- =====================================================

-- =====================================================
-- ROUTINES & ROUTINE ITEMS
-- =====================================================

-- Routines (Morning, Evening, Work, etc.)
create table public.routines (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  days_of_week integer[] default '{1,2,3,4,5,6,7}' not null, -- 1=Mon, 7=Sun
  is_active boolean default true not null,
  "order" integer not null default 0,
  created_at timestamptz default now() not null
);

-- Routine items (individual steps in a routine)
create table public.routine_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  routine_id uuid references public.routines(id) on delete cascade not null,
  title text not null,
  target_time interval, -- e.g., '00:10:00' for 10 minutes
  "order" integer not null default 0,
  created_at timestamptz default now() not null
);

-- Daily routine completions (tracks completion per day)
create table public.routine_completions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  routine_id uuid references public.routines(id) on delete cascade not null,
  completion_date date not null default current_date,
  completed_at timestamptz default now() not null,
  unique(user_id, routine_id, completion_date)
);

-- Individual item completions within a routine for a specific day
create table public.routine_item_completions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  routine_item_id uuid references public.routine_items(id) on delete cascade not null,
  completion_date date not null default current_date,
  completed_at timestamptz default now() not null,
  duration interval, -- actual time taken
  unique(user_id, routine_item_id, completion_date)
);

-- Enable RLS for routines tables
alter table public.routines enable row level security;
alter table public.routine_items enable row level security;
alter table public.routine_completions enable row level security;
alter table public.routine_item_completions enable row level security;

-- RLS Policies for routines
create policy "Users can view own routines" on public.routines for select using (auth.uid() = user_id);
create policy "Users can create own routines" on public.routines for insert with check (auth.uid() = user_id);
create policy "Users can update own routines" on public.routines for update using (auth.uid() = user_id);
create policy "Users can delete own routines" on public.routines for delete using (auth.uid() = user_id);

-- RLS Policies for routine_items
create policy "Users can view own routine_items" on public.routine_items for select using (auth.uid() = user_id);
create policy "Users can create own routine_items" on public.routine_items for insert with check (auth.uid() = user_id);
create policy "Users can update own routine_items" on public.routine_items for update using (auth.uid() = user_id);
create policy "Users can delete own routine_items" on public.routine_items for delete using (auth.uid() = user_id);

-- RLS Policies for routine_completions
create policy "Users can view own routine_completions" on public.routine_completions for select using (auth.uid() = user_id);
create policy "Users can create own routine_completions" on public.routine_completions for insert with check (auth.uid() = user_id);
create policy "Users can update own routine_completions" on public.routine_completions for update using (auth.uid() = user_id);
create policy "Users can delete own routine_completions" on public.routine_completions for delete using (auth.uid() = user_id);

-- RLS Policies for routine_item_completions
create policy "Users can view own routine_item_completions" on public.routine_item_completions for select using (auth.uid() = user_id);
create policy "Users can create own routine_item_completions" on public.routine_item_completions for insert with check (auth.uid() = user_id);
create policy "Users can update own routine_item_completions" on public.routine_item_completions for update using (auth.uid() = user_id);
create policy "Users can delete own routine_item_completions" on public.routine_item_completions for delete using (auth.uid() = user_id);

-- =====================================================
-- HABITS & HABIT TRACKING
-- =====================================================

-- Habit categories
create table public.habit_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#e07a5f' not null,
  icon text, -- lucide icon name
  "order" integer not null default 0,
  created_at timestamptz default now() not null
);

-- Habits
create table public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references public.habit_categories(id) on delete set null,
  name text not null,
  description text,
  frequency_type text not null default 'daily', -- 'daily', 'weekly', 'specific_days'
  frequency_value integer default 1, -- for 'weekly': X times per week
  specific_days integer[], -- for 'specific_days': [1,3,5] = Mon,Wed,Fri
  target_count integer default 1 not null, -- how many times per day/occasion
  is_active boolean default true not null,
  color text default '#e07a5f' not null,
  icon text, -- lucide icon name
  habit_type text not null default 'build', -- 'build' or 'avoid'
  tracking_mode text not null default 'manual', -- 'manual' or 'auto-complete'
  "order" integer not null default 0,
  created_at timestamptz default now() not null,
  archived_at timestamptz
);

-- Habit completions (each check-off)
create table public.habit_completions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references public.habits(id) on delete cascade not null,
  completion_date date not null default current_date,
  count integer default 1 not null, -- supports multiple completions per day
  note text, -- optional note
  completed_at timestamptz default now() not null
);

-- Habit streaks (calculated/cached for performance)
create table public.habit_streaks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  habit_id uuid references public.habits(id) on delete cascade not null,
  current_streak integer default 0 not null,
  best_streak integer default 0 not null,
  last_completion_date date,
  updated_at timestamptz default now() not null,
  unique(user_id, habit_id)
);

-- Enable RLS for habits tables
alter table public.habit_categories enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.habit_streaks enable row level security;

-- RLS Policies for habit_categories
create policy "Users can view own habit_categories" on public.habit_categories for select using (auth.uid() = user_id);
create policy "Users can create own habit_categories" on public.habit_categories for insert with check (auth.uid() = user_id);
create policy "Users can update own habit_categories" on public.habit_categories for update using (auth.uid() = user_id);
create policy "Users can delete own habit_categories" on public.habit_categories for delete using (auth.uid() = user_id);

-- RLS Policies for habits
create policy "Users can view own habits" on public.habits for select using (auth.uid() = user_id);
create policy "Users can create own habits" on public.habits for insert with check (auth.uid() = user_id);
create policy "Users can update own habits" on public.habits for update using (auth.uid() = user_id);
create policy "Users can delete own habits" on public.habits for delete using (auth.uid() = user_id);

-- RLS Policies for habit_completions
create policy "Users can view own habit_completions" on public.habit_completions for select using (auth.uid() = user_id);
create policy "Users can create own habit_completions" on public.habit_completions for insert with check (auth.uid() = user_id);
create policy "Users can update own habit_completions" on public.habit_completions for update using (auth.uid() = user_id);
create policy "Users can delete own habit_completions" on public.habit_completions for delete using (auth.uid() = user_id);

-- RLS Policies for habit_streaks
create policy "Users can view own habit_streaks" on public.habit_streaks for select using (auth.uid() = user_id);
create policy "Users can create own habit_streaks" on public.habit_streaks for insert with check (auth.uid() = user_id);
create policy "Users can update own habit_streaks" on public.habit_streaks for update using (auth.uid() = user_id);
create policy "Users can delete own habit_streaks" on public.habit_streaks for delete using (auth.uid() = user_id);

-- =====================================================
-- GOALS & MILESTONES
-- =====================================================

-- Goal categories
create table public.goal_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#81b29a' not null,
  icon text,
  "order" integer not null default 0,
  created_at timestamptz default now() not null
);

-- Goals
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references public.goal_categories(id) on delete set null,
  title text not null,
  description text,
  target_date date,
  start_date date default current_date,
  status text not null default 'active', -- 'active', 'completed', 'paused', 'abandoned'
  progress integer default 0 not null, -- 0-100
  priority text not null default 'medium', -- 'low', 'medium', 'high'
  "order" integer not null default 0,
  created_at timestamptz default now() not null,
  completed_at timestamptz,
  archived_at timestamptz
);

-- Milestones (sub-goals)
create table public.milestones (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_id uuid references public.goals(id) on delete cascade not null,
  title text not null,
  description text,
  target_date date,
  is_completed boolean default false not null,
  completed_at timestamptz,
  "order" integer not null default 0,
  created_at timestamptz default now() not null
);

-- Goal-Task links (connect kanban tasks to goals)
create table public.goal_task_links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_id uuid references public.goals(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(goal_id, task_id)
);

-- Enable RLS for goals tables
alter table public.goal_categories enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.goal_task_links enable row level security;

-- RLS Policies for goal_categories
create policy "Users can view own goal_categories" on public.goal_categories for select using (auth.uid() = user_id);
create policy "Users can create own goal_categories" on public.goal_categories for insert with check (auth.uid() = user_id);
create policy "Users can update own goal_categories" on public.goal_categories for update using (auth.uid() = user_id);
create policy "Users can delete own goal_categories" on public.goal_categories for delete using (auth.uid() = user_id);

-- RLS Policies for goals
create policy "Users can view own goals" on public.goals for select using (auth.uid() = user_id);
create policy "Users can create own goals" on public.goals for insert with check (auth.uid() = user_id);
create policy "Users can update own goals" on public.goals for update using (auth.uid() = user_id);
create policy "Users can delete own goals" on public.goals for delete using (auth.uid() = user_id);

-- RLS Policies for milestones
create policy "Users can view own milestones" on public.milestones for select using (auth.uid() = user_id);
create policy "Users can create own milestones" on public.milestones for insert with check (auth.uid() = user_id);
create policy "Users can update own milestones" on public.milestones for update using (auth.uid() = user_id);
create policy "Users can delete own milestones" on public.milestones for delete using (auth.uid() = user_id);

-- RLS Policies for goal_task_links
create policy "Users can view own goal_task_links" on public.goal_task_links for select using (auth.uid() = user_id);
create policy "Users can create own goal_task_links" on public.goal_task_links for insert with check (auth.uid() = user_id);
create policy "Users can update own goal_task_links" on public.goal_task_links for update using (auth.uid() = user_id);
create policy "Users can delete own goal_task_links" on public.goal_task_links for delete using (auth.uid() = user_id);

-- =====================================================
-- JOURNAL & REFLECTIONS
-- =====================================================

-- Journal prompts (user-customizable)
create table public.journal_prompts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  prompt_text text not null,
  is_active boolean default true not null,
  "order" integer not null default 0,
  created_at timestamptz default now() not null
);

-- Journal entries
create table public.journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  entry_date date not null default current_date,
  content text default '' not null,
  mood integer, -- 1-10 scale (or null if not tracked)
  mood_emoji text, -- optional emoji representation
  tags text[] default '{}',
  is_favorite boolean default false not null,
  word_count integer default 0 not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, entry_date)
);

-- Enable RLS for journal tables
alter table public.journal_prompts enable row level security;
alter table public.journal_entries enable row level security;

-- RLS Policies for journal_prompts
create policy "Users can view own journal_prompts" on public.journal_prompts for select using (auth.uid() = user_id);
create policy "Users can create own journal_prompts" on public.journal_prompts for insert with check (auth.uid() = user_id);
create policy "Users can update own journal_prompts" on public.journal_prompts for update using (auth.uid() = user_id);
create policy "Users can delete own journal_prompts" on public.journal_prompts for delete using (auth.uid() = user_id);

-- RLS Policies for journal_entries
create policy "Users can view own journal_entries" on public.journal_entries for select using (auth.uid() = user_id);
create policy "Users can create own journal_entries" on public.journal_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own journal_entries" on public.journal_entries for update using (auth.uid() = user_id);
create policy "Users can delete own journal_entries" on public.journal_entries for delete using (auth.uid() = user_id);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

create table public.notification_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  enabled boolean default false not null,
  daily_time time default '20:00' not null,
  timezone text default 'UTC' not null,
  last_sent_at timestamptz,
  reminder_message text default 'Time to journal?' not null,
  quiet_start time default '22:00' not null,
  quiet_end time default '07:00' not null,
  channel_journal boolean default true not null,
  channel_habits boolean default false not null,
  channel_routines boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, endpoint)
);

alter table public.notification_settings enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "Users can view own notification_settings"
  on public.notification_settings for select
  using (auth.uid() = user_id);

create policy "Users can create own notification_settings"
  on public.notification_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notification_settings"
  on public.notification_settings for update
  using (auth.uid() = user_id);

create policy "Users can delete own notification_settings"
  on public.notification_settings for delete
  using (auth.uid() = user_id);

create policy "Users can view own push_subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can create own push_subscriptions"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own push_subscriptions"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

create policy "Users can delete own push_subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- =====================================================
-- FOCUS TIMER (POMODORO)
-- =====================================================

-- Focus timer settings (per user)
create table public.focus_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  work_duration integer default 25 not null, -- minutes
  short_break_duration integer default 5 not null,
  long_break_duration integer default 15 not null,
  sessions_until_long_break integer default 4 not null,
  auto_start_breaks boolean default false not null,
  auto_start_work boolean default false not null,
  sound_enabled boolean default true not null,
  sound_volume integer default 70 not null, -- 0-100
  created_at timestamptz default now() not null
);

-- Focus sessions (history)
create table public.focus_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  session_type text not null default 'work', -- 'work', 'short_break', 'long_break'
  planned_duration integer not null, -- minutes
  actual_duration integer, -- minutes (null if incomplete)
  is_completed boolean default false not null,
  task_id uuid references public.tasks(id) on delete set null,
  goal_id uuid references public.goals(id) on delete set null,
  note text,
  started_at timestamptz default now() not null,
  ended_at timestamptz
);

-- Enable RLS for focus tables
alter table public.focus_settings enable row level security;
alter table public.focus_sessions enable row level security;

-- RLS Policies for focus_settings
create policy "Users can view own focus_settings" on public.focus_settings for select using (auth.uid() = user_id);
create policy "Users can create own focus_settings" on public.focus_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own focus_settings" on public.focus_settings for update using (auth.uid() = user_id);
create policy "Users can delete own focus_settings" on public.focus_settings for delete using (auth.uid() = user_id);

-- RLS Policies for focus_sessions
create policy "Users can view own focus_sessions" on public.focus_sessions for select using (auth.uid() = user_id);
create policy "Users can create own focus_sessions" on public.focus_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own focus_sessions" on public.focus_sessions for update using (auth.uid() = user_id);
create policy "Users can delete own focus_sessions" on public.focus_sessions for delete using (auth.uid() = user_id);

-- =====================================================
-- DASHBOARD WIDGETS
-- =====================================================

-- Widget configurations (for customizable dashboard)
create table public.dashboard_widgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  widget_type text not null, -- 'routines', 'habits', 'goals', 'journal', 'focus', 'stats', 'calendar', 'weather', 'tasks'
  title text, -- custom title override
  position_x integer not null default 0,
  position_y integer not null default 0,
  width integer not null default 1, -- grid columns
  height integer not null default 1, -- grid rows
  config jsonb default '{}' not null, -- widget-specific settings
  is_visible boolean default true not null,
  created_at timestamptz default now() not null
);

-- Enable RLS for dashboard_widgets
alter table public.dashboard_widgets enable row level security;

-- RLS Policies for dashboard_widgets
create policy "Users can view own dashboard_widgets" on public.dashboard_widgets for select using (auth.uid() = user_id);
create policy "Users can create own dashboard_widgets" on public.dashboard_widgets for insert with check (auth.uid() = user_id);
create policy "Users can update own dashboard_widgets" on public.dashboard_widgets for update using (auth.uid() = user_id);
create policy "Users can delete own dashboard_widgets" on public.dashboard_widgets for delete using (auth.uid() = user_id);

-- =====================================================
-- WORK LOCATIONS
-- =====================================================

-- Work location per day (WFH vs Office)
create table public.work_locations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  location text not null check (location in ('wfh', 'office')),
  created_at timestamptz default now() not null,
  unique(user_id, date)
);

-- Enable RLS for work_locations
alter table public.work_locations enable row level security;

-- RLS Policies for work_locations
create policy "Users can view own work_locations" on public.work_locations for select using (auth.uid() = user_id);
create policy "Users can create own work_locations" on public.work_locations for insert with check (auth.uid() = user_id);
create policy "Users can update own work_locations" on public.work_locations for update using (auth.uid() = user_id);
create policy "Users can delete own work_locations" on public.work_locations for delete using (auth.uid() = user_id);

-- =====================================================
-- EXTEND USER SETTINGS
-- =====================================================

-- Add new columns to user_settings for life dashboard features
alter table public.user_settings
  add column if not exists default_view text default 'dashboard',
  add column if not exists sidebar_widgets text[] default '{"routines","focus"}';

-- =====================================================
-- ADD LOCATION TO ROUTINES
-- =====================================================

-- Add location column to routines (NULL = both locations)
alter table public.routines
  add column if not exists location text check (location in ('wfh', 'office'));

-- Add app_settings column for comprehensive settings storage
alter table public.user_settings
  add column if not exists app_settings jsonb default '{}';

-- =====================================================
-- CUSTOMIZABLE TAGS
-- =====================================================

-- Tag categories (Priority, Status, Type, etc.)
create table public.tag_categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  "order" integer default 0 not null,
  created_at timestamptz default now() not null
);

-- Tags (user-customizable labels)
create table public.tags (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  category_id uuid references public.tag_categories(id) on delete set null,
  name text not null,
  color text default '#60a5fa' not null,
  bg_color text default 'rgba(96, 165, 250, 0.15)' not null,
  "order" integer default 0 not null,
  created_at timestamptz default now() not null
);

-- Task-tag junction table (many-to-many)
create table public.task_tags (
  task_id uuid references public.tasks(id) on delete cascade not null,
  tag_id uuid references public.tags(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (task_id, tag_id)
);

-- Enable RLS for tag tables
alter table public.tag_categories enable row level security;
alter table public.tags enable row level security;
alter table public.task_tags enable row level security;

-- RLS Policies for tag_categories
create policy "Users can view own tag_categories" on public.tag_categories for select using (auth.uid() = user_id);
create policy "Users can create own tag_categories" on public.tag_categories for insert with check (auth.uid() = user_id);
create policy "Users can update own tag_categories" on public.tag_categories for update using (auth.uid() = user_id);
create policy "Users can delete own tag_categories" on public.tag_categories for delete using (auth.uid() = user_id);

-- RLS Policies for tags
create policy "Users can view own tags" on public.tags for select using (auth.uid() = user_id);
create policy "Users can create own tags" on public.tags for insert with check (auth.uid() = user_id);
create policy "Users can update own tags" on public.tags for update using (auth.uid() = user_id);
create policy "Users can delete own tags" on public.tags for delete using (auth.uid() = user_id);

-- RLS Policies for task_tags (access via task ownership)
create policy "Users can manage task_tags" on public.task_tags for all using (
  exists (select 1 from public.tasks where tasks.id = task_tags.task_id and tasks.user_id = auth.uid())
);

-- =====================================================
-- USER UI STATE (Cloud-synced persistence)
-- =====================================================

-- User UI state for persisting app state across sessions
create table public.user_ui_state (
  user_id uuid references auth.users(id) on delete cascade primary key,
  active_view text default 'dashboard' not null,
  widget_states jsonb default '{}' not null, -- {widgetId: {collapsed: boolean, ...}}
  section_view_modes jsonb default '{}' not null, -- {habits: 'list'|'day'|'week'|'month', ...}
  section_selected_dates jsonb default '{}' not null, -- {habits: '2026-01-04', ...}
  sidebar_collapsed boolean default false not null,
  focused_task_id uuid references public.tasks(id) on delete set null,
  updated_at timestamptz default now() not null
);

-- Enable RLS for user_ui_state
alter table public.user_ui_state enable row level security;

-- RLS Policies for user_ui_state
create policy "Users can view own ui_state" on public.user_ui_state for select using (auth.uid() = user_id);
create policy "Users can create own ui_state" on public.user_ui_state for insert with check (auth.uid() = user_id);
create policy "Users can update own ui_state" on public.user_ui_state for update using (auth.uid() = user_id);

-- =====================================================
-- ADD COLLAPSED STATE TO WIDGETS
-- =====================================================

alter table public.dashboard_widgets
  add column if not exists is_collapsed boolean default false not null;
