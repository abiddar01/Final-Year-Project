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
      advisor_leads: {
        Row: {
          answers: Json
          budget_range: string | null
          car_type: string | null
          contact_method: string | null
          contact_value: string | null
          created_at: string
          fuel_type: string | null
          id: string
          name: string | null
          passengers: string | null
          session_id: string
          status: string
          timeline: string | null
          transcript: Json
        }
        Insert: {
          answers?: Json
          budget_range?: string | null
          car_type?: string | null
          contact_method?: string | null
          contact_value?: string | null
          created_at?: string
          fuel_type?: string | null
          id?: string
          name?: string | null
          passengers?: string | null
          session_id: string
          status?: string
          timeline?: string | null
          transcript?: Json
        }
        Update: {
          answers?: Json
          budget_range?: string | null
          car_type?: string | null
          contact_method?: string | null
          contact_value?: string | null
          created_at?: string
          fuel_type?: string | null
          id?: string
          name?: string | null
          passengers?: string | null
          session_id?: string
          status?: string
          timeline?: string | null
          transcript?: Json
        }
        Relationships: []
      }
      cars: {
        Row: {
          acceleration: number | null
          allowed_incentives: string[]
          availability_type: string
          body_type: string | null
          boot_capacity: number | null
          brand: string
          category: string
          comfort_features: string[]
          created_at: string
          description: string | null
          driver_assistance_features: string[]
          drivetrain: string | null
          engine_size: number | null
          engine_type: string | null
          estimated_import_days: number | null
          features: string[] | null
          fuel_tank_capacity: number | null
          fuel_type: string
          ground_clearance_mm: number | null
          height_mm: number | null
          horsepower: number | null
          id: string
          ideal_price_pkr: number | null
          image_url: string | null
          infotainment_features: string[]
          is_featured: boolean | null
          length_mm: number | null
          max_discount_percent: number
          max_negotiation_rounds: number
          mileage_kmpl: number | null
          min_price_pkr: number | null
          model: string
          name: string
          negotiation_enabled: boolean
          negotiation_strategy: string
          price: number
          safety_features: string[]
          seats: number | null
          target_price_pkr: number | null
          top_speed: number | null
          torque: number | null
          transmission: string
          updated_at: string
          variant: string | null
          wheelbase_mm: number | null
          width_mm: number | null
          year: number
        }
        Insert: {
          acceleration?: number | null
          allowed_incentives?: string[]
          availability_type?: string
          body_type?: string | null
          boot_capacity?: number | null
          brand: string
          category?: string
          comfort_features?: string[]
          created_at?: string
          description?: string | null
          driver_assistance_features?: string[]
          drivetrain?: string | null
          engine_size?: number | null
          engine_type?: string | null
          estimated_import_days?: number | null
          features?: string[] | null
          fuel_tank_capacity?: number | null
          fuel_type?: string
          ground_clearance_mm?: number | null
          height_mm?: number | null
          horsepower?: number | null
          id?: string
          ideal_price_pkr?: number | null
          image_url?: string | null
          infotainment_features?: string[]
          is_featured?: boolean | null
          length_mm?: number | null
          max_discount_percent?: number
          max_negotiation_rounds?: number
          mileage_kmpl?: number | null
          min_price_pkr?: number | null
          model: string
          name: string
          negotiation_enabled?: boolean
          negotiation_strategy?: string
          price: number
          safety_features?: string[]
          seats?: number | null
          target_price_pkr?: number | null
          top_speed?: number | null
          torque?: number | null
          transmission?: string
          updated_at?: string
          variant?: string | null
          wheelbase_mm?: number | null
          width_mm?: number | null
          year: number
        }
        Update: {
          acceleration?: number | null
          allowed_incentives?: string[]
          availability_type?: string
          body_type?: string | null
          boot_capacity?: number | null
          brand?: string
          category?: string
          comfort_features?: string[]
          created_at?: string
          description?: string | null
          driver_assistance_features?: string[]
          drivetrain?: string | null
          engine_size?: number | null
          engine_type?: string | null
          estimated_import_days?: number | null
          features?: string[] | null
          fuel_tank_capacity?: number | null
          fuel_type?: string
          ground_clearance_mm?: number | null
          height_mm?: number | null
          horsepower?: number | null
          id?: string
          ideal_price_pkr?: number | null
          image_url?: string | null
          infotainment_features?: string[]
          is_featured?: boolean | null
          length_mm?: number | null
          max_discount_percent?: number
          max_negotiation_rounds?: number
          mileage_kmpl?: number | null
          min_price_pkr?: number | null
          model?: string
          name?: string
          negotiation_enabled?: boolean
          negotiation_strategy?: string
          price?: number
          safety_features?: string[]
          seats?: number | null
          target_price_pkr?: number | null
          top_speed?: number | null
          torque?: number | null
          transmission?: string
          updated_at?: string
          variant?: string | null
          wheelbase_mm?: number | null
          width_mm?: number | null
          year?: number
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
          phone: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          message: string
          phone?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      import_requests: {
        Row: {
          car_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string | null
          status: string
        }
        Insert: {
          car_id: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          car_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_requests_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiation_sessions: {
        Row: {
          agreed_price: number | null
          car_id: string | null
          car_name: string
          counter_offer: number | null
          created_at: string
          customer_offer: number | null
          id: string
          listed_price: number
          max_rounds: number
          rounds_used: number
          session_id: string
          status: string
          transcript: Json
          updated_at: string
        }
        Insert: {
          agreed_price?: number | null
          car_id?: string | null
          car_name: string
          counter_offer?: number | null
          created_at?: string
          customer_offer?: number | null
          id?: string
          listed_price?: number
          max_rounds?: number
          rounds_used?: number
          session_id: string
          status?: string
          transcript?: Json
          updated_at?: string
        }
        Update: {
          agreed_price?: number | null
          car_id?: string | null
          car_name?: string
          counter_offer?: number | null
          created_at?: string
          customer_offer?: number | null
          id?: string
          listed_price?: number
          max_rounds?: number
          rounds_used?: number
          session_id?: string
          status?: string
          transcript?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiation_sessions_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          booking_id: string
          id: string
          message: string
          recipient: string
          sent_at: string
          sent_by: string | null
          status: string
          subject: string
          type: string
        }
        Insert: {
          booking_id: string
          id?: string
          message: string
          recipient: string
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject: string
          type?: string
        }
        Update: {
          booking_id?: string
          id?: string
          message?: string
          recipient?: string
          sent_at?: string
          sent_by?: string | null
          status?: string
          subject?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "test_drive_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      test_drive_bookings: {
        Row: {
          car_id: string
          cnic: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string | null
          preferred_date: string
          preferred_time: string
          rejection_reason: string | null
          status: string
        }
        Insert: {
          car_id: string
          cnic?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone?: string | null
          preferred_date: string
          preferred_time: string
          rejection_reason?: string | null
          status?: string
        }
        Update: {
          car_id?: string
          cnic?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string | null
          preferred_date?: string
          preferred_time?: string
          rejection_reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_drive_bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          brand_preference: string | null
          budget_range: string | null
          city_highway: string | null
          created_at: string
          driving_style: string | null
          family_size: number | null
          fuel_preference: string | null
          id: string
          lifestyle: string | null
          luxury_importance: string | null
          priority: string | null
          recommendations: Json | null
          session_id: string
          tech_importance: string | null
        }
        Insert: {
          brand_preference?: string | null
          budget_range?: string | null
          city_highway?: string | null
          created_at?: string
          driving_style?: string | null
          family_size?: number | null
          fuel_preference?: string | null
          id?: string
          lifestyle?: string | null
          luxury_importance?: string | null
          priority?: string | null
          recommendations?: Json | null
          session_id: string
          tech_importance?: string | null
        }
        Update: {
          brand_preference?: string | null
          budget_range?: string | null
          city_highway?: string | null
          created_at?: string
          driving_style?: string | null
          family_size?: number | null
          fuel_preference?: string | null
          id?: string
          lifestyle?: string | null
          luxury_importance?: string | null
          priority?: string | null
          recommendations?: Json | null
          session_id?: string
          tech_importance?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
