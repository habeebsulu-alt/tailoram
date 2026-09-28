export type UserRole = 'designer' | 'client';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  created_at: string;
}

export interface DesignerProfile {
  id: string;
  user_id: string;
  business_name: string;
  bio: string | null;
  city: string;
  area: string;
  categories: string[];
  whatsapp: string | null;
  created_at: string;
  // Joined from profiles
  profiles?: Profile;
  portfolio_items?: PortfolioItem[];
}

export interface PortfolioItem {
  id: string;
  designer_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  created_at: string;
}

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'completed';

export interface OutfitRequest {
  id: string;
  client_id: string;
  designer_id: string;
  style_description: string;
  fabric: string | null;
  budget_min: number;
  budget_max: number | null;
  deadline: string | null;
  reference_image_url: string | null;
  status: RequestStatus;
  created_at: string;
  // Joined relations
  designer?: DesignerProfile;
  client?: Profile;
}

export interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  // Joined
  sender?: Profile;
}

export interface AnalyticsEvent {
  id?: string;
  event_type: 'search' | 'profile_view' | 'request_sent' | 'request_status_change';
  user_id?: string | null;
  designer_id?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
}

export const LAGOS_AREAS = [
  'Ikeja',
  'Lekki',
  'Victoria Island',
  'Yaba',
  'Surulere',
  'Ikoyi',
  'Ajah',
  'Magodo',
  'Maryland',
  'Gbagada',
  'Festac',
  'Ogba',
  'Alaba',
  'Ikorodu',
  'Other (Lagos)'
] as const;

export const FASHION_CATEGORIES = [
  { id: 'ankara', label: 'Ankara Styles' },
  { id: 'aso_ebi', label: 'Aso Ebi & Owambe' },
  { id: 'native_wear', label: 'Traditional & Native Wear' },
  { id: 'agbada', label: 'Agbada & Senegalese' },
  { id: 'corporate', label: 'Corporate & Suits' },
  { id: 'bridal', label: 'Bridal & Wedding' },
  { id: 'casual', label: 'Casual & Contemporary' },
  { id: 'ready_to_wear', label: 'Ready-to-Wear (RTW)' },
] as const;
