export interface Database {
  public: {
    Tables: {
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          assignee: string
          frequency: 'daily' | 'weekly' | 'monthly'
          frequency_details: Json
          due_date: string
          completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          assignee: string
          frequency: 'daily' | 'weekly' | 'monthly'
          frequency_details: Json
          due_date: string
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          assignee?: string
          frequency?: 'daily' | 'weekly' | 'monthly'
          frequency_details?: Json
          due_date?: string
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      task_completions: {
        Row: {
          id: string
          task_id: string
          completed_at: string
          completed_by: string
          notes: string | null
        }
        Insert: {
          id?: string
          task_id: string
          completed_at?: string
          completed_by: string
          notes?: string | null
        }
        Update: {
          id?: string
          task_id?: string
          completed_at?: string
          completed_by?: string
          notes?: string | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'user'
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'admin' | 'user'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'user'
          created_at?: string
        }
      }
      notification_settings: {
        Row: {
          id: string
          user_id: string
          email_enabled: boolean
          email_time: string
          reminder_hours: number
          weekend_notifications: boolean
        }
        Insert: {
          id?: string
          user_id: string
          email_enabled?: boolean
          email_time?: string
          reminder_hours?: number
          weekend_notifications?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          email_enabled?: boolean
          email_time?: string
          reminder_hours?: number
          weekend_notifications?: boolean
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

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
