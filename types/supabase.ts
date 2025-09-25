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
      cron_logs: {
        Row: {
          id: string
          type: string
          executed_at: string
          execution_time_ms: number
          success: boolean
          error: string | null
          total_users: number | null
          success_count: number | null
          fail_count: number | null
          skipped_count: number | null
          today_tasks_count: number | null
          overdue_tasks_count: number | null
          results: Json | null
        }
        Insert: {
          id?: string
          type: string
          executed_at?: string
          execution_time_ms: number
          success?: boolean
          error?: string | null
          total_users?: number | null
          success_count?: number | null
          fail_count?: number | null
          skipped_count?: number | null
          today_tasks_count?: number | null
          overdue_tasks_count?: number | null
          results?: Json | null
        }
        Update: {
          id?: string
          type?: string
          executed_at?: string
          execution_time_ms?: number
          success?: boolean
          error?: string | null
          total_users?: number | null
          success_count?: number | null
          fail_count?: number | null
          skipped_count?: number | null
          today_tasks_count?: number | null
          overdue_tags_count?: number | null
          results?: Json | null
        }
      }
      email_logs: {
        Row: {
          id: string
          recipient: string
          subject: string
          type: string
          sent_at: string
          success: boolean
          error: string | null
          task_count: number | null
          overdue_count: number | null
        }
        Insert: {
          id?: string
          recipient: string
          subject: string
          type: string
          sent_at?: string
          success?: boolean
          error?: string | null
          task_count?: number | null
          overdue_count?: number | null
        }
        Update: {
          id?: string
          recipient?: string
          subject?: string
          type?: string
          sent_at?: string
          success?: boolean
          error?: string | null
          task_count?: number | null
          overdue_count?: number | null
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
