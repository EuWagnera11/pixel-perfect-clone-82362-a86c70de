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
      cloth_swap_logs: {
        Row: {
          category: string | null
          created_at: string
          garment_image_hash: string | null
          generation_id: string | null
          id: string
          person_image_hash: string | null
          report_reason: string | null
          reported: boolean
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          garment_image_hash?: string | null
          generation_id?: string | null
          id?: string
          person_image_hash?: string | null
          report_reason?: string | null
          reported?: boolean
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          garment_image_hash?: string | null
          generation_id?: string | null
          id?: string
          person_image_hash?: string | null
          report_reason?: string | null
          reported?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloth_swap_logs_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "imageedit_generations"
            referencedColumns: ["generation_id"]
          },
        ]
      }
      face_swap_logs: {
        Row: {
          created_at: string
          generation_id: string | null
          id: string
          report_reason: string | null
          reported: boolean
          source_face_hash: string | null
          target_image_hash: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          generation_id?: string | null
          id?: string
          report_reason?: string | null
          reported?: boolean
          source_face_hash?: string | null
          target_image_hash?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          generation_id?: string | null
          id?: string
          report_reason?: string | null
          reported?: boolean
          source_face_hash?: string | null
          target_image_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "face_swap_logs_generation_id_fkey"
            columns: ["generation_id"]
            isOneToOne: false
            referencedRelation: "imageedit_generations"
            referencedColumns: ["generation_id"]
          },
        ]
      }
      generations: {
        Row: {
          aspect_ratio: string | null
          completed_at: string | null
          created_at: string
          credits_used: number
          envelope_version: string | null
          error_message: string | null
          final_prompt: string | null
          freepik_endpoint: string | null
          id: string
          image_urls: string[] | null
          media_type: string | null
          metadata: Json | null
          model: string | null
          num_variations: number | null
          op: string | null
          parent_id: string | null
          persona_id: string | null
          project_id: string | null
          prompt: string | null
          raw_prompt: string | null
          refs: Json | null
          resolution: string | null
          status: Database["public"]["Enums"]["generation_status"]
          template_id: string | null
          tool: string | null
          user_id: string
          video_urls: string[] | null
        }
        Insert: {
          aspect_ratio?: string | null
          completed_at?: string | null
          created_at?: string
          credits_used?: number
          envelope_version?: string | null
          error_message?: string | null
          final_prompt?: string | null
          freepik_endpoint?: string | null
          id?: string
          image_urls?: string[] | null
          media_type?: string | null
          metadata?: Json | null
          model?: string | null
          num_variations?: number | null
          op?: string | null
          parent_id?: string | null
          persona_id?: string | null
          project_id?: string | null
          prompt?: string | null
          raw_prompt?: string | null
          refs?: Json | null
          resolution?: string | null
          status?: Database["public"]["Enums"]["generation_status"]
          template_id?: string | null
          tool?: string | null
          user_id: string
          video_urls?: string[] | null
        }
        Update: {
          aspect_ratio?: string | null
          completed_at?: string | null
          created_at?: string
          credits_used?: number
          envelope_version?: string | null
          error_message?: string | null
          final_prompt?: string | null
          freepik_endpoint?: string | null
          id?: string
          image_urls?: string[] | null
          media_type?: string | null
          metadata?: Json | null
          model?: string | null
          num_variations?: number | null
          op?: string | null
          parent_id?: string | null
          persona_id?: string | null
          project_id?: string | null
          prompt?: string | null
          raw_prompt?: string | null
          refs?: Json | null
          resolution?: string | null
          status?: Database["public"]["Enums"]["generation_status"]
          template_id?: string | null
          tool?: string | null
          user_id?: string
          video_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "generations_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      imageedit_generations: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          generation_id: string
          input_urls: Json | null
          metadata: Json | null
          model: string
          output_url: string | null
          status: string
          task_id: string | null
          tool: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          generation_id?: string
          input_urls?: Json | null
          metadata?: Json | null
          model: string
          output_url?: string | null
          status?: string
          task_id?: string | null
          tool: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          generation_id?: string
          input_urls?: Json | null
          metadata?: Json | null
          model?: string
          output_url?: string | null
          status?: string
          task_id?: string | null
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
      personas: {
        Row: {
          attributes: Json | null
          canonical_grid_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          reference_image_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attributes?: Json | null
          canonical_grid_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          reference_image_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attributes?: Json | null
          canonical_grid_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          reference_image_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          full_name: string | null
          id: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          full_name?: string | null
          id: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          full_name?: string | null
          id?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      proxy_logs: {
        Row: {
          attempted_url: string | null
          created_at: string
          duration_ms: number | null
          endpoint_key: string | null
          generation_id: string | null
          id: string
          request_body: Json | null
          response_body: Json | null
          response_status: number | null
          user_id: string | null
        }
        Insert: {
          attempted_url?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint_key?: string | null
          generation_id?: string | null
          id?: string
          request_body?: Json | null
          response_body?: Json | null
          response_status?: number | null
          user_id?: string | null
        }
        Update: {
          attempted_url?: string | null
          created_at?: string
          duration_ms?: number | null
          endpoint_key?: string | null
          generation_id?: string | null
          id?: string
          request_body?: Json | null
          response_body?: Json | null
          response_status?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean
          name: string
          preview_url: string | null
          prompt: string | null
          rating: number | null
          uses_count: number
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          preview_url?: string | null
          prompt?: string | null
          rating?: number | null
          uses_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          preview_url?: string | null
          prompt?: string | null
          rating?: number | null
          uses_count?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tos_accepts: {
        Row: {
          accepted_at: string
          feature: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          feature: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          feature?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "creator" | "agency"
      generation_status:
        | "queued"
        | "processing"
        | "enhancing"
        | "upscaling"
        | "completed"
        | "failed"
      subscription_tier: "free" | "starter" | "pro" | "agency" | "enterprise"
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
      app_role: ["admin", "creator", "agency"],
      generation_status: [
        "queued",
        "processing",
        "enhancing",
        "upscaling",
        "completed",
        "failed",
      ],
      subscription_tier: ["free", "starter", "pro", "agency", "enterprise"],
    },
  },
} as const
