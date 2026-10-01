export type UserRole = 'designer' | 'client' | 'admin';

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
  has_store?: boolean;
  store_name?: string | null;
  gender_focus?: 'male' | 'female' | 'unisex' | null;
  is_verified?: boolean;
  is_featured?: boolean;
  created_at: string;
  // Joined from profiles
  profiles?: Profile;
  portfolio_items?: PortfolioItem[];
  reviews?: Review[];
  store_products?: StoreProduct[];
  avg_rating?: number;
  review_count?: number;
}

export const GENDER_FOCUS_OPTIONS = [
  { id: 'all', label: 'All Designers', tag: 'All Fashion', icon: '✦' },
  { id: 'male', label: "Men's Fashion", tag: "Men's Wear", icon: '♂' },
  { id: 'female', label: "Women's Fashion", tag: "Women's Wear", icon: '♀' },
  { id: 'unisex', label: 'Unisex & Mixed', tag: 'Men & Women', icon: '⚧' },
] as const;

export function getDesignerGender(designer: {
  gender_focus?: 'male' | 'female' | 'unisex' | null;
  categories?: string[];
  business_name?: string;
}): 'male' | 'female' | 'unisex' {
  if (designer.gender_focus) return designer.gender_focus;

  const cats = designer.categories || [];
  const name = (designer.business_name || '').toLowerCase();

  // Known top Nigerian brands
  if (name.includes('kola kuddus') || name.includes('seyi vodi') || name.includes('vodi')) {
    return 'male';
  }
  if (name.includes('veekee') || name.includes('deola sagoe') || name.includes('sagoe')) {
    return 'female';
  }
  if (name.includes('atafo') || name.includes('bankole')) {
    return 'unisex';
  }

  // Deduce by garment categories
  const hasMale = cats.some((c) => ['agbada', 'senator', 'corporate'].includes(c));
  const hasFemale = cats.some((c) => ['aso_ebi', 'bridal'].includes(c));

  if (hasMale && hasFemale) return 'unisex';
  if (hasMale) return 'male';
  if (hasFemale) return 'female';
  return 'unisex';
}

export interface StoreProduct {
  id: string;
  designer_id: string;
  title: string;
  description?: string | null;
  price: number;
  image_url: string;
  category: string;
  sizes?: string[] | null;
  in_stock: boolean;
  created_at: string;
  designer?: DesignerProfile;
}

export const STORE_CATEGORIES = [
  { id: 'all', label: 'All Products' },
  { id: 'ready_to_wear', label: 'Ready-to-Wear (RTW)' },
  { id: 'agbada_senator', label: 'Agbada & Senator Suits' },
  { id: 'aso_ebi_dresses', label: 'Aso Ebi & Gowns' },
  { id: 'fabrics', label: 'Fabrics & Aso-Oke' },
  { id: 'accessories', label: 'Fila Caps & Accessories' },
] as const;

export interface Review {
  id: string;
  designer_id: string;
  client_id: string;
  request_id?: string | null;
  rating: number; // 1 to 5
  comment: string | null;
  created_at: string;
  client?: Profile;
  designer?: DesignerProfile | { business_name?: string };
}

export interface PortfolioItem {
  id: string;
  designer_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  caption: string | null;
  category?: string | null;
  rating?: number | null;
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

export const PORTFOLIO_STYLE_CATEGORIES = [
  { id: 'all', label: 'All Styles' },
  { id: 'agbada', label: 'Agbada & Senegalese' },
  { id: 'aso_ebi', label: 'Aso Ebi & Owambe' },
  { id: 'senator', label: 'Senator & Kaftan' },
  { id: 'ankara', label: 'Ankara Prints' },
  { id: 'adire', label: 'Adire & Heritage' },
  { id: 'bridal', label: 'Bridal & Traditional' },
  { id: 'ready_to_wear', label: 'Ready-to-Wear (RTW)' },
  { id: 'casual', label: 'Contemporary / Casual' },
] as const;

