export type HomeLocation = 'nevera' | 'congelador' | 'despensa';

export interface HomeItem {
  id: number;
  location: HomeLocation;
  quantity: number;
  unit: string;
  addedAt: Date;
  expiresAt?: Date | null;
  userId: number;
  ingredientId?: number | null;
  recipeId?: number | null;
  variantId?: number | null;
  ingredient?: {
    id: number;
    name: string;
  } | null;
  recipe?: {
    id: number;
    title: string;
  } | null;
  variant?: {
    id: number;
    name: string;
    weightFactor: number;
  } | null;
}

export interface CreateHomeItemDto {
  location: HomeLocation;
  quantity: number;
  unit: string;
  expiresAt?: string;
  ingredientId?: number;
  recipeId?: number;
  ingredientName?: string;
  variantId?: number;
}

export interface CookIngredientDto {
  targetVariantId: number;
  quantity?: number;  // Si no se especifica, cocina todo
  targetLocation?: HomeLocation;
}

export interface UpdateHomeItemDto {
  location?: HomeLocation;
  quantity?: number;
  unit?: string;
  expiresAt?: string | null;
}
