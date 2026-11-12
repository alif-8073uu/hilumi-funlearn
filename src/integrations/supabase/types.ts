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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      legacy_users: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          email: string
          legacy_id: string
          lumi_id: string | null
          nick: string | null
          progress: Json | null
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          email: string
          legacy_id: string
          lumi_id?: string | null
          nick?: string | null
          progress?: Json | null
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          email?: string
          legacy_id?: string
          lumi_id?: string | null
          nick?: string | null
          progress?: Json | null
        }
        Relationships: []
      }
      password_reset_attempts: {
        Row: {
          email: string
          failures: number
          window_start: string
        }
        Insert: {
          email: string
          failures?: number
          window_start?: string
        }
        Update: {
          email?: string
          failures?: number
          window_start?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          lumi_id: string
          nick: string
          progress: Json
          updated_at: string
        }
        Insert: {
          id: string
          lumi_id?: string
          nick?: string
          progress?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          lumi_id?: string
          nick?: string
          progress?: Json
          updated_at?: string
        }
        Relationships: []
      }
      shared_quiz_answers: {
        Row: {
          answered_at: string
          choice: number
          idx: number
          is_correct: boolean
          quiz_id: string
          user_id: string
        }
        Insert: {
          answered_at?: string
          choice: number
          idx: number
          is_correct: boolean
          quiz_id: string
          user_id: string
        }
        Update: {
          answered_at?: string
          choice?: number
          idx?: number
          is_correct?: boolean
          quiz_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_quiz_answers_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "shared_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_quiz_players: {
        Row: {
          answered: number
          completed_at: string | null
          correct: number
          points: number
          quiz_id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          answered?: number
          completed_at?: string | null
          correct?: number
          points?: number
          quiz_id: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          answered?: number
          completed_at?: string | null
          correct?: number
          points?: number
          quiz_id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_quiz_players_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "shared_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_quizzes: {
        Row: {
          created_at: string
          credited: boolean
          expires_at: string
          group_id: string
          id: string
          inviter_id: string
          minutes: number
          questions: Json
          title: string
        }
        Insert: {
          created_at?: string
          credited?: boolean
          expires_at?: string
          group_id: string
          id?: string
          inviter_id: string
          minutes?: number
          questions: Json
          title: string
        }
        Update: {
          created_at?: string
          credited?: boolean
          expires_at?: string
          group_id?: string
          id?: string
          inviter_id?: string
          minutes?: number
          questions?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_quizzes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "streak_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_groups: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          last_completed_day: string | null
          name: string
          streak_count: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          last_completed_day?: string | null
          name: string
          streak_count?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          last_completed_day?: string | null
          name?: string
          streak_count?: number
        }
        Relationships: []
      }
      streak_members: {
        Row: {
          accepted: boolean
          group_id: string
          user_id: string
        }
        Insert: {
          accepted?: boolean
          group_id: string
          user_id: string
        }
        Update: {
          accepted?: boolean
          group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "streak_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_messages: {
        Row: {
          body: string
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          group_id: string
          id?: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "streak_groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_streak_group: { Args: { g: string }; Returns: undefined }
      answer_streak_quiz: {
        Args: { choice: number; i: number; qid: string }
        Returns: Json
      }
      claim_legacy_profile: { Args: never; Returns: boolean }
      create_streak_group: {
        Args: { label: string; members: string[] }
        Returns: string
      }
      finish_streak_quiz: {
        Args: { answers: Json; qid: string }
        Returns: Json
      }
      invite_streak_quiz: {
        Args: { duration: number; g: string; label: string; qs: Json }
        Returns: string
      }
      is_streak_member: { Args: { g: string }; Returns: boolean }
      review_streak_quiz: { Args: { qid: string }; Returns: Json }
      start_streak_quiz: { Args: { qid: string }; Returns: Json }
      streak_directory: {
        Args: { term: string }
        Returns: {
          id: string
          lumi_id: string
          nick: string
        }[]
      }
      streak_member_names: {
        Args: { g: string }
        Returns: {
          id: string
          lumi_id: string
          nick: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
