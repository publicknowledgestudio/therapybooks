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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          booked_at: string
          cancelled_at: string | null
          client_email: string
          client_name: string
          client_phone: string | null
          google_event_id: string | null
          id: number
          session_id: number | null
          therapist_user_id: string
        }
        Insert: {
          booked_at?: string
          cancelled_at?: string | null
          client_email: string
          client_name: string
          client_phone?: string | null
          google_event_id?: string | null
          id?: number
          session_id?: number | null
          therapist_user_id: string
        }
        Update: {
          booked_at?: string
          cancelled_at?: string | null
          client_email?: string
          client_name?: string
          client_phone?: string | null
          google_event_id?: string | null
          id?: number
          session_id?: number | null
          therapist_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payments: {
        Row: {
          amount: number
          client_id: number
          created_at: string
          id: number
          transaction_id: number
          user_id: string
        }
        Insert: {
          amount: number
          client_id: number
          created_at?: string
          id?: number
          transaction_id: number
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: number
          created_at?: string
          id?: number
          transaction_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          current_rate: number | null
          email: string | null
          id: number
          is_active: boolean
          name: string
          notes: string | null
          opening_balance: number
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_rate?: number | null
          email?: string | null
          id?: number
          is_active?: boolean
          name: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_rate?: number | null
          email?: string | null
          id?: number
          is_active?: boolean
          name?: string
          notes?: string | null
          opening_balance?: number
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          client_id: number
          created_at: string
          date: string
          description: string | null
          id: number
          invoice_number: number | null
          pdf_path: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          user_id: string
        }
        Insert: {
          amount: number
          client_id: number
          created_at?: string
          date: string
          description?: string | null
          id?: number
          invoice_number?: number | null
          pdf_path?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: number
          invoice_number?: number | null
          pdf_path?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      session_payments: {
        Row: {
          amount: number
          created_at: string
          id: number
          session_id: number
          transaction_id: number | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: number
          session_id: number
          transaction_id?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: number
          session_id?: number
          transaction_id?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          client_id: number
          created_at: string
          date: string
          duration_minutes: number | null
          end_time: string | null
          google_event_id: string | null
          id: number
          is_chargeable: boolean
          notes: string | null
          rate: number | null
          session_type: string
          source: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: number
          created_at?: string
          date: string
          duration_minutes?: number | null
          end_time?: string | null
          google_event_id?: string | null
          id?: number
          is_chargeable?: boolean
          notes?: string | null
          rate?: number | null
          session_type?: string
          source?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: number
          created_at?: string
          date?: string
          duration_minutes?: number | null
          end_time?: string | null
          google_event_id?: string | null
          id?: number
          is_chargeable?: boolean
          notes?: string | null
          rate?: number | null
          session_type?: string
          source?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_settings: {
        Row: {
          advance_notice_hours: number
          booking_slug: string | null
          break_between_minutes: number
          cancellation_window_hours: number
          created_at: string
          default_session_rate: number | null
          google_calendar_id: string | null
          google_refresh_token: string | null
          id: number
          last_seen_changelog: string | null
          onboarding_completed: boolean
          outbound_sync_enabled: boolean
          practice_address: string | null
          practice_name: string | null
          practice_phone: string | null
          session_duration_minutes: number
          therapist_id: number | null
          updated_at: string
          user_id: string
          working_hours: Json
        }
        Insert: {
          advance_notice_hours?: number
          booking_slug?: string | null
          break_between_minutes?: number
          cancellation_window_hours?: number
          created_at?: string
          default_session_rate?: number | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          id?: number
          last_seen_changelog?: string | null
          onboarding_completed?: boolean
          outbound_sync_enabled?: boolean
          practice_address?: string | null
          practice_name?: string | null
          practice_phone?: string | null
          session_duration_minutes?: number
          therapist_id?: number | null
          updated_at?: string
          user_id: string
          working_hours?: Json
        }
        Update: {
          advance_notice_hours?: number
          booking_slug?: string | null
          break_between_minutes?: number
          cancellation_window_hours?: number
          created_at?: string
          default_session_rate?: number | null
          google_calendar_id?: string | null
          google_refresh_token?: string | null
          id?: number
          last_seen_changelog?: string | null
          onboarding_completed?: boolean
          outbound_sync_enabled?: boolean
          practice_address?: string | null
          practice_name?: string | null
          practice_phone?: string | null
          session_duration_minutes?: number
          therapist_id?: number | null
          updated_at?: string
          user_id?: string
          working_hours?: Json
        }
        Relationships: [
          {
            foreignKeyName: "therapist_settings_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      therapists: {
        Row: {
          created_at: string
          email: string | null
          id: number
          is_active: boolean
          name: string
          phone: string | null
          slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          is_active?: boolean
          name: string
          phone?: string | null
          slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          is_active?: boolean
          name?: string
          phone?: string | null
          slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance: number | null
          bank_file: string | null
          category: string | null
          created_at: string
          data_issues: string | null
          date: string
          id: number
          is_personal: boolean | null
          narration: string | null
          reference: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance?: number | null
          bank_file?: string | null
          category?: string | null
          created_at?: string
          data_issues?: string | null
          date: string
          id?: number
          is_personal?: boolean | null
          narration?: string | null
          reference?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance?: number | null
          bank_file?: string | null
          category?: string | null
          created_at?: string
          data_issues?: string | null
          date?: string
          id?: number
          is_personal?: boolean | null
          narration?: string | null
          reference?: string | null
          source?: string | null
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
      invoice_status: "draft" | "sent" | "paid"
      session_status: "scheduled" | "confirmed" | "cancelled" | "no_show"
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
    Enums: {
      invoice_status: ["draft", "sent", "paid"],
      session_status: ["scheduled", "confirmed", "cancelled", "no_show"],
    },
  },
} as const
