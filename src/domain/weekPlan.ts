import { RecipeWithComponents, RecipeComponentOption } from './recipe';

export interface WeekPlanSelection {
  optionId: number;
  option: RecipeComponentOption;
}

export type WeekPlanType = 'meal' | 'prep';

export interface WeekPlan {
  id: number;
  plannedDate: Date;
  servings: number;
  type: WeekPlanType;
  cooked: boolean;
  consumed: boolean;
  userId: number;
  recipeId: number | null;
  createdAt: Date;
}

export interface WeekPlanWithDetails extends WeekPlan {
  recipe: RecipeWithComponents | null;
  selections: WeekPlanSelection[];
}

export interface CreateWeekPlanDto {
  recipeId?: number;
  plannedDate: string;
  servings?: number;
  type?: WeekPlanType;
  selections?: number[];
}

export interface ShoppingItem {
  ingredientId: number;
  name: string;
  unit: string;
  totalQuantity: number;
  quantityAtHome: number;
  quantityToBuy: number;
  // Unidad preferida (ej: "3 dientes" en lugar de "12 g")
  preferredUnit?: string | null;
  preferredQuantity?: number | null;
}
