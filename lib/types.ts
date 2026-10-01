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
  state: string;
  city: string;
  area: string;
  categories: string[];
  whatsapp: string | null;
  created_at: string;
  // Joined from profiles
  profiles?: Profile;
  portfolio_items?: PortfolioItem[];
  reviews?: Review[];
  avg_rating?: number;
  review_count?: number;
}

export interface Review {
  id: string;
  designer_id: string;
  client_id: string;
  request_id?: string | null;
  rating: number; // 1 to 5
  comment: string | null;
  created_at: string;
  client?: Profile;
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

// All 36 Nigerian States + FCT Abuja
export const NIGERIAN_STATES = [
  'Lagos',
  'Abuja (FCT)',
  'Rivers (Port Harcourt)',
  'Oyo (Ibadan)',
  'Kano',
  'Enugu',
  'Anambra',
  'Delta',
  'Edo',
  'Kwara',
  'Ogun',
  'Kaduna',
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Ebonyi',
  'Ekiti',
  'Gombe',
  'Imo',
  'Jigawa',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Nasarawa',
  'Niger',
  'Ondo',
  'Osun',
  'Plateau',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara'
] as const;

// Common areas / cities mapped by top fashion hub states
export const STATE_AREAS: Record<string, string[]> = {
  'Lagos': [
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
    'Ikorodu',
    'Alaba',
    'Other (Lagos)'
  ],
  'Abuja (FCT)': [
    'Wuse II',
    'Maitama',
    'Garki',
    'Jabi',
    'Utako',
    'Gwarinpa',
    'Asokoro',
    'Apo',
    'Central Area',
    'Kubwa',
    'Lugbe',
    'Other (Abuja)'
  ],
  'Rivers (Port Harcourt)': [
    'GRA Phase 1 & 2',
    'Old GRA',
    'D-Line',
    'Peter Odili Road',
    'Trans-Amadi',
    'Rumuokoro',
    'Woji',
    'Ada George',
    'Other (Rivers)'
  ],
  'Oyo (Ibadan)': [
    'Bodija',
    'Ring Road',
    'Jericho',
    'Dugbe',
    'UI / Samonda',
    'Oluyole',
    'Challenge',
    'Iyaganku',
    'Other (Oyo)'
  ],
  'Kano': [
    'Nassarawa GRA',
    'Bompai',
    'Fagge',
    'Sabon Gari',
    'Tarauni',
    'Kano City Center',
    'Other (Kano)'
  ],
  'Enugu': [
    'Independence Layout',
    'New Haven',
    'GRA Enugu',
    'Achara Layout',
    'Ogui',
    'Abakpa',
    'Other (Enugu)'
  ],
  'Anambra': [
    'Awka GRA',
    'Onitsha Main',
    'Nnewi',
    'Fegge',
    'Other (Anambra)'
  ],
  'Delta': [
    'Asaba GRA',
    'Warri GRA',
    'Effurun',
    'Okpanam',
    'Other (Delta)'
  ],
  'Edo': [
    'GRA Benin',
    'Airport Road',
    'Uselu',
    'Sapele Road',
    'Other (Edo)'
  ],
  'Kwara': [
    'GRA Ilorin',
    'Fate Road',
    'Tanke',
    'Adewole',
    'Taiwo Road',
    'Other (Kwara)'
  ],
  'Ogun': [
    'Abeokuta GRA',
    'Ijebu Ode',
    'Sagamu',
    'Mowe / Ibafo',
    'Ota',
    'Other (Ogun)'
  ],
  'Kaduna': [
    'Barnawa',
    'Malali',
    'Kaduna GRA',
    'Sabon Tasha',
    'Other (Kaduna)'
  ]
};

export const LAGOS_AREAS = STATE_AREAS['Lagos'];

export const FASHION_CATEGORIES = [
  { id: 'ankara', label: 'Ankara Styles' },
  { id: 'aso_ebi', label: 'Aso Ebi & Owambe' },
  { id: 'native_wear', label: 'Traditional & Native Wear' },
  { id: 'agbada', label: 'Agbada & Senegalese' },
  { id: 'corporate', label: 'Corporate & Suits' },
  { id: 'bridal', label: 'Bridal & Wedding' },
  { id: 'casual', label: 'Casual & Contemporary' },
  { id: 'ready_to_wear', label: 'Ready-to-Wear (RTW)' },
  { id: 'children_wear', label: 'Children Fashion' },
] as const;
