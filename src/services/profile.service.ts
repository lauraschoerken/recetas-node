import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'maintain' | 'lose' | 'gain';

export interface UserProfile {
  imageUrl?: string;
  weight?: number;
  height?: number;
  age?: number;
  gender?: Gender;
  activityLevel?: ActivityLevel;
  goal?: Goal;
  customCalories?: number | null;
  customProtein?: number | null;
  customCarbs?: number | null;
  customFat?: number | null;
}

export interface RecommendedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  bmr: number;
  tdee: number;
  method: 'Mifflin-St Jeor';
  proteinPerKg: number;
  referenceWeight: number;
  calorieAdjustmentPercent: number;
  calorieFloorApplied: boolean;
}

export interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface WeeklyNutrition {
  days: DailyNutrition[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  averages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

const GOAL_MULTIPLIERS: Record<Goal, number> = {
  maintain: 1,
  lose: 0.85,
  gain: 1.075
};

// Calorías mínimas recomendadas por seguridad
const MIN_CALORIES = {
  male: 1500,
  female: 1300
};

const PROTEIN_FACTORS: Record<ActivityLevel, Record<Goal, number>> = {
  sedentary: { maintain: 1.0, lose: 1.6, gain: 1.4 },
  light: { maintain: 1.2, lose: 1.6, gain: 1.6 },
  moderate: { maintain: 1.4, lose: 1.8, gain: 1.6 },
  active: { maintain: 1.6, lose: 2.0, gain: 1.8 },
  very_active: { maintain: 1.6, lose: 2.0, gain: 2.0 }
};

const VALID_GENDERS: Gender[] = ['male', 'female'];
const VALID_ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const VALID_GOALS: Goal[] = ['maintain', 'lose', 'gain'];

function validateRange(name: string, value: number | null | undefined, min: number, max: number, integer = false) {
  if (value == null) return;
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw { httpCode: 400, message: `${name} debe estar entre ${min} y ${max}${integer ? ' y ser un número entero' : ''}` };
  }
}

export function validateUserProfile(data: Partial<UserProfile>) {
  validateRange('weight', data.weight, 25, 350);
  validateRange('height', data.height, 100, 250);
  validateRange('age', data.age, 18, 120, true);
  validateRange('customCalories', data.customCalories, 800, 10000, true);
  validateRange('customProtein', data.customProtein, 0, 1000, true);
  validateRange('customCarbs', data.customCarbs, 0, 1500, true);
  validateRange('customFat', data.customFat, 0, 500, true);

  if (data.gender != null && !VALID_GENDERS.includes(data.gender)) {
    throw { httpCode: 400, message: 'gender no es válido' };
  }
  if (data.activityLevel != null && !VALID_ACTIVITY_LEVELS.includes(data.activityLevel)) {
    throw { httpCode: 400, message: 'activityLevel no es válido' };
  }
  if (data.goal != null && !VALID_GOALS.includes(data.goal)) {
    throw { httpCode: 400, message: 'goal no es válido' };
  }
}

export function calculateRecommendedMacros(profile: UserProfile): RecommendedMacros | null {
  const hasBodyData = profile.weight != null && profile.height != null && profile.age != null && profile.gender != null;
  let bmr = 0;
  let tdee = 0;

  if (hasBodyData) {
    const sexConstant = profile.gender === 'male' ? 5 : -161;
    bmr = 10 * profile.weight! + 6.25 * profile.height! - 5 * profile.age! + sexConstant;
    if (profile.activityLevel) tdee = bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel];
  }

  if (profile.customCalories != null) {
    const calories = profile.customCalories;
    return {
      calories,
      protein: profile.customProtein ?? Math.round(calories * 0.25 / 4),
      carbs: profile.customCarbs ?? Math.round(calories * 0.45 / 4),
      fat: profile.customFat ?? Math.round(calories * 0.30 / 9),
      fiber: 25,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee || calories),
      method: 'Mifflin-St Jeor',
      proteinPerKg: 0,
      referenceWeight: profile.weight ?? 0,
      calorieAdjustmentPercent: 0,
      calorieFloorApplied: false
    };
  }

  if (!hasBodyData || !profile.activityLevel || !profile.goal) return null;

  tdee = bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel];
  const rawCalories = Math.round(tdee * GOAL_MULTIPLIERS[profile.goal]);
  const calorieFloor = profile.goal === 'lose' ? MIN_CALORIES[profile.gender!] : 0;
  const calories = Math.max(rawCalories, calorieFloor);

  const heightMetres = profile.height! / 100;
  const bmi = profile.weight! / (heightMetres * heightMetres);
  const weightAtBmi25 = 25 * heightMetres * heightMetres;
  // Para IMC >= 30 se usa peso ajustado, evitando sobredimensionar la proteína.
  const referenceWeight = bmi >= 30
    ? weightAtBmi25 + 0.4 * (profile.weight! - weightAtBmi25)
    : profile.weight!;
  const proteinPerKg = PROTEIN_FACTORS[profile.activityLevel][profile.goal];
  const desiredProtein = Math.round(referenceWeight * proteinPerKg);
  // Limita proteína al 30 %: con 25 % de grasa deja al menos 45 % para carbohidratos.
  const protein = Math.min(desiredProtein, Math.floor((calories * 0.30) / 4));
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  return {
    calories,
    protein,
    carbs,
    fat,
    fiber: 25,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    method: 'Mifflin-St Jeor',
    proteinPerKg,
    referenceWeight: Math.round(referenceWeight * 10) / 10,
    calorieAdjustmentPercent: Math.round((GOAL_MULTIPLIERS[profile.goal] - 1) * 1000) / 10,
    calorieFloorApplied: calories !== rawCalories
  };
}

class ProfileService {
  async getProfile(userId: number): Promise<UserProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        imageUrl: true,
        weight: true,
        height: true,
        age: true,
        gender: true,
        activityLevel: true,
        goal: true,
        customCalories: true,
        customProtein: true,
        customCarbs: true,
        customFat: true
      }
    });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return {
      imageUrl: user.imageUrl ?? undefined,
      weight: user.weight ?? undefined,
      height: user.height ?? undefined,
      age: user.age ?? undefined,
      gender: user.gender as Gender | undefined,
      activityLevel: user.activityLevel as ActivityLevel | undefined,
      goal: user.goal as Goal | undefined,
      customCalories: user.customCalories ?? undefined,
      customProtein: user.customProtein ?? undefined,
      customCarbs: user.customCarbs ?? undefined,
      customFat: user.customFat ?? undefined
    };
  }

  async updateProfile(userId: number, data: Partial<UserProfile>): Promise<UserProfile> {
    validateUserProfile(data);
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        imageUrl: data.imageUrl,
        weight: data.weight,
        height: data.height,
        age: data.age,
        gender: data.gender,
        activityLevel: data.activityLevel,
        goal: data.goal,
        customCalories: data.customCalories,
        customProtein: data.customProtein,
        customCarbs: data.customCarbs,
        customFat: data.customFat
      },
      select: {
        imageUrl: true,
        weight: true,
        height: true,
        age: true,
        gender: true,
        activityLevel: true,
        goal: true,
        customCalories: true,
        customProtein: true,
        customCarbs: true,
        customFat: true
      }
    });

    return {
      imageUrl: user.imageUrl ?? undefined,
      weight: user.weight ?? undefined,
      height: user.height ?? undefined,
      age: user.age ?? undefined,
      gender: user.gender as Gender | undefined,
      activityLevel: user.activityLevel as ActivityLevel | undefined,
      goal: user.goal as Goal | undefined,
      customCalories: user.customCalories ?? undefined,
      customProtein: user.customProtein ?? undefined,
      customCarbs: user.customCarbs ?? undefined,
      customFat: user.customFat ?? undefined
    };
  }

  async getRecommendedMacros(userId: number): Promise<RecommendedMacros | null> {
    const profile = await this.getProfile(userId);
    return calculateRecommendedMacros(profile);
  }

  async getWeeklyNutrition(userId: number, startDate: Date, endDate: Date): Promise<WeeklyNutrition> {
    const days: DailyNutrition[] = [];
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayNutrition = await this.getDayNutrition(userId, new Date(currentDate));
      days.push(dayNutrition);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    };

    for (const day of days) {
      totals.calories += day.calories;
      totals.protein += day.protein;
      totals.carbs += day.carbs;
      totals.fat += day.fat;
      totals.fiber += day.fiber;
    }

    const daysCount = days.length || 1;
    const averages = {
      calories: Math.round(totals.calories / daysCount),
      protein: Math.round(totals.protein / daysCount),
      carbs: Math.round(totals.carbs / daysCount),
      fat: Math.round(totals.fat / daysCount),
      fiber: Math.round(totals.fiber / daysCount)
    };

    return { days, totals, averages };
  }

  private async getDayNutrition(userId: number, date: Date): Promise<DailyNutrition> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const plans = await prisma.weekPlan.findMany({
      where: {
        userId,
        type: 'meal',
        plannedDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        ingredient: {
          include: {
            conversions: true,
            variants: true
          }
        },
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: {
                  include: {
                    conversions: true,
                    variants: true
                  }
                },
                variant: true,
                cookedVariant: true
              }
            },
            components: {
              include: {
                options: {
                  include: {
                    recipe: {
                      include: {
                        ingredients: {
                          include: {
                            ingredient: {
                              include: {
                                conversions: true,
                                variants: true
                              }
                            },
                            variant: true,
                            cookedVariant: true
                          }
                        }
                      }
                    },
                    ingredient: {
                      include: {
                        conversions: true,
                        variants: true
                      }
                    },
                    variant: true,
                    cookedVariant: true
                  }
                }
              }
            }
          }
        },
        selections: {
          include: {
            option: {
              include: {
                recipe: {
                  include: {
                    ingredients: {
                      include: {
                        ingredient: {
                          include: {
                            conversions: true,
                            variants: true
                          }
                        },
                        variant: true,
                        cookedVariant: true
                      }
                    }
                  }
                },
                ingredient: {
                  include: {
                    conversions: true,
                    variants: true
                  }
                },
                variant: true,
                cookedVariant: true
              }
            }
          }
        }
      }
    });

    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let fiber = 0;

    for (const plan of plans) {
      if (plan.manualTitle) {
        calories += plan.manualCalories || 0;
        protein += plan.manualProtein || 0;
        carbs += plan.manualCarbs || 0;
        fat += plan.manualFat || 0;
        fiber += plan.manualFiber || 0;
        continue;
      }

      if (plan.ingredient && plan.ingredientQty) {
        const ing = plan.ingredient;
        const variant = ing.variants?.find((v: any) => v.isDefault) || ing.variants?.[0];
        const baseQuantity = this.getQuantityInGrams(
          plan.ingredientQty,
          plan.ingredientUnit,
          ing.unit,
          ing.conversions || []
        );
        const factor = ing.unit === 'g' || ing.unit === 'ml' ? baseQuantity / 100 : baseQuantity;
        calories += (variant?.calories || 0) * factor;
        protein += (variant?.protein || 0) * factor;
        carbs += (variant?.carbs || 0) * factor;
        fat += (variant?.fat || 0) * factor;
        fiber += (variant?.fiber || 0) * factor;
        continue;
      }

      if (plan.recipe) {
        const servingRatio = plan.servings / plan.recipe.servings;
        const nutrition = this.calculateRecipeNutrition(plan.recipe, servingRatio, plan.selections || []);
        calories += nutrition.calories;
        protein += nutrition.protein;
        carbs += nutrition.carbs;
        fat += nutrition.fat;
        fiber += nutrition.fiber;
      }
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return {
      date: `${year}-${month}-${day}`,
      calories: Math.round(calories),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
      fiber: Math.round(fiber)
    };
  }

  private calculateRecipeNutrition(recipe: any, ratio: number, selections: any[] = []) {
    // Si hay macros manuales, usarlos
    if (recipe.customCalories != null) {
      return {
        calories: recipe.customCalories * ratio,
        protein: (recipe.customProtein || 0) * ratio,
        carbs: (recipe.customCarbs || 0) * ratio,
        fat: (recipe.customFat || 0) * ratio,
        fiber: (recipe.customFiber || 0) * ratio
      };
    }

    let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0;

    for (const ri of recipe.ingredients || []) {
      const ing = ri.ingredient;
      if (!ing) continue;

      // Usar cookedVariant para macros si existe, sino variant
      const variant = ri.cookedVariant || ri.variant || ing.variants?.find((v: any) => v.isDefault) || ing.variants?.[0];

      const gramsUsed = this.getQuantityInGrams(ri.quantity, ri.unit, ing.unit, ing.conversions);
      const factor = (gramsUsed / 100) * ratio;

      if (variant?.calories) calories += variant.calories * factor;
      if (variant?.protein) protein += variant.protein * factor;
      if (variant?.carbs) carbs += variant.carbs * factor;
      if (variant?.fat) fat += variant.fat * factor;
      if (variant?.fiber) fiber += variant.fiber * factor;
    }

    for (const comp of recipe.components || []) {
      const selectedOption = selections.find((s: any) => 
        comp.options.some((o: any) => o.id === s.optionId)
      );
      
      const option = selectedOption 
        ? comp.options.find((o: any) => o.id === selectedOption.optionId)
        : (comp.options.find((o: any) => o.isDefault) || comp.options[0]);
      
      if (!option && comp.isOptional) continue;
      if (!option) continue;

      const optNutrition = this.calculateOptionNutrition(option, ratio);
      calories += optNutrition.calories;
      protein += optNutrition.protein;
      carbs += optNutrition.carbs;
      fat += optNutrition.fat;
      fiber += optNutrition.fiber;
    }

    return { calories, protein, carbs, fat, fiber };
  }

  private calculateOptionNutrition(option: any, ratio: number) {
    if (option.recipe) {
      const recipeRatio = option.recipeServings 
        ? (option.recipeServings / option.recipe.servings) * ratio
        : ratio;
      return this.calculateRecipeNutrition(option.recipe, recipeRatio, []);
    } else if (option.ingredient && option.quantity) {
      const ing = option.ingredient;
      // Usar cookedVariant para macros si existe, sino variant
      const variant = option.cookedVariant || option.variant || ing.variants?.find((v: any) => v.isDefault) || ing.variants?.[0];
      
      const gramsUsed = this.getQuantityInGrams(option.quantity, option.unit, ing.unit, ing.conversions);
      const factor = (gramsUsed / 100) * ratio;

      return {
        calories: (variant?.calories || 0) * factor,
        protein: (variant?.protein || 0) * factor,
        carbs: (variant?.carbs || 0) * factor,
        fat: (variant?.fat || 0) * factor,
        fiber: (variant?.fiber || 0) * factor
      };
    }

    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }

  private getQuantityInGrams(quantity: number, usedUnit: string | null, baseUnit: string, conversions: any[]): number {
    if (!usedUnit || usedUnit === baseUnit || usedUnit === 'g' || usedUnit === 'ml') {
      return quantity;
    }

    if (usedUnit === 'kg') return quantity * 1000;
    if (usedUnit === 'L') return quantity * 1000;

    const conversion = conversions.find((c: any) => c.unitName === usedUnit);
    if (conversion) {
      return quantity * conversion.gramsPerUnit;
    }

    return quantity;
  }
}

export const profileService = new ProfileService();
