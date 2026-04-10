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
  customCalories?: number;
  customProtein?: number;
  customCarbs?: number;
  customFat?: number;
}

export interface RecommendedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  bmr: number;
  tdee: number;
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

const GOAL_ADJUSTMENTS: Record<Goal, number> = {
  maintain: 0,
  lose: -500,
  gain: 300
};

// Calorías mínimas recomendadas por seguridad
const MIN_CALORIES = {
  male: 1500,
  female: 1300
};

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

    if (profile.customCalories) {
      return {
        calories: profile.customCalories,
        protein: profile.customProtein || Math.round(profile.customCalories * 0.25 / 4),
        carbs: profile.customCarbs || Math.round(profile.customCalories * 0.45 / 4),
        fat: profile.customFat || Math.round(profile.customCalories * 0.30 / 9),
        bmr: 0,
        tdee: profile.customCalories
      };
    }

    if (!profile.weight || !profile.height || !profile.age || !profile.gender) {
      return null;
    }

    const activityLevel = profile.activityLevel || 'moderate';
    const goal = profile.goal || 'maintain';

    let bmr: number;
    if (profile.gender === 'male') {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }

    const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];
    const minCalories = MIN_CALORIES[profile.gender as 'male' | 'female'];
    const calculatedCalories = Math.round(tdee + GOAL_ADJUSTMENTS[goal]);
    // Aplicar mínimo de seguridad
    const calories = Math.max(calculatedCalories, minCalories);

    const protein = Math.round(profile.weight * 2);
    const fat = Math.round((calories * 0.25) / 9);
    const proteinCalories = protein * 4;
    const fatCalories = fat * 9;
    const carbCalories = calories - proteinCalories - fatCalories;
    const carbs = Math.round(carbCalories / 4);

    return {
      calories,
      protein,
      carbs,
      fat,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee)
    };
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
