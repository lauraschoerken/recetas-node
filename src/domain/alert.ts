export type AlertStatus = "OPEN" | "VIEWED" | "SNOOZED" | "RESOLVED";
export type AlertTrigger = "COOK" | "CONSUME" | "PLANNING" | "MANUAL";

export interface StockAlert {
  id: number;
  status: AlertStatus;
  triggerType: AlertTrigger;
  beforeQty: number;
  deltaQty: number;
  afterQty: number;
  minimum: number;
  message: string | null;
  createdAt: Date;
  snoozedUntil: Date | null;
  userId: number;
  householdId: number | null;
  ingredientId: number | null;
  recipeId: number | null;
}

export interface CreateIngredientThresholdDto {
  ingredientId: number;
  minQuantity: number;
  unit: string;
}

export interface CreateRecipeThresholdDto {
  recipeId: number;
  minServings: number;
}

export interface UpdateAlertDto {
  status: "VIEWED" | "SNOOZED" | "RESOLVED";
  snoozedUntil?: string;
  addToShopping?: boolean;
}

export interface AlertWithDetails extends StockAlert {
  ingredient?: { id: number; name: string; unit: string } | null;
  recipe?: { id: number; title: string } | null;
}

export interface HomeItemHistoryEntry {
  id: number;
  action: string;
  quantity: number;
  unit: string;
  origin: string;
  createdAt: Date;
  userId: number;
  user?: { id: number; name: string };
}
