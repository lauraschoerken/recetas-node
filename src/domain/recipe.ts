import { IngredientWithQuantity } from "./ingredient";

export interface Recipe {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  imageUrl: string | null;
  servings: number;
  isPublic: boolean;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeComponentOption {
  id: number;
  name: string;
  isDefault: boolean;
  recipeId: number | null;
  ingredientId: number | null;
  quantity: number | null;
  unit: string | null;
  recipeServings: number | null;
  recipe?: RecipeWithComponents | null;
  ingredient?: IngredientWithQuantity | null;
}

export interface RecipeComponent {
  id: number;
  name: string;
  sortOrder: number;
  isOptional: boolean;
  defaultEnabled: boolean;
  options: RecipeComponentOption[];
}

export interface RecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface RecipeWithComponents extends Recipe {
  ingredients: IngredientWithQuantity[];
  components: RecipeComponent[];
  authorName?: string;
  totalCalories?: number | null;
  caloriesPerServing?: number | null;
  nutrition?: RecipeNutrition | null;
  nutritionPerServing?: RecipeNutrition | null;
  customCalories?: number | null;
  customProtein?: number | null;
  customCarbs?: number | null;
  customFat?: number | null;
  customFiber?: number | null;
  defaultLocation?: string | null;
  hasVariants?: boolean;
}

export interface CreateComponentOptionDto {
  name: string;
  isDefault?: boolean;
  recipeId?: number;
  ingredientName?: string;
  quantity?: number;
  unit?: string;
  recipeServings?: number;
}

export interface CreateComponentDto {
  name: string;
  sortOrder?: number;
  isOptional?: boolean;
  defaultEnabled?: boolean;
  options: CreateComponentOptionDto[];
}

export interface CreateRecipeDto {
  title: string;
  description?: string;
  instructions?: string;
  imageUrl?: string;
  servings?: number;
  isPublic?: boolean;
  defaultLocation?: string | null;
  ingredients?: {
    name: string;
    quantity: number;
    unit: string;
  }[];
  components?: CreateComponentDto[];
}

export interface UpdateRecipeDto {
  title?: string;
  description?: string;
  instructions?: string;
  imageUrl?: string;
  servings?: number;
  isPublic?: boolean;
  defaultLocation?: string | null;
  ingredients?: {
    name: string;
    quantity: number;
    unit: string;
  }[];
  components?: CreateComponentDto[];
}
