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
          archived_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          board_id: string
          title: string
          description?: string | null
          status: string
          priority: string
          labels?: string[]
          subtasks?: Json
          due_date?: string | null
          order: number
          created_at?: string
          archived_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          board_id?: string
          title?: string
          description?: string | null
          column?: string
          priority?: string
          labels?: string[]
          subtasks?: Json
          due_date?: string | null
          order?: number
          created_at?: string
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
          content: string
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
        }
        Insert: {
          user_id: string
          active_board_id?: string | null
          theme?: string
          compact_mode?: boolean
          column_colors?: Json
        }
        Update: {
          user_id?: string
          active_board_id?: string | null
          theme?: string
          compact_mode?: boolean
          column_colors?: Json
        }
      }
    }
  }
}
