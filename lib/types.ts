export type UserRole = 'designer' | 'client' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  profile_image_url?: string | null;
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
  profile_image_url?: string | null;
  cover_image_id?: string | null;
  cover_image_url?: string | null;
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
  id?: string;
  gender_focus?: 'male' | 'female' | 'unisex' | null;
  categories?: string[];
  business_name?: string;
}): 'male' | 'female' | 'unisex' {
  if (designer.gender_focus) return designer.gender_focus;

  if (designer.id && typeof window !== 'undefined') {
    const local = localStorage.getItem(`tailoram_gender_${designer.id}`) || localStorage.getItem(`tailoram_gender_focus_${designer.id}`);
    if (local === 'male' || local === 'female' || local === 'unisex') return local;
  }

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
  reviewer_id?: string | null;
  reviewee_id?: string | null;
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

export type RequestStatus =
  | 'pending'
  | 'quoted'
  | 'accepted'
  | 'declined'
  | 'deposit_paid'
  | 'in_progress'
  | 'ready_for_balance'
  | 'completed'
  | 'cancelled';

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
  // Quote and payment fields
  quoted_price?: number | null;
  quote_deadline?: string | null;
  deposit_amount?: number | null;
  deposit_paid_at?: string | null;
  balance_amount?: number | null;
  balance_paid_at?: string | null;
  measurements?: ClientMeasurements | Record<string, any> | null;
  created_at: string;
  // Joined relations
  designer?: DesignerProfile;
  client?: Profile;
}

export interface ClientMeasurements {
  chest?: string;
  shoulder?: string;
  sleeve?: string;
  neck?: string;
  waist?: string;
  hips?: string;
  top_length?: string;
  trouser_length?: string;
  thigh?: string;
  agbada_length?: string;
  fit_preference?: 'slim' | 'regular' | 'comfort' | 'loose' | string;
  notes?: string;
}

export interface Payment {
  id: string;
  request_id: string;
  type: 'deposit' | 'balance';
  amount: number;
  status: 'stub_success' | 'success' | 'failed' | 'pending';
  gateway_reference?: string | null;
  metadata?: Record<string, any>;
  created_at: string;
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

// Comprehensive cities, major towns, and key districts mapped across all 36 Nigerian States + FCT Abuja
export const STATE_AREAS: Record<string, string[]> = {
  'Lagos': [
    'Ikeja',
    'Lagos Island',
    'Victoria Island',
    'Ikoyi',
    'Lekki Phase 1',
    'Lekki Phase 2 / Chevron',
    'Ajah / Sangotedo',
    'Yaba',
    'Surulere',
    'Magodo / Shangisha',
    'Maryland / Anthony',
    'Gbagada',
    'Festac Town',
    'Ogba',
    'Ikorodu',
    'Alaba / Ojo',
    'Agege',
    'Oshodi',
    'Isolo / Okota',
    'Egbeda / Alimosho',
    'Ilasamaja / Mushin',
    'Badagry',
    'Epe',
    'Ibeju-Lekki',
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
    'Apo / Guzape',
    'Central Business District (CBD)',
    'Kubwa',
    'Lugbe / Airport Road',
    'Dawaki / Katampe',
    'Lokogoma',
    'Bwari',
    'Kuje',
    'Gwagwalada',
    'Other (Abuja)'
  ],
  'Rivers (Port Harcourt)': [
    'Old GRA',
    'GRA Phase 1 & 2',
    'GRA Phase 3 & 4',
    'D-Line',
    'Peter Odili Road',
    'Trans-Amadi',
    'Rumuokoro',
    'Woji',
    'Ada George',
    'Elelenwo',
    'Rumuola',
    'Choba / Uniport Axis',
    'Rumuokrushi',
    'Diobu / Mile 1-3',
    'Bonny Island',
    'Oyigbo',
    'Other (Rivers)'
  ],
  'Oyo (Ibadan)': [
    'Bodija',
    'Ring Road',
    'Jericho',
    'Dugbe',
    'UI / Samonda / Agbowo',
    'Oluyole Estate',
    'Challenge / Molete',
    'Iyaganku GRA',
    'Ikolaba / Agodi GRA',
    'Akobo / Ojoo',
    'Moniya',
    'Ogbomoso',
    'Oyo Town',
    'Iseyin',
    'Saki',
    'Other (Oyo)'
  ],
  'Kano': [
    'Nassarawa GRA',
    'Bompai',
    'Fagge',
    'Sabon Gari',
    'Tarauni',
    'Kano City Center (Dala / Kurmi)',
    'Kano Municipal',
    'Gwale',
    'Kumbotso',
    'Ungogo',
    'Other (Kano)'
  ],
  'Enugu': [
    'Independence Layout',
    'New Haven',
    'GRA Enugu',
    'Achara Layout',
    'Ogui Road / Asata',
    'Abakpa Nike',
    'Trans-Ekulu',
    'Coal Camp',
    'Nsukka',
    '9th Mile Corner',
    'Awgu',
    'Oji River',
    'Other (Enugu)'
  ],
  'Anambra': [
    'Awka GRA',
    'Awka Central',
    'Onitsha Main / Bright Street',
    'Onitsha GRA',
    'Fegge (Onitsha)',
    'Nnewi (Otolo / Umudim)',
    'Ekwulobia',
    'Ihiala',
    'Ogidi',
    'Obosi',
    'Other (Anambra)'
  ],
  'Delta': [
    'Asaba GRA',
    'Asaba City / Nnebisi Road',
    'Okpanam',
    'Warri GRA',
    'Effurun',
    'Enerhen',
    'Sapele',
    'Ughelli',
    'Agbor',
    'Oghara',
    'Other (Delta)'
  ],
  'Edo': [
    'GRA Benin',
    'Airport Road',
    'Uselu / UNIBEN Axis',
    'Sapele Road',
    'Ring Road (King Square)',
    'Ikpoba Hill',
    'Ekenwan Road',
    'Auchi',
    'Ekpoma',
    'Uromi',
    'Other (Edo)'
  ],
  'Kwara': [
    'GRA Ilorin',
    'Fate Road',
    'Tanke / University Axis',
    'Adewole Estate',
    'Taiwo Road / Challenge',
    'Oja Oba / Emir Palace Axis',
    'Offa',
    'Omu-Aran',
    'Jebba',
    'Other (Kwara)'
  ],
  'Ogun': [
    'Abeokuta GRA (Ibikunle / Ibara)',
    'Oke-Mosan (Abeokuta)',
    'Kuto / Panseke',
    'Ijebu Ode',
    'Sagamu',
    'Mowe / Ibafo',
    'Ota / Sango',
    'Arepo',
    'Ilaro',
    'Other (Ogun)'
  ],
  'Kaduna': [
    'Barnawa',
    'Malali GRA',
    'Kaduna GRA',
    'Sabon Tasha',
    'Kabala Costain / Doka',
    'Tudun Wada',
    'Kawo',
    'Zaria City',
    'Samaru (ABU Axis)',
    'Kafanchan',
    'Other (Kaduna)'
  ],
  'Abia': [
    'Aba Commercial Hub',
    'Aba GRA',
    'Faulks Road (Aba)',
    'Ariaria Axis',
    'Umuahia Central',
    'Umuahia GRA',
    'Ohafia',
    'Arochukwu',
    'Other (Abia)'
  ],
  'Adamawa': [
    'Yola Town',
    'Jimeta Central',
    'Jimeta GRA',
    'Mubi',
    'Numan',
    'Ganye',
    'Other (Adamawa)'
  ],
  'Akwa Ibom': [
    'Uyo City / Wellington Bassey',
    'Ewet Housing Estate (Uyo)',
    'Shelter Afrique (Uyo)',
    'Osongama Estate',
    'Ikot Ekpene',
    'Eket',
    'Oron',
    'Other (Akwa Ibom)'
  ],
  'Bauchi': [
    'Bauchi Central',
    'GRA Bauchi',
    'Yelwa',
    'Azare',
    'Misau',
    'Jama\'are',
    'Other (Bauchi)'
  ],
  'Bayelsa': [
    'Yenagoa City',
    'Otuoke',
    'Amassoma',
    'Brass',
    'Sagbama',
    'Nembe',
    'Other (Bayelsa)'
  ],
  'Benue': [
    'Makurdi Central',
    'High Level (Makurdi)',
    'Wurukum',
    'North Bank',
    'Gboko',
    'Otukpo',
    'Katsina-Ala',
    'Other (Benue)'
  ],
  'Borno': [
    'Maiduguri City',
    'GRA Maiduguri',
    'Custom Area',
    'Biu',
    'Bama',
    'Other (Borno)'
  ],
  'Cross River': [
    'Calabar Municipal',
    'State Housing Estate (Calabar)',
    'Federal Housing (Calabar)',
    'Calabar South',
    'Ikom',
    'Ogoja',
    'Ugep',
    'Obudu',
    'Other (Cross River)'
  ],
  'Ebonyi': [
    'Abakaliki Central',
    'Kpirikpiri',
    'Mile 50',
    'Afikpo',
    'Onueke',
    'Other (Ebonyi)'
  ],
  'Ekiti': [
    'Ado-Ekiti Central',
    'GRA Ado-Ekiti',
    'Fajuyi Axis',
    'Ikere-Ekiti',
    'Ijero-Ekiti',
    'Oye-Ekiti',
    'Other (Ekiti)'
  ],
  'Gombe': [
    'Gombe Central',
    'GRA Gombe',
    'Pantami',
    'Kaltungo',
    'Dukku',
    'Other (Gombe)'
  ],
  'Imo': [
    'Owerri Municipal',
    'Aladinma Estate',
    'Ikenegbu Layout',
    'New Owerri / Concorde Axis',
    'World Bank Estate',
    'Orlu',
    'Okigwe',
    'Other (Imo)'
  ],
  'Jigawa': [
    'Dutse Central',
    'Hadejia',
    'Kazaure',
    'Gumel',
    'Ringim',
    'Other (Jigawa)'
  ],
  'Katsina': [
    'Katsina Central',
    'GRA Katsina',
    'Daura',
    'Funtua',
    'Malumfashi',
    'Other (Katsina)'
  ],
  'Kebbi': [
    'Birnin Kebbi Central',
    'GRA Birnin Kebbi',
    'Argungu',
    'Yauri',
    'Zuru',
    'Other (Kebbi)'
  ],
  'Kogi': [
    'Lokoja Central',
    'GRA Lokoja',
    'Ganaja',
    'Okene',
    'Kabba',
    'Anyigba',
    'Idah',
    'Other (Kogi)'
  ],
  'Nasarawa': [
    'Lafia Central',
    'GRA Lafia',
    'Keffi',
    'Mararaba / Karu Axis',
    'Akwanga',
    'Doma',
    'Other (Nasarawa)'
  ],
  'Niger': [
    'Minna Central',
    'GRA Minna',
    'Tunga',
    'Suleja',
    'Bida',
    'Kontagora',
    'New Bussa',
    'Other (Niger)'
  ],
  'Ondo': [
    'Akure Central',
    'Alagbaka GRA (Akure)',
    'Ijapo Estate (Akure)',
    'Ondo City',
    'Owo',
    'Ikare-Akoko',
    'Ore',
    'Other (Ondo)'
  ],
  'Osun': [
    'Osogbo Central',
    'GRA Osogbo',
    'Alekuwodo',
    'Ile-Ife (Campus / Mayfair)',
    'Ilesa',
    'Ede',
    'Ikirun',
    'Other (Osun)'
  ],
  'Plateau': [
    'Jos Central',
    'Rayfield GRA',
    'Bukuru',
    'Terminus Market Axis',
    'Tudun Wada (Jos)',
    'Barkin Ladi',
    'Pankshin',
    'Shendam',
    'Other (Plateau)'
  ],
  'Sokoto': [
    'Sokoto Central',
    'GRA Sokoto',
    'Runjin Sambo',
    'Tambuwal',
    'Gwadabawa',
    'Illela',
    'Other (Sokoto)'
  ],
  'Taraba': [
    'Jalingo Central',
    'GRA Jalingo',
    'Wukari',
    'Bali',
    'Gembu (Mambilla)',
    'Other (Taraba)'
  ],
  'Yobe': [
    'Damaturu Central',
    'GRA Damaturu',
    'Potiskum',
    'Gashua',
    'Nguru',
    'Other (Yobe)'
  ],
  'Zamfara': [
    'Gusau Central',
    'GRA Gusau',
    'Tsafe',
    'Kaura Namoda',
    'Talata Mafara',
    'Anka',
    'Other (Zamfara)'
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

