export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      boards: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          board_id: string
          title: string
          description: string | null
          status: string
          priority: string
          labels: string[]
          subtasks: Json
          due_date: string | null
          order: number
          created_at: string
          updated_at: string
          completed_at: string | null
          archived_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          board_id: string
          title: string
          description?: string | null
          status?: string
          priority?: string
          labels?: string[]
          subtasks?: Json
          due_date?: string | null
          order?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          archived_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          board_id?: string
          title?: string
          description?: string | null
          status?: string
          priority?: string
          labels?: string[]
          subtasks?: Json
          due_date?: string | null
          order?: number
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          archived_at?: string | null
        }
      }
      todos: {
        Row: {
          id: string
          user_id: string
          text: string
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          text: string
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          text?: string
          completed?: boolean
          created_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          content: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          user_id: string
          active_board_id: string | null
          theme: string
          compact_mode: boolean
          column_colors: Json
          default_view: string | null
          sidebar_widgets: string[] | null
          app_settings: Json | null
        }
        Insert: {
          user_id: string
          active_board_id?: string | null
          theme?: string
          compact_mode?: boolean
          column_colors?: Json
          default_view?: string | null
          sidebar_widgets?: string[] | null
          app_settings?: Json | null
        }
        Update: {
          user_id?: string
          active_board_id?: string | null
          theme?: string
          compact_mode?: boolean
          column_colors?: Json
          default_view?: string | null
          sidebar_widgets?: string[] | null
          app_settings?: Json | null
        }
      }
      notification_settings: {
        Row: {
          user_id: string
          enabled: boolean
          daily_time: string
          timezone: string
          last_sent_at: string | null
          reminder_message: string
          quiet_start: string
          quiet_end: string
          channel_journal: boolean
          channel_habits: boolean
          channel_routines: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          enabled?: boolean
          daily_time?: string
          timezone?: string
          last_sent_at?: string | null
          reminder_message?: string
          quiet_start?: string
          quiet_end?: string
          channel_journal?: boolean
          channel_habits?: boolean
          channel_routines?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          enabled?: boolean
          daily_time?: string
          timezone?: string
          last_sent_at?: string | null
          reminder_message?: string
          quiet_start?: string
          quiet_end?: string
          channel_journal?: boolean
          channel_habits?: boolean
          channel_routines?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      routines: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          days_of_week: number[]
          location: string | null
          is_active: boolean
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          days_of_week?: number[]
          location?: string | null
          is_active?: boolean
          order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          days_of_week?: number[]
          location?: string | null
          is_active?: boolean
          order?: number
          created_at?: string
        }
      }
      routine_items: {
        Row: {
          id: string
          user_id: string
          routine_id: string
          title: string
          target_time: string | null
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          routine_id: string
          title: string
          target_time?: string | null
          order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          routine_id?: string
          title?: string
          target_time?: string | null
          order?: number
          created_at?: string
        }
      }
      routine_completions: {
        Row: {
          id: string
          user_id: string
          routine_id: string
          completion_date: string
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          routine_id: string
          completion_date?: string
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          routine_id?: string
          completion_date?: string
          completed_at?: string
        }
      }
      routine_item_completions: {
        Row: {
          id: string
          user_id: string
          routine_item_id: string
          completion_date: string
          completed_at: string
          duration: string | null
        }
        Insert: {
          id?: string
          user_id: string
          routine_item_id: string
          completion_date?: string
          completed_at?: string
          duration?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          routine_item_id?: string
          completion_date?: string
          completed_at?: string
          duration?: string | null
        }
      }
      habit_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          icon: string | null
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          icon?: string | null
          order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          icon?: string | null
          order?: number
          created_at?: string
        }
      }
      habits: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          name: string
          description: string | null
          frequency_type: string
          frequency_value: number | null
          specific_days: number[] | null
          target_count: number
          is_active: boolean
          color: string
          icon: string | null
          order: number
          created_at: string
          archived_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          name: string
          description?: string | null
          frequency_type?: string
          frequency_value?: number | null
          specific_days?: number[] | null
          target_count?: number
          is_active?: boolean
          color?: string
          icon?: string | null
          order?: number
          created_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          name?: string
          description?: string | null
          frequency_type?: string
          frequency_value?: number | null
          specific_days?: number[] | null
          target_count?: number
          is_active?: boolean
          color?: string
          icon?: string | null
          order?: number
          created_at?: string
          archived_at?: string | null
        }
      }
      habit_completions: {
        Row: {
          id: string
          user_id: string
          habit_id: string
          completion_date: string
          count: number
          note: string | null
          completed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          habit_id: string
          completion_date?: string
          count?: number
          note?: string | null
          completed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          habit_id?: string
          completion_date?: string
          count?: number
          note?: string | null
          completed_at?: string
        }
      }
      habit_streaks: {
        Row: {
          id: string
          user_id: string
          habit_id: string
          current_streak: number
          best_streak: number
          last_completion_date: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          habit_id: string
          current_streak?: number
          best_streak?: number
          last_completion_date?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          habit_id?: string
          current_streak?: number
          best_streak?: number
          last_completion_date?: string | null
          updated_at?: string
        }
      }
      goal_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          icon: string | null
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          icon?: string | null
          order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          icon?: string | null
          order?: number
          created_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          title: string
          description: string | null
          target_date: string | null
          start_date: string
          status: string
          progress: number
          priority: string
          order: number
          created_at: string
          completed_at: string | null
          archived_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          title: string
          description?: string | null
          target_date?: string | null
          start_date?: string
          status?: string
          progress?: number
          priority?: string
          order?: number
          created_at?: string
          completed_at?: string | null
          archived_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          title?: string
          description?: string | null
          target_date?: string | null
          start_date?: string
          status?: string
          progress?: number
          priority?: string
          order?: number
          created_at?: string
          completed_at?: string | null
          archived_at?: string | null
        }
      }
      milestones: {
        Row: {
          id: string
          user_id: string
          goal_id: string
          title: string
          description: string | null
          target_date: string | null
          is_completed: boolean
          completed_at: string | null
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_id: string
          title: string
          description?: string | null
          target_date?: string | null
          is_completed?: boolean
          completed_at?: string | null
          order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string
          title?: string
          description?: string | null
          target_date?: string | null
          is_completed?: boolean
          completed_at?: string | null
          order?: number
          created_at?: string
        }
      }
      goal_task_links: {
        Row: {
          id: string
          user_id: string
          goal_id: string
          task_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_id: string
          task_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string
          task_id?: string
          created_at?: string
        }
      }
      journal_prompts: {
        Row: {
          id: string
          user_id: string
          prompt_text: string
          is_active: boolean
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          prompt_text: string
          is_active?: boolean
          order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          prompt_text?: string
          is_active?: boolean
          order?: number
          created_at?: string
        }
      }
      journal_entries: {
        Row: {
          id: string
          user_id: string
          entry_date: string
          content: string
          mood: number | null
          mood_emoji: string | null
          tags: string[]
          is_favorite: boolean
          word_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entry_date?: string
          content?: string
          mood?: number | null
          mood_emoji?: string | null
          tags?: string[]
          is_favorite?: boolean
          word_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entry_date?: string
          content?: string
          mood?: number | null
          mood_emoji?: string | null
          tags?: string[]
          is_favorite?: boolean
          word_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      focus_settings: {
        Row: {
          user_id: string
          work_duration: number
          short_break_duration: number
          long_break_duration: number
          sessions_until_long_break: number
          auto_start_breaks: boolean
          auto_start_work: boolean
          sound_enabled: boolean
          sound_volume: number
          created_at: string
        }
        Insert: {
          user_id: string
          work_duration?: number
          short_break_duration?: number
          long_break_duration?: number
          sessions_until_long_break?: number
          auto_start_breaks?: boolean
          auto_start_work?: boolean
          sound_enabled?: boolean
          sound_volume?: number
          created_at?: string
        }
        Update: {
          user_id?: string
          work_duration?: number
          short_break_duration?: number
          long_break_duration?: number
          sessions_until_long_break?: number
          auto_start_breaks?: boolean
          auto_start_work?: boolean
          sound_enabled?: boolean
          sound_volume?: number
          created_at?: string
        }
      }
      focus_sessions: {
        Row: {
          id: string
          user_id: string
          session_type: string
          planned_duration: number
          actual_duration: number | null
          is_completed: boolean
          task_id: string | null
          goal_id: string | null
          note: string | null
          started_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          session_type?: string
          planned_duration: number
          actual_duration?: number | null
          is_completed?: boolean
          task_id?: string | null
          goal_id?: string | null
          note?: string | null
          started_at?: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          session_type?: string
          planned_duration?: number
          actual_duration?: number | null
          is_completed?: boolean
          task_id?: string | null
          goal_id?: string | null
          note?: string | null
          started_at?: string
          ended_at?: string | null
        }
      }
      dashboard_widgets: {
        Row: {
          id: string
          user_id: string
          widget_type: string
          title: string | null
          position_x: number
          position_y: number
          width: number
          height: number
          config: Json
          is_visible: boolean
          is_collapsed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          widget_type: string
          title?: string | null
          position_x?: number
          position_y?: number
          width?: number
          height?: number
          config?: Json
          is_visible?: boolean
          is_collapsed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          widget_type?: string
          title?: string | null
          position_x?: number
          position_y?: number
          width?: number
          height?: number
          config?: Json
          is_visible?: boolean
          is_collapsed?: boolean
          created_at?: string
        }
      }
      work_locations: {
        Row: {
          id: string
          user_id: string
          date: string
          location: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          location: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          location?: string
          created_at?: string
        }
      }
      tag_categories: {
        Row: {
          id: string
          user_id: string
          name: string
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          order?: number
          created_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          user_id: string
          category_id: string | null
          name: string
          color: string
          bg_color: string
          order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id?: string | null
          name: string
          color?: string
          bg_color?: string
          order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string | null
          name?: string
          color?: string
          bg_color?: string
          order?: number
          created_at?: string
        }
      }
      task_tags: {
        Row: {
          task_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          task_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          task_id?: string
          tag_id?: string
          created_at?: string
        }
      }
      user_ui_state: {
        Row: {
          user_id: string
          active_view: string
          widget_states: Json
          section_view_modes: Json
          section_selected_dates: Json
          sidebar_collapsed: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          active_view?: string
          widget_states?: Json
          section_view_modes?: Json
          section_selected_dates?: Json
          sidebar_collapsed?: boolean
          updated_at?: string
        }
        Update: {
          user_id?: string
          active_view?: string
          widget_states?: Json
          section_view_modes?: Json
          section_selected_dates?: Json
          sidebar_collapsed?: boolean
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
