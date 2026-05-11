// TypeScript interfaces derived from the JSON Schema definitions in schema/

export interface Settings {
  owner: string;
  repo: string;
  branch: string;
  pat: string;
}

// ---- Shared ----

export interface SyncMeta {
  source_md: string;
  last_synced: string | null;
  md_hash: string | null;
}

// ---- barkeeper.json ----

export interface BarkeeperData {
  _schema?: string;
  _sync?: SyncMeta;
  identity: {
    name: string;
    foundation_model: string;
    persona_version: string;
  };
  active_preset?: string;
  last_updated?: string | null;
}

// ---- inventory.json ----

export type BottleTier = 'industrial' | 'premium-accessible' | 'boutique' | 'rare/exceptional';
export type BestFor = 'sipping' | 'mixing' | 'both';

export interface BottleEntry {
  name: string;
  category?: string;
  tier?: BottleTier;
  notes?: string;
  best_for?: BestFor;
}

export interface SubstituteEntry {
  missing: string;
  substitute: string;
  ratio?: string;
}

export interface ShoppingItem {
  item: string;
  priority?: number;
  estimated_price_usd?: number;
  unlocks?: string[];
  rationale?: string;
}

export interface PastInventoryItem {
  item: string;
  notes?: string;
}

export interface InventoryData {
  _schema?: string;
  _sync?: SyncMeta;
  last_updated?: string | null;
  base_spirits: {
    whiskey: BottleEntry[];
    brandy: BottleEntry[];
    rum: BottleEntry[];
    agave: BottleEntry[];
    white_spirits: BottleEntry[];
    other: BottleEntry[];
  };
  fortified_wines_and_aperitif_wines: BottleEntry[];
  liqueurs_and_cordials: {
    fruit_forward: BottleEntry[];
    nut_coffee: BottleEntry[];
    herbal: BottleEntry[];
    specialty_regional: BottleEntry[];
  };
  bitters: {
    anchors: BottleEntry[];
    aromatic_smoke: BottleEntry[];
    nut_earth: BottleEntry[];
    fruit_botanical: BottleEntry[];
    other: BottleEntry[];
  };
  syrups: BottleEntry[];
  non_alcoholic_spirits: BottleEntry[];
  mixers: string[];
  refrigerator_perishables: string[];
  pantry_spice_rack: string[];
  fresh_produce: string[];
  specialty_ingredients: string[];
  garnish_and_service: string[];
  past_inventory: PastInventoryItem[];
  vetoes: {
    disliked_ingredients: string[];
    substitute_for_now: SubstituteEntry[];
  };
  shopping_list: ShoppingItem[];
}

// ---- bar-owner-profile.json ----

export type AxisConfidence = 'High' | 'Medium' | 'Tentative' | '—';
export type SmokePosition = 'into it' | 'neutral' | 'avoids';
export type FunkPosition = 'into it' | 'neutral' | 'turnoff';
export type SavoryPosition = 'interesting' | 'neutral' | 'hard no';

export interface FlavorAxis {
  position: string | null;
  confidence: AxisConfidence;
  last_evaluated: string | null;
}

export interface ProfileData {
  _schema?: string;
  _sync?: SyncMeta;
  identity: {
    full_name: string | null;
    preferred_name: string | null;
    location: string | null;
    timezone: string | null;
  };
  background?: {
    profession?: string;
    drinking_frequency?: string;
    typical_context?: string;
    household_context?: string;
    notes?: string;
  };
  equipment?: {
    shaker?: string;
    mixing_glass?: boolean;
    jigger?: boolean;
    bar_spoon?: boolean;
    strainer?: string;
    citrus_press?: boolean;
    ice_setup?: string;
    other?: string;
    gaps_flagged?: string;
  };
  constraints?: {
    bar_budget?: string;
    space?: string;
    cocktail_frequency?: string;
  };
  personal_context?: string[];
  flavor_profile: {
    axes: {
      sweetness: FlavorAxis;
      acid: FlavorAxis;
      strength: FlavorAxis;
      complexity: FlavorAxis;
      season: FlavorAxis;
      risk: FlavorAxis;
    };
    supplemental: {
      smoke: { position: SmokePosition | null; notes: string | null };
      funk: { position: FunkPosition | null; notes: string | null };
      savory_saline: { position: SavoryPosition | null; notes: string | null };
    };
  };
  archetypes: string[];
  vetoes: {
    disliked_ingredients: string[];
    substitute_for_now: SubstituteEntry[];
  };
  documented_originals: { id: string; name: string; creator: string; style: string }[];
  review_counter: {
    cocktails_since_last_review: number;
    last_review_date: string | null;
    next_review_threshold: number;
  };
  evolution_log: { date: string; change: string; reason?: string }[];
  guests: { name?: string; relationship?: string; preferences?: string; vetoes?: string[] }[];
  last_updated?: string | null;
}

// ---- recipes.json ----

export interface Ingredient {
  name: string;
  amount: string;
  notes?: string;
}

export interface RecipeOriginal {
  id: string;
  name: string;
  tagline?: string;
  creator: string;
  date_created?: string;
  ingredients: Ingredient[];
  method: string;
  method_type?: string;
  garnish?: string;
  glassware?: string;
  profile?: string;
  why_it_works?: string;
  variations?: { name: string; description: string }[];
  images?: { filename: string; style?: string; alt_text?: string }[];
  image_gen_prompts?: { photorealistic?: string; illustrated?: string };
  ratings?: { bar_owner?: number; guests?: string; notes?: string };
  confirmed_built?: boolean;
  date_confirmed?: string | null;
}

export interface ConfirmedFavorite {
  name: string;
  creator?: string;
  date_confirmed?: string;
  notes?: string;
  adaptation?: string;
  ingredients?: Ingredient[];
  method?: string;
  garnish?: string;
}

export interface WishlistItem {
  name: string;
  ingredients_summary?: string;
  pending?: string;
}

export interface RecipesData {
  _schema?: string;
  _sync?: SyncMeta;
  last_updated?: string | null;
  originals: RecipeOriginal[];
  profile_coverage_matrix: {
    id: string; name: string; creator: string;
    base: string; method: string; profile_occasion: string;
  }[];
  confirmed_favorites: ConfirmedFavorite[];
  wishlist: WishlistItem[];
}

// ---- App state ----

export interface FileState<T> {
  data: T;
  sha: string;
  fetchedAt: number;
}
