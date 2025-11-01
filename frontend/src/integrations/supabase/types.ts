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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      creator_profiles: {
        Row: {
          allow_flip: boolean
          created_at: string
          delay_mode: Database["public"]["Enums"]["delay_mode"]
          id: string
          is_active: boolean
          metricool_brand_id: string | null
          name: string
          safe_hours_end: string
          safe_hours_start: string
          seed: Database["public"]["Enums"]["seed_type"]
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_flip?: boolean
          created_at?: string
          delay_mode?: Database["public"]["Enums"]["delay_mode"]
          id?: string
          is_active?: boolean
          metricool_brand_id?: string | null
          name: string
          safe_hours_end?: string
          safe_hours_start?: string
          seed?: Database["public"]["Enums"]["seed_type"]
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_flip?: boolean
          created_at?: string
          delay_mode?: Database["public"]["Enums"]["delay_mode"]
          id?: string
          is_active?: boolean
          metricool_brand_id?: string | null
          name?: string
          safe_hours_end?: string
          safe_hours_start?: string
          seed?: Database["public"]["Enums"]["seed_type"]
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_clips: {
        Row: {
          clip_index: number
          clip_url: string
          created_at: string
          duration: number | null
          id: string
          metadata: Json | null
          session_id: string
          thumbnail_url: string | null
          user_id: string | null
        }
        Insert: {
          clip_index: number
          clip_url: string
          created_at?: string
          duration?: number | null
          id?: string
          metadata?: Json | null
          session_id: string
          thumbnail_url?: string | null
          user_id?: string | null
        }
        Update: {
          clip_index?: number
          clip_url?: string
          created_at?: string
          duration?: number | null
          id?: string
          metadata?: Json | null
          session_id?: string
          thumbnail_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_clips_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "video_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          created_at: string | null
          default_creator_profile_id: string | null
          default_delay_mode: Database["public"]["Enums"]["delay_mode"] | null
          default_seed: Database["public"]["Enums"]["seed_type"] | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tags: string[] | null
          total_clips: number | null
          total_videos: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          default_creator_profile_id?: string | null
          default_delay_mode?: Database["public"]["Enums"]["delay_mode"] | null
          default_seed?: Database["public"]["Enums"]["seed_type"] | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tags?: string[] | null
          total_clips?: number | null
          total_videos?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          default_creator_profile_id?: string | null
          default_delay_mode?: Database["public"]["Enums"]["delay_mode"] | null
          default_seed?: Database["public"]["Enums"]["seed_type"] | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tags?: string[] | null
          total_clips?: number | null
          total_videos?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_default_creator_profile_id_fkey"
            columns: ["default_creator_profile_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_sessions: {
        Row: {
          ambient_noise: boolean | null
          amplitude: number | null
          audio_mode: string | null
          audio_scope: string | null
          audio_seed: string | null
          audio_unique: boolean | null
          camera_dolly: boolean | null
          camera_pan: boolean | null
          camera_rotate: boolean | null
          camera_shake: boolean | null
          camera_tilt: boolean | null
          camera_zoom: boolean | null
          camera_zoom_duration: number | null
          clip_indicator: string | null
          completed_at: string | null
          created_at: string | null
          custom_filter_css: string | null
          custom_filter_name: string | null
          custom_overlay_config: Json | null
          custom_overlay_name: string | null
          cut_end: number | null
          cut_start: number | null
          delay_mode: string | null
          description: string | null
          duration: number | null
          filename: string | null
          filesize: number | null
          filter_intensity: number | null
          filter_type: string | null
          horizontal_flip: boolean | null
          id: string
          indicator_bg_color: string | null
          indicator_opacity: number | null
          indicator_position: string | null
          indicator_size: number | null
          indicator_style: string | null
          indicator_text_color: string | null
          job_id: string | null
          keywords: string | null
          manual_clips: Json | null
          overlay_intensity: number | null
          overlay_type: string | null
          project_id: string | null
          seed: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          upload_id: string
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          ambient_noise?: boolean | null
          amplitude?: number | null
          audio_mode?: string | null
          audio_scope?: string | null
          audio_seed?: string | null
          audio_unique?: boolean | null
          camera_dolly?: boolean | null
          camera_pan?: boolean | null
          camera_rotate?: boolean | null
          camera_shake?: boolean | null
          camera_tilt?: boolean | null
          camera_zoom?: boolean | null
          camera_zoom_duration?: number | null
          clip_indicator?: string | null
          completed_at?: string | null
          created_at?: string | null
          custom_filter_css?: string | null
          custom_filter_name?: string | null
          custom_overlay_config?: Json | null
          custom_overlay_name?: string | null
          cut_end?: number | null
          cut_start?: number | null
          delay_mode?: string | null
          description?: string | null
          duration?: number | null
          filename?: string | null
          filesize?: number | null
          filter_intensity?: number | null
          filter_type?: string | null
          horizontal_flip?: boolean | null
          id?: string
          indicator_bg_color?: string | null
          indicator_opacity?: number | null
          indicator_position?: string | null
          indicator_size?: number | null
          indicator_style?: string | null
          indicator_text_color?: string | null
          job_id?: string | null
          keywords?: string | null
          manual_clips?: Json | null
          overlay_intensity?: number | null
          overlay_type?: string | null
          project_id?: string | null
          seed?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          upload_id: string
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          ambient_noise?: boolean | null
          amplitude?: number | null
          audio_mode?: string | null
          audio_scope?: string | null
          audio_seed?: string | null
          audio_unique?: boolean | null
          camera_dolly?: boolean | null
          camera_pan?: boolean | null
          camera_rotate?: boolean | null
          camera_shake?: boolean | null
          camera_tilt?: boolean | null
          camera_zoom?: boolean | null
          camera_zoom_duration?: number | null
          clip_indicator?: string | null
          completed_at?: string | null
          created_at?: string | null
          custom_filter_css?: string | null
          custom_filter_name?: string | null
          custom_overlay_config?: Json | null
          custom_overlay_name?: string | null
          cut_end?: number | null
          cut_start?: number | null
          delay_mode?: string | null
          description?: string | null
          duration?: number | null
          filename?: string | null
          filesize?: number | null
          filter_intensity?: number | null
          filter_type?: string | null
          horizontal_flip?: boolean | null
          id?: string
          indicator_bg_color?: string | null
          indicator_opacity?: number | null
          indicator_position?: string | null
          indicator_size?: number | null
          indicator_style?: string | null
          indicator_text_color?: string | null
          job_id?: string | null
          keywords?: string | null
          manual_clips?: Json | null
          overlay_intensity?: number | null
          overlay_type?: string | null
          project_id?: string | null
          seed?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          upload_id?: string
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      delay_mode: "HYPE" | "FAST" | "NATURAL" | "PRO"
      seed_type:
        | "natural"
        | "viral"
        | "cinematica"
        | "humor"
        | "impacto"
        | "no_flip_texto"
        | "mirror_safe"
        | "creator_id"
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
      delay_mode: ["HYPE", "FAST", "NATURAL", "PRO"],
      seed_type: [
        "natural",
        "viral",
        "cinematica",
        "humor",
        "impacto",
        "no_flip_texto",
        "mirror_safe",
        "creator_id",
      ],
    },
  },
} as const
