export interface Car {
  id: string;
  name: string;
  brand: string;
  model: string;
  variant: string | null;
  year: number;
  price: number;
  category: string;
  body_type: string | null;
  fuel_type: string;
  transmission: string;
  drivetrain: string | null;
  engine_type: string | null;
  horsepower: number | null;
  torque: number | null;
  top_speed: number | null;
  acceleration: number | null;
  seats: number | null;
  engine_size: number | null;
  fuel_tank_capacity: number | null;
  mileage_kmpl: number | null;
  boot_capacity: number | null;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  wheelbase_mm: number | null;
  ground_clearance_mm: number | null;
  description: string | null;
  features: string[];
  safety_features: string[];
  infotainment_features: string[];
  driver_assistance_features: string[];
  comfort_features: string[];
  image_url: string | null;
  is_featured: boolean;
  availability_type: string;
  estimated_import_days: number | null;
  negotiation_enabled?: boolean;
  ideal_price_pkr?: number | null;
  target_price_pkr?: number | null;
  min_price_pkr?: number | null;
  max_discount_percent?: number | null;
  max_negotiation_rounds?: number | null;
  negotiation_strategy?: string | null;
  allowed_incentives?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface QuizAnswer {
  lifestyle: string;
  budget_range: string;
  priority: string;
  family_size: number;
  driving_style: string;
  fuel_preference: string;
  city_highway: string;
  luxury_importance: string;
  tech_importance: string;
  [key: string]: string | number;
}

export type FilterState = {
  category: string;
  brand: string;
  fuel_type: string;
  transmission: string;
  priceRange: [number, number];
  sortBy: string;
  engineRange: string;
  availability: string;
};
