export interface UnitConversion {
  id: number;
  unitName: string;
  gramsPerUnit: number;
  ingredientId: number;
  isUserOverride?: boolean; // true = conversión personal del usuario, no global
}

export interface IngredientVariant {
  id: number;
  name: string;
  isDefault: boolean;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  weightFactor: number; // Factor de conversión de peso (ej: arroz cocinado = 3x)
  ingredientId: number;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  preferredUnit?: string | null; // Unidad preferida para lista de compra (ej: "diente" para ajo)
  imageUrl?: string | null;
  conversions?: UnitConversion[];
  variants?: IngredientVariant[];
}

export interface IngredientWithQuantity {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  imageUrl?: string | null;
  variantId?: number | null;
  variant?: IngredientVariant | null;
  conversions?: UnitConversion[];
  variants?: IngredientVariant[];
}

export interface CreateIngredientDto {
  name: string;
  unit: "g" | "ml";
  imageUrl?: string;
  defaultLocation?: string | null;
  variants?: CreateVariantDto[];
}

export interface CreateVariantDto {
  name: string;
  isDefault?: boolean;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  weightFactor?: number; // Factor de conversión de peso (default: 1.0)
}

export interface UpdateIngredientDto {
  name?: string;
  unit?: "g" | "ml";
  preferredUnit?: string | null; // Unidad preferida para lista de compra
  imageUrl?: string | null;
  defaultLocation?: string | null; // Ubicación por defecto: nevera, congelador, despensa
}

export interface UpdateVariantDto {
  name?: string;
  isDefault?: boolean;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  weightFactor?: number; // Factor de conversión de peso
}

export interface CreateUnitConversionDto {
  unitName: string;
  gramsPerUnit: number;
}

export interface UpdateUnitConversionDto {
  unitName?: string;
  gramsPerUnit?: number;
}
