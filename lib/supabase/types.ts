export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      boards: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      dashboard_widgets: {
        Row: {
          config: Json
          created_at: string
          height: number
          id: string
          is_collapsed: boolean
          is_visible: boolean
          position_x: number
          position_y: number
          title: string | null
          user_id: string
          widget_type: string
          width: number
        }
        Insert: {
          config?: Json
          created_at?: string
          height?: number
          id?: string
          is_collapsed?: boolean
          is_visible?: boolean
          position_x?: number
          position_y?: number
          title?: string | null
          user_id: string
          widget_type: string
          width?: number
        }
        Update: {
          config?: Json
          created_at?: string
          height?: number
          id?: string
          is_collapsed?: boolean
          is_visible?: boolean
          position_x?: number
          position_y?: number
          title?: string | null
          user_id?: string
          widget_type?: string
          width?: number
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          actual_duration: number | null
          ended_at: string | null
          goal_id: string | null
          id: string
          is_completed: boolean
          note: string | null
          planned_duration: number
          session_type: string
          started_at: string
          task_id: string | null
          user_id: string
        }
        Insert: {
          actual_duration?: number | null
          ended_at?: string | null
          goal_id?: string | null
          id?: string
          is_completed?: boolean
          note?: string | null
          planned_duration: number
          session_type?: string
          started_at?: string
          task_id?: string | null
          user_id: string
        }
        Update: {
          actual_duration?: number | null
          ended_at?: string | null
          goal_id?: string | null
          id?: string
          is_completed?: boolean
          note?: string | null
          planned_duration?: number
          session_type?: string
          started_at?: string
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_settings: {
        Row: {
          auto_start_breaks: boolean
          auto_start_work: boolean
          created_at: string
          long_break_duration: number
          sessions_until_long_break: number
          short_break_duration: number
          sound_enabled: boolean
          sound_volume: number
          user_id: string
          work_duration: number
        }
        Insert: {
          auto_start_breaks?: boolean
          auto_start_work?: boolean
          created_at?: string
          long_break_duration?: number
          sessions_until_long_break?: number
          short_break_duration?: number
          sound_enabled?: boolean
          sound_volume?: number
          user_id: string
          work_duration?: number
        }
        Update: {
          auto_start_breaks?: boolean
          auto_start_work?: boolean
          created_at?: string
          long_break_duration?: number
          sessions_until_long_break?: number
          short_break_duration?: number
          sound_enabled?: boolean
          sound_volume?: number
          user_id?: string
          work_duration?: number
        }
        Relationships: []
      }
      goal_categories: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          name: string
          order: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          order?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          order?: number
          user_id?: string
        }
        Relationships: []
      }
      goal_task_links: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_task_links_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_task_links_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          archived_at: string | null
          category_id: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          order: number
          priority: string
          progress: number
          start_date: string | null
          status: string
          target_date: string | null
          title: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order?: number
          priority?: string
          progress?: number
          start_date?: string | null
          status?: string
          target_date?: string | null
          title: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order?: number
          priority?: string
          progress?: number
          start_date?: string | null
          status?: string
          target_date?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "goal_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_categories: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          name: string
          order: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          order?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          order?: number
          user_id?: string
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          completed_at: string
          completion_date: string
          count: number
          habit_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          completion_date?: string
          count?: number
          habit_id: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          completion_date?: string
          count?: number
          habit_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_streaks: {
        Row: {
          best_streak: number
          current_streak: number
          habit_id: string
          id: string
          last_completion_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number
          current_streak?: number
          habit_id: string
          id?: string
          last_completion_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number
          current_streak?: number
          habit_id?: string
          id?: string
          last_completion_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_streaks_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          archived_at: string | null
          category_id: string | null
          color: string
          created_at: string
          description: string | null
          frequency_type: string
          frequency_value: number | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          order: number
          specific_days: number[] | null
          target_count: number
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          color?: string
          created_at?: string
          description?: string | null
          frequency_type?: string
          frequency_value?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          order?: number
          specific_days?: number[] | null
          target_count?: number
          user_id: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          color?: string
          created_at?: string
          description?: string | null
          frequency_type?: string
          frequency_value?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order?: number
          specific_days?: number[] | null
          target_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "habit_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          entry_date: string
          id: string
          is_favorite: boolean
          mood: number | null
          mood_emoji: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          content?: string
          created_at?: string
          entry_date?: string
          id?: string
          is_favorite?: boolean
          mood?: number | null
          mood_emoji?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          content?: string
          created_at?: string
          entry_date?: string
          id?: string
          is_favorite?: boolean
          mood?: number | null
          mood_emoji?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: []
      }
      journal_prompts: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          order: number
          prompt_text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          order?: number
          prompt_text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          order?: number
          prompt_text?: string
          user_id?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          goal_id: string
          id: string
          is_completed: boolean
          order: number
          target_date: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          goal_id: string
          id?: string
          is_completed?: boolean
          order?: number
          target_date?: string | null
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string
          id?: string
          is_completed?: boolean
          order?: number
          target_date?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          channel_habits: boolean
          channel_journal: boolean
          channel_routines: boolean
          created_at: string
          daily_time: string
          enabled: boolean
          last_sent_at: string | null
          quiet_end: string
          quiet_start: string
          reminder_message: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_habits?: boolean
          channel_journal?: boolean
          channel_routines?: boolean
          created_at?: string
          daily_time?: string
          enabled?: boolean
          last_sent_at?: string | null
          quiet_end?: string
          quiet_start?: string
          reminder_message?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_habits?: boolean
          channel_journal?: boolean
          channel_routines?: boolean
          created_at?: string
          daily_time?: string
          enabled?: boolean
          last_sent_at?: string | null
          quiet_end?: string
          quiet_start?: string
          reminder_message?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      routine_completions: {
        Row: {
          completed_at: string
          completion_date: string
          id: string
          routine_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          completion_date?: string
          id?: string
          routine_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          completion_date?: string
          id?: string
          routine_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_completions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_item_completions: {
        Row: {
          completed_at: string
          completion_date: string
          duration: string
          id: string
          routine_item_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          completion_date?: string
          duration?: unknown
          id?: string
          routine_item_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          completion_date?: string
          duration?: unknown
          id?: string
          routine_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_item_completions_routine_item_id_fkey"
            columns: ["routine_item_id"]
            isOneToOne: false
            referencedRelation: "routine_items"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_items: {
        Row: {
          created_at: string
          id: string
          order: number
          routine_id: string
          target_time: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order?: number
          routine_id: string
          target_time?: unknown
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order?: number
          routine_id?: string
          target_time?: unknown
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_items_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          days_of_week: number[]
          description: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          order?: number
          user_id?: string
        }
        Relationships: []
      }
      tag_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order?: number
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          bg_color: string
          category_id: string | null
          color: string
          created_at: string
          id: string
          name: string
          order: number
          user_id: string
        }
        Insert: {
          bg_color?: string
          category_id?: string | null
          color?: string
          created_at?: string
          id?: string
          name: string
          order?: number
          user_id: string
        }
        Update: {
          bg_color?: string
          category_id?: string | null
          color?: string
          created_at?: string
          id?: string
          name?: string
          order?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tag_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tags: {
        Row: {
          created_at: string
          tag_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          tag_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          board_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          labels: string[] | null
          order: number
          priority: string
          status: string
          subtasks: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          board_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          labels?: string[] | null
          order?: number
          priority?: string
          status?: string
          subtasks?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          board_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          labels?: string[] | null
          order?: number
          priority?: string
          status?: string
          subtasks?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      todos: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          text: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          text: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          active_board_id: string | null
          app_settings: Json | null
          column_colors: Json
          compact_mode: boolean
          default_view: string | null
          sidebar_widgets: string[] | null
          theme: string
          user_id: string
        }
        Insert: {
          active_board_id?: string | null
          app_settings?: Json | null
          column_colors?: Json
          compact_mode?: boolean
          default_view?: string | null
          sidebar_widgets?: string[] | null
          theme?: string
          user_id: string
        }
        Update: {
          active_board_id?: string | null
          app_settings?: Json | null
          column_colors?: Json
          compact_mode?: boolean
          default_view?: string | null
          sidebar_widgets?: string[] | null
          theme?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_active_board_id_fkey"
            columns: ["active_board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ui_state: {
        Row: {
          active_view: string
          focused_task_id: string | null
          section_selected_dates: Json
          section_view_modes: Json
          sidebar_collapsed: boolean
          updated_at: string
          user_id: string
          widget_states: Json
        }
        Insert: {
          active_view?: string
          focused_task_id?: string | null
          section_selected_dates?: Json
          section_view_modes?: Json
          sidebar_collapsed?: boolean
          updated_at?: string
          user_id: string
          widget_states?: Json
        }
        Update: {
          active_view?: string
          focused_task_id?: string | null
          section_selected_dates?: Json
          section_view_modes?: Json
          sidebar_collapsed?: boolean
          updated_at?: string
          user_id?: string
          widget_states?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_ui_state_focused_task_id_fkey"
            columns: ["focused_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      work_locations: {
        Row: {
          created_at: string
          date: string
          id: string
          location: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          location: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          location?: string
          user_id?: string
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
