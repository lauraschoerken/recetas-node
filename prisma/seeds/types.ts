/**
 * Tipos compartidos para el sistema de seed de ingredientes.
 * Macros siempre expresados por 100 g (o 100 ml para líquidos).
 * Fuente: USDA FoodData Central 2024-2025.
 */

export interface IngredientSeedVariant {
  /** Nombre del estado: "Crudo", "Cocinado", "Frito", etc. */
  name: string;
  /** Si es la variante seleccionada por defecto */
  isDefault: boolean;
  /** kcal por 100 g/ml */
  calories: number;
  /** proteínas en g por 100 g/ml */
  protein: number;
  /** carbohidratos en g por 100 g/ml */
  carbs: number;
  /** grasas en g por 100 g/ml */
  fat: number;
  /** fibra en g por 100 g/ml */
  fiber: number;
  /**
   * Factor de peso cocinado.
   * 1.0 = sin cambio; 0.75 = pieza pierda 25% al cocinar (carne);
   * 2.5 = el alimento absorbe agua y pesa 2.5× (arroz, legumbres).
   */
  weightFactor?: number;
}

export interface IngredientSeedConversion {
  /** Nombre de la unidad alternativa (e.g. "kg", "unidad", "diente", "taza") */
  unitName: string;
  /** Equivalencia en gramos o ml por una unidad */
  gramsPerUnit: number;
}

export interface IngredientSeedData {
  /** Nombre en español, primera letra mayúscula */
  name: string;
  /** Unidad base: "g" para sólidos, "ml" para líquidos */
  unit: "g" | "ml";
  /** Unidad preferida para mostrar en la lista de la compra */
  preferredUnit?: string;
  /** Lugar de almacenamiento habitual */
  defaultLocation?: "nevera" | "congelador" | "despensa" | null;
  /** Al menos una variante (normalmente "Crudo" como default) */
  variants: IngredientSeedVariant[];
  /** Conversiones de unidad (siempre incluir "kg" o "l" según corresponda) */
  conversions: IngredientSeedConversion[];
}
