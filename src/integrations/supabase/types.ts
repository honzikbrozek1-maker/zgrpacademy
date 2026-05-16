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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_requests: {
        Row: {
          created_at: string
          id: string
          reviewed_by: string | null
          status: string
          target_admin_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reviewed_by?: string | null
          status?: string
          target_admin_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reviewed_by?: string | null
          status?: string
          target_admin_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      awarded_question_points: {
        Row: {
          category: string
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: []
      }
      invite_links: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code?: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      issued_diplomas: {
        Row: {
          average_score: number
          group_id: string
          id: string
          issued_at: string
          user_id: string
        }
        Insert: {
          average_score: number
          group_id: string
          id?: string
          issued_at?: string
          user_id: string
        }
        Update: {
          average_score?: number
          group_id?: string
          id?: string
          issued_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issued_diplomas_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "level_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      level_groups: {
        Row: {
          category: string
          created_at: string
          description: string | null
          diploma_subtitle: string
          diploma_title: string
          final_test_passing_score: number
          id: string
          min_average_score: number
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          diploma_subtitle?: string
          diploma_title?: string
          final_test_passing_score?: number
          id?: string
          min_average_score?: number
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          diploma_subtitle?: string
          diploma_title?: string
          final_test_passing_score?: number
          id?: string
          min_average_score?: number
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      levels: {
        Row: {
          category: string
          created_at: string
          description: string | null
          group_id: string | null
          id: string
          order_index: number
          passing_score: number
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          order_index?: number
          passing_score?: number
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          order_index?: number
          passing_score?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "levels_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "level_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          environment: string
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          environment?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          color_scheme: string
          created_at: string
          current_level: number
          display_name: string
          has_paid: boolean
          id: string
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          color_scheme?: string
          created_at?: string
          current_level?: number
          display_name?: string
          has_paid?: boolean
          id?: string
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          color_scheme?: string
          created_at?: string
          current_level?: number
          display_name?: string
          has_paid?: boolean
          id?: string
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          back_text: string | null
          correct_answer: number | null
          created_at: string
          group_id: string | null
          id: string
          in_level_test: boolean
          level_id: string | null
          option_1: string | null
          option_2: string | null
          option_3: string | null
          option_4: string | null
          order_index: number
          question_text: string
          type: string
          wrong_option_1: string | null
          wrong_option_2: string | null
          wrong_option_3: string | null
        }
        Insert: {
          back_text?: string | null
          correct_answer?: number | null
          created_at?: string
          group_id?: string | null
          id?: string
          in_level_test?: boolean
          level_id?: string | null
          option_1?: string | null
          option_2?: string | null
          option_3?: string | null
          option_4?: string | null
          order_index?: number
          question_text: string
          type: string
          wrong_option_1?: string | null
          wrong_option_2?: string | null
          wrong_option_3?: string | null
        }
        Update: {
          back_text?: string | null
          correct_answer?: number | null
          created_at?: string
          group_id?: string | null
          id?: string
          in_level_test?: boolean
          level_id?: string | null
          option_1?: string | null
          option_2?: string | null
          option_3?: string | null
          option_4?: string | null
          order_index?: number
          question_text?: string
          type?: string
          wrong_option_1?: string | null
          wrong_option_2?: string | null
          wrong_option_3?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "level_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      review_items: {
        Row: {
          confidence: string
          created_at: string
          id: string
          question_id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: string
          created_at?: string
          id?: string
          question_id: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: string
          created_at?: string
          id?: string
          question_id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      section_profiles: {
        Row: {
          category: string
          color_scheme: string
          created_at: string
          current_level: number
          id: string
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          color_scheme?: string
          created_at?: string
          current_level?: number
          id?: string
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          color_scheme?: string
          created_at?: string
          current_level?: number
          id?: string
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_group_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          group_id: string
          id: string
          passed: boolean
          test_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          group_id: string
          id?: string
          passed?: boolean
          test_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          group_id?: string
          id?: string
          passed?: boolean
          test_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_progress_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "level_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_modules: Json
          created_at: string
          id: string
          level_id: string
          test_score: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_modules?: Json
          created_at?: string
          id?: string
          level_id: string
          test_score?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_modules?: Json
          created_at?: string
          id?: string
          level_id?: string
          test_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      questions_safe: {
        Row: {
          back_text: string | null
          created_at: string | null
          group_id: string | null
          id: string | null
          level_id: string | null
          option_1: string | null
          option_2: string | null
          option_3: string | null
          option_4: string | null
          order_index: number | null
          question_text: string | null
          type: string | null
          wrong_option_1: string | null
          wrong_option_2: string | null
          wrong_option_3: string | null
        }
        Insert: {
          back_text?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string | null
          level_id?: string | null
          option_1?: string | null
          option_2?: string | null
          option_3?: string | null
          option_4?: string | null
          order_index?: number | null
          question_text?: string | null
          type?: string | null
          wrong_option_1?: string | null
          wrong_option_2?: string | null
          wrong_option_3?: string | null
        }
        Update: {
          back_text?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string | null
          level_id?: string | null
          option_1?: string | null
          option_2?: string | null
          option_3?: string | null
          option_4?: string | null
          order_index?: number | null
          question_text?: string | null
          type?: string | null
          wrong_option_1?: string | null
          wrong_option_2?: string | null
          wrong_option_3?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "level_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invite: { Args: { invite_code: string }; Returns: undefined }
      admin_reset_user_progress: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      award_points_for_question: {
        Args: { p_category?: string; p_question_id: string }
        Returns: Json
      }
      check_quiz_answer: {
        Args: { p_answer: number; p_question_id: string }
        Returns: Json
      }
      complete_group_test_v2: {
        Args: { p_answers: Json; p_group_id: string }
        Returns: Json
      }
      complete_level: {
        Args: { p_level_id: string; p_question_answers: Json }
        Returns: Json
      }
      complete_level_v2: {
        Args: { p_answers: Json; p_level_id: string }
        Returns: Json
      }
      delete_my_account: { Args: never; Returns: undefined }
      get_group_test: { Args: { p_group_id: string }; Returns: Json }
      get_level_test: { Args: { p_level_id: string }; Returns: Json }
      handle_admin_request: {
        Args: { p_approve: boolean; p_request_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_unlocked: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_paid: { Args: { _user_id: string }; Returns: boolean }
      issue_diploma_if_eligible: { Args: { p_group_id: string }; Returns: Json }
      list_admins: {
        Args: never
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      list_my_diplomas: {
        Args: never
        Returns: {
          average_score: number
          category: string
          diploma_id: string
          diploma_subtitle: string
          diploma_title: string
          group_id: string
          group_title: string
          issued_at: string
        }[]
      }
      lookup_invite: {
        Args: { invite_code: string }
        Returns: {
          expires_at: string
          role: Database["public"]["Enums"]["app_role"]
          used_by: string
        }[]
      }
      reset_my_progress: { Args: never; Returns: undefined }
      set_completed_modules: {
        Args: { p_level_id: string; p_modules: Json }
        Returns: undefined
      }
      submit_quiz_test: { Args: { p_question_answers: Json }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
