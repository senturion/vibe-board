-- Indexes for the columns the app filters and joins on.
--
-- The original schema created none, so every query scanned its whole table
-- and every row-level-security check on user_id did the same. Tables that
-- already have a unique constraint starting with user_id are not repeated.
--
-- Safe to run more than once, and safe on a live database: it only adds
-- indexes and changes no data. Run it in the Supabase SQL Editor.

create index if not exists boards_user_id_idx on public.boards (user_id);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_board_id_idx on public.tasks (board_id);
create index if not exists todos_user_id_idx on public.todos (user_id);
create index if not exists notes_user_id_idx on public.notes (user_id);

create index if not exists tag_categories_user_id_idx on public.tag_categories (user_id);
create index if not exists tags_user_id_idx on public.tags (user_id);
create index if not exists task_tags_tag_id_idx on public.task_tags (tag_id);

create index if not exists habit_categories_user_id_idx on public.habit_categories (user_id);
create index if not exists habits_user_id_idx on public.habits (user_id);
create index if not exists habit_completions_user_date_idx on public.habit_completions (user_id, completion_date);
create index if not exists habit_completions_habit_id_idx on public.habit_completions (habit_id);

create index if not exists goal_categories_user_id_idx on public.goal_categories (user_id);
create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists milestones_user_id_idx on public.milestones (user_id);
create index if not exists milestones_goal_id_idx on public.milestones (goal_id);
create index if not exists goal_task_links_user_id_idx on public.goal_task_links (user_id);
create index if not exists goal_task_links_task_id_idx on public.goal_task_links (task_id);

create index if not exists routines_user_id_idx on public.routines (user_id);
create index if not exists routine_items_user_id_idx on public.routine_items (user_id);
create index if not exists routine_items_routine_id_idx on public.routine_items (routine_id);

create index if not exists journal_prompts_user_id_idx on public.journal_prompts (user_id);
create index if not exists focus_sessions_user_started_idx on public.focus_sessions (user_id, started_at);
create index if not exists dashboard_widgets_user_id_idx on public.dashboard_widgets (user_id);
