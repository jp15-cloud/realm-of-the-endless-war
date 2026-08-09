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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      clans: {
        Row: {
          created_at: string
          id: string
          leader_id: string
          name: string
          renown: number
          tag: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          leader_id: string
          name: string
          renown?: number
          tag: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          leader_id?: string
          name?: string
          renown?: number
          tag?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bloodwood: number
          character_name: string
          clan: string | null
          clan_id: string | null
          class: string
          created_at: string
          deaths: number
          experience: number
          faction: string
          gold: number
          hp: number
          id: string
          kills: number
          level: number
          max_hp: number
          online_at: string
          ore: number
          pos_x: number
          pos_y: number
          relics: number
          renown: number
          updated_at: string
        }
        Insert: {
          bloodwood?: number
          character_name?: string
          clan?: string | null
          clan_id?: string | null
          class?: string
          created_at?: string
          deaths?: number
          experience?: number
          faction?: string
          gold?: number
          hp?: number
          id: string
          kills?: number
          level?: number
          max_hp?: number
          online_at?: string
          ore?: number
          pos_x?: number
          pos_y?: number
          relics?: number
          renown?: number
          updated_at?: string
        }
        Update: {
          bloodwood?: number
          character_name?: string
          clan?: string | null
          clan_id?: string | null
          class?: string
          created_at?: string
          deaths?: number
          experience?: number
          faction?: string
          gold?: number
          hp?: number
          id?: string
          kills?: number
          level?: number
          max_hp?: number
          online_at?: string
          ore?: number
          pos_x?: number
          pos_y?: number
          relics?: number
          renown?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_nodes: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          max_amount: number
          respawn_at: string | null
          updated_at: string
          x: number
          y: number
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          kind: string
          max_amount?: number
          respawn_at?: string | null
          updated_at?: string
          x: number
          y: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          max_amount?: number
          respawn_at?: string | null
          updated_at?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      territories: {
        Row: {
          captured_at: string | null
          created_at: string
          id: string
          name: string
          owner_clan_id: string | null
          radius: number
          updated_at: string
          x: number
          y: number
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          id?: string
          name: string
          owner_clan_id?: string | null
          radius?: number
          updated_at?: string
          x: number
          y: number
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_clan_id?: string | null
          radius?: number
          updated_at?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "territories_owner_clan_id_fkey"
            columns: ["owner_clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attack_player: { Args: { _target_id: string }; Returns: Json }
      capture_territory: { Args: { _territory_id: string }; Returns: Json }
      create_clan: { Args: { _name: string; _tag: string }; Returns: string }
      harvest_node: { Args: { _node_id: string }; Returns: Json }
      heal_tick: { Args: never; Returns: number }
      join_clan: { Args: { _clan_id: string }; Returns: undefined }
      respawn_nodes: { Args: never; Returns: undefined }
      slay_mob: { Args: { _mob_level: number }; Returns: Json }
      take_damage: { Args: { _amount: number }; Returns: Json }
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
