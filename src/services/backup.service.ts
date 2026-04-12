import { PrismaClient } from "@prisma/client";
import { householdService } from "./household.service";

const prisma = new PrismaClient();

export const backupService = {
  async exportAll(userId: number) {
    const householdId = await householdService.getHouseholdId(userId);

    const [
      userProfile,
      ingredients,
      recipes,
      weekPlans,
      homeItems,
      shoppingItems,
      thresholdsIng,
      thresholdsRec,
    ] = await Promise.all([
      prisma.user.findUnique({
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
          customFat: true,
          planningAlertScope: true,
        },
      }),
      prisma.ingredient.findMany({
        include: { variants: true, conversions: true },
      }),
      prisma.recipe.findMany({
        where: { userId },
        include: {
          ingredients: { include: { ingredient: true } },
          components: {
            include: {
              options: { include: { recipe: { select: { title: true } } } },
            },
          },
        },
      }),
      prisma.weekPlan.findMany({
        where: { userId },
        include: { selections: true },
      }),
      prisma.homeItem.findMany({
        where: householdId ? { householdId } : { userId },
        include: { ingredient: true, recipe: true },
      }),
      prisma.shoppingItem.findMany({
        where: householdId ? { householdId } : { userId },
        include: { ingredient: true },
      }),
      prisma.ingredientMinThreshold.findMany({
        where: householdId ? { householdId } : { userId },
        include: { ingredient: true },
      }),
      prisma.recipeMinThreshold.findMany({
        where: householdId ? { householdId } : { userId },
        include: { recipe: true },
      }),
    ]);

    return {
      exportDate: new Date().toISOString(),
      version: "1.0",
      data: {
        userProfile: userProfile
          ? [
              {
                imageUrl: userProfile.imageUrl,
                weight: userProfile.weight,
                height: userProfile.height,
                age: userProfile.age,
                gender: userProfile.gender,
                activityLevel: userProfile.activityLevel,
                goal: userProfile.goal,
                customCalories: userProfile.customCalories,
                customProtein: userProfile.customProtein,
                customCarbs: userProfile.customCarbs,
                customFat: userProfile.customFat,
                planningAlertScope: userProfile.planningAlertScope,
              },
            ]
          : [],
        ingredients: ingredients.map((i) => ({
          name: i.name,
          unit: i.unit,
          preferredUnit: i.preferredUnit,
          defaultLocation: i.defaultLocation,
          imageUrl: i.imageUrl,
          variants: i.variants.map((v) => ({
            name: v.name,
            isDefault: v.isDefault,
            calories: v.calories,
            protein: v.protein,
            carbs: v.carbs,
            fat: v.fat,
            fiber: v.fiber,
            weightFactor: v.weightFactor,
          })),
          conversions: i.conversions.map((c) => ({
            unitName: c.unitName,
            gramsPerUnit: c.gramsPerUnit,
          })),
        })),
        recipes: recipes.map((r) => ({
          title: r.title,
          description: r.description,
          instructions: r.instructions,
          imageUrl: r.imageUrl,
          cookTimeMinutes: r.cookTimeMinutes,
          difficulty: r.difficulty,
          servings: r.servings,
          isPublic: r.isPublic,
          customCalories: r.customCalories,
          customProtein: r.customProtein,
          customCarbs: r.customCarbs,
          customFat: r.customFat,
          customFiber: r.customFiber,
          ingredients: r.ingredients.map((ri) => ({
            ingredientName: ri.ingredient.name,
            quantity: ri.quantity,
            unit: ri.unit,
          })),
          components: r.components.map((c) => ({
            name: c.name,
            sortOrder: c.sortOrder,
            isOptional: c.isOptional,
            defaultEnabled: c.defaultEnabled,
            options: c.options.map((o) => ({
              name: o.name,
              isDefault: o.isDefault,
              quantity: o.quantity,
              unit: o.unit,
              recipeServings: o.recipeServings,
              linkedRecipeTitle: (o as any).recipe?.title ?? null,
            })),
          })),
        })),
        weekPlans: weekPlans.map((wp) => ({
          plannedDate: wp.plannedDate.toISOString(),
          servings: wp.servings,
          type: wp.type,
          cooked: wp.cooked,
          consumed: wp.consumed,
          recipeId: wp.recipeId,
          selections: wp.selections.map((s) => s.optionId),
        })),
        homeItems: homeItems.map((hi) => ({
          location: hi.location,
          quantity: hi.quantity,
          unit: hi.unit,
          addedAt: hi.addedAt.toISOString(),
          expiresAt: hi.expiresAt?.toISOString() ?? null,
          ingredientName: hi.ingredient?.name ?? null,
          recipeTitle: hi.recipe?.title ?? null,
        })),
        shoppingItems: shoppingItems.map((si) => ({
          quantity: si.quantity,
          unit: si.unit,
          purchased: si.purchased,
          ingredientName: si.ingredient.name,
        })),
        thresholds: {
          ingredients: thresholdsIng.map((t) => ({
            ingredientName: t.ingredient.name,
            minQuantity: t.minQuantity,
            unit: t.unit,
          })),
          recipes: thresholdsRec.map((t) => ({
            recipeTitle: t.recipe.title,
            minServings: t.minServings,
          })),
        },
      },
    };
  },

  toCsv(rows: Record<string, any>[]): string {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(",")];
    for (const row of rows) {
      lines.push(
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return "";
            const str = String(val);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(","),
      );
    }
    return lines.join("\n");
  },

  flattenForCsv(data: any): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, sections] of Object.entries(data.data)) {
      if (Array.isArray(sections)) {
        result[key] = this.toCsv(
          sections.map((item: any) => {
            const flat: Record<string, any> = {};
            for (const [k, v] of Object.entries(item)) {
              if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
                flat[k] = JSON.stringify(v);
              } else {
                flat[k] = v;
              }
            }
            return flat;
          }),
        );
      } else if (typeof sections === "object" && sections !== null) {
        for (const [subKey, subArr] of Object.entries(
          sections as Record<string, any>,
        )) {
          if (Array.isArray(subArr)) {
            result[`${key}_${subKey}`] = this.toCsv(subArr);
          }
        }
      }
    }
    return result;
  },

  async importData(
    jsonData: any,
    userId: number,
    mode: "overwrite" | "keep" | "review",
  ) {
    const data = jsonData.data || jsonData;
    const results: Record<
      string,
      { created: number; skipped: number; updated: number }
    > = {};

    const householdId = await householdService.getHouseholdId(userId);

    // Import ingredients
    if (data.ingredients) {
      let created = 0,
        skipped = 0,
        updated = 0;
      for (const ing of data.ingredients) {
        const existing = await prisma.ingredient.findUnique({
          where: { name: ing.name },
        });
        if (existing) {
          if (mode === "overwrite") {
            await prisma.ingredient.update({
              where: { id: existing.id },
              data: {
                unit: ing.unit,
                preferredUnit: ing.preferredUnit,
                defaultLocation: ing.defaultLocation,
                imageUrl: ing.imageUrl,
              },
            });
            // Update variants
            if (ing.variants) {
              await prisma.ingredientVariant.deleteMany({
                where: { ingredientId: existing.id },
              });
              for (const v of ing.variants) {
                await prisma.ingredientVariant.create({
                  data: { ...v, ingredientId: existing.id },
                });
              }
            }
            // Update conversions
            if (ing.conversions) {
              await prisma.unitConversion.deleteMany({
                where: { ingredientId: existing.id },
              });
              for (const c of ing.conversions) {
                await prisma.unitConversion.create({
                  data: { ...c, ingredientId: existing.id },
                });
              }
            }
            updated++;
          } else {
            skipped++;
          }
        } else {
          await prisma.ingredient.create({
            data: {
              name: ing.name,
              unit: ing.unit,
              preferredUnit: ing.preferredUnit,
              defaultLocation: ing.defaultLocation,
              imageUrl: ing.imageUrl,
              variants: ing.variants ? { create: ing.variants } : undefined,
              conversions: ing.conversions
                ? { create: ing.conversions }
                : undefined,
            },
          });
          created++;
        }
      }
      results.ingredients = { created, skipped, updated };
    }

    // Import user profile/settings
    if (
      data.userProfile &&
      Array.isArray(data.userProfile) &&
      data.userProfile[0]
    ) {
      const incoming = data.userProfile[0];
      const current = await prisma.user.findUnique({ where: { id: userId } });
      if (current) {
        const mergeIfKeep = <T>(incomingVal: T, currentVal: T) =>
          currentVal === null || currentVal === undefined || currentVal === ""
            ? incomingVal
            : currentVal;

        await prisma.user.update({
          where: { id: userId },
          data: {
            imageUrl:
              mode === "overwrite"
                ? (incoming.imageUrl ?? null)
                : mergeIfKeep(incoming.imageUrl ?? null, current.imageUrl),
            weight:
              mode === "overwrite"
                ? (incoming.weight ?? null)
                : mergeIfKeep(incoming.weight ?? null, current.weight),
            height:
              mode === "overwrite"
                ? (incoming.height ?? null)
                : mergeIfKeep(incoming.height ?? null, current.height),
            age:
              mode === "overwrite"
                ? (incoming.age ?? null)
                : mergeIfKeep(incoming.age ?? null, current.age),
            gender:
              mode === "overwrite"
                ? (incoming.gender ?? null)
                : mergeIfKeep(incoming.gender ?? null, current.gender),
            activityLevel:
              mode === "overwrite"
                ? (incoming.activityLevel ?? null)
                : mergeIfKeep(
                    incoming.activityLevel ?? null,
                    current.activityLevel,
                  ),
            goal:
              mode === "overwrite"
                ? (incoming.goal ?? null)
                : mergeIfKeep(incoming.goal ?? null, current.goal),
            customCalories:
              mode === "overwrite"
                ? (incoming.customCalories ?? null)
                : mergeIfKeep(
                    incoming.customCalories ?? null,
                    current.customCalories,
                  ),
            customProtein:
              mode === "overwrite"
                ? (incoming.customProtein ?? null)
                : mergeIfKeep(
                    incoming.customProtein ?? null,
                    current.customProtein,
                  ),
            customCarbs:
              mode === "overwrite"
                ? (incoming.customCarbs ?? null)
                : mergeIfKeep(
                    incoming.customCarbs ?? null,
                    current.customCarbs,
                  ),
            customFat:
              mode === "overwrite"
                ? (incoming.customFat ?? null)
                : mergeIfKeep(incoming.customFat ?? null, current.customFat),
            planningAlertScope:
              mode === "overwrite"
                ? (incoming.planningAlertScope ?? null)
                : mergeIfKeep(
                    incoming.planningAlertScope ?? null,
                    current.planningAlertScope,
                  ),
          },
        });
      }
      results.userProfile = {
        created: mode === "overwrite" ? 0 : 1,
        skipped: 0,
        updated: mode === "overwrite" ? 1 : 0,
      };
    }

    // Import recipes
    if (data.recipes) {
      let created = 0,
        skipped = 0,
        updated = 0;
      for (const rec of data.recipes) {
        const existing = await prisma.recipe.findFirst({
          where: { title: rec.title, userId },
        });

        // Resolve ingredient IDs
        const ingredientConnects = [];
        for (const ri of rec.ingredients || []) {
          let ing = await prisma.ingredient.findUnique({
            where: { name: ri.ingredientName },
          });
          if (!ing) {
            ing = await prisma.ingredient.create({
              data: { name: ri.ingredientName, unit: ri.unit || "g" },
            });
          }
          ingredientConnects.push({
            quantity: ri.quantity,
            unit: ri.unit,
            ingredientId: ing.id,
          });
        }

        if (existing) {
          if (mode === "overwrite") {
            // Actually update the recipe
            await prisma.recipeIngredient.deleteMany({
              where: { recipeId: existing.id },
            });
            await prisma.recipeComponent.deleteMany({
              where: { recipeId: existing.id },
            });
            await prisma.recipe.update({
              where: { id: existing.id },
              data: {
                description: rec.description,
                instructions: rec.instructions,
                imageUrl: rec.imageUrl,
                cookTimeMinutes: rec.cookTimeMinutes,
                difficulty: rec.difficulty,
                servings: rec.servings ?? 4,
                isPublic: rec.isPublic ?? false,
                customCalories: rec.customCalories,
                customProtein: rec.customProtein,
                customCarbs: rec.customCarbs,
                customFat: rec.customFat,
                customFiber: rec.customFiber,
                ingredients: { create: ingredientConnects },
              },
            });
            // Recreate components
            if (rec.components) {
              for (const comp of rec.components) {
                await prisma.recipeComponent.create({
                  data: {
                    name: comp.name,
                    sortOrder: comp.sortOrder ?? 0,
                    isOptional: comp.isOptional ?? false,
                    defaultEnabled: comp.defaultEnabled ?? true,
                    recipeId: existing.id,
                    options: comp.options
                      ? {
                          create: comp.options.map((o: any) => ({
                            name: o.name,
                            isDefault: o.isDefault ?? false,
                            quantity: o.quantity,
                            unit: o.unit,
                            recipeServings: o.recipeServings,
                          })),
                        }
                      : undefined,
                  },
                });
              }
            }
            updated++;
          } else {
            skipped++;
          }
          continue;
        }

        const recipe = await prisma.recipe.create({
          data: {
            title: rec.title,
            description: rec.description,
            instructions: rec.instructions,
            imageUrl: rec.imageUrl,
            cookTimeMinutes: rec.cookTimeMinutes,
            difficulty: rec.difficulty,
            servings: rec.servings ?? 4,
            isPublic: rec.isPublic ?? false,
            userId,
            customCalories: rec.customCalories,
            customProtein: rec.customProtein,
            customCarbs: rec.customCarbs,
            customFat: rec.customFat,
            customFiber: rec.customFiber,
            ingredients: { create: ingredientConnects },
          },
        });
        // Create components
        if (rec.components) {
          for (const comp of rec.components) {
            await prisma.recipeComponent.create({
              data: {
                name: comp.name,
                sortOrder: comp.sortOrder ?? 0,
                isOptional: comp.isOptional ?? false,
                defaultEnabled: comp.defaultEnabled ?? true,
                recipeId: recipe.id,
                options: comp.options
                  ? {
                      create: comp.options.map((o: any) => ({
                        name: o.name,
                        isDefault: o.isDefault ?? false,
                        quantity: o.quantity,
                        unit: o.unit,
                        recipeServings: o.recipeServings,
                      })),
                    }
                  : undefined,
              },
            });
          }
        }
        created++;
      }

      // Pass 2: link sub-recipe references in component options
      for (const rec of data.recipes) {
        const createdRec = await prisma.recipe.findFirst({
          where: { title: rec.title, userId },
        });
        if (!createdRec) continue;

        for (const comp of rec.components || []) {
          const dbComp = await prisma.recipeComponent.findFirst({
            where: { name: comp.name, recipeId: createdRec.id },
          });
          if (!dbComp) continue;

          for (const opt of comp.options || []) {
            if (!opt.linkedRecipeTitle) continue;
            const linkedRec = await prisma.recipe.findFirst({
              where: { title: opt.linkedRecipeTitle, userId },
            });
            if (!linkedRec) continue;
            await prisma.recipeComponentOption.updateMany({
              where: { componentId: dbComp.id, name: opt.name },
              data: { recipeId: linkedRec.id },
            });
          }
        }
      }

      results.recipes = { created, skipped, updated };
    }

    // Import home items
    if (data.homeItems) {
      let created = 0,
        skipped = 0;
      for (const hi of data.homeItems) {
        let ingredientId: number | null = null;
        let recipeId: number | null = null;

        if (hi.ingredientName) {
          const ing = await prisma.ingredient.findUnique({
            where: { name: hi.ingredientName },
          });
          if (ing) ingredientId = ing.id;
        }
        if (hi.recipeTitle) {
          const rec = await prisma.recipe.findFirst({
            where: { title: hi.recipeTitle, userId },
          });
          if (rec) recipeId = rec.id;
        }

        if (!ingredientId && !recipeId) {
          skipped++;
          continue;
        }

        await prisma.homeItem.create({
          data: {
            location: hi.location || "nevera",
            quantity: hi.quantity,
            unit: hi.unit,
            userId,
            ingredientId,
            recipeId,
            ...(householdId ? { householdId } : {}),
            expiresAt: hi.expiresAt ? new Date(hi.expiresAt) : null,
          },
        });
        created++;
      }
      results.homeItems = { created, skipped, updated: 0 };
    }

    // Import shopping items
    if (data.shoppingItems) {
      let created = 0,
        skipped = 0;
      for (const si of data.shoppingItems) {
        const ing = await prisma.ingredient.findUnique({
          where: { name: si.ingredientName },
        });
        if (!ing) {
          skipped++;
          continue;
        }
        await prisma.shoppingItem.create({
          data: {
            quantity: si.quantity,
            unit: si.unit,
            purchased: si.purchased ?? false,
            userId,
            ingredientId: ing.id,
            ...(householdId ? { householdId } : {}),
          },
        });
        created++;
      }
      results.shoppingItems = { created, skipped, updated: 0 };
    }

    // Import thresholds
    if (data.thresholds) {
      if (data.thresholds.ingredients) {
        let created = 0,
          skipped = 0;
        for (const t of data.thresholds.ingredients) {
          const ing = await prisma.ingredient.findUnique({
            where: { name: t.ingredientName },
          });
          if (!ing) {
            skipped++;
            continue;
          }
          const whereClause = householdId
            ? {
                ingredientId_householdId: { ingredientId: ing.id, householdId },
              }
            : { ingredientId_userId: { ingredientId: ing.id, userId } };
          const existing = await prisma.ingredientMinThreshold.findUnique({
            where: whereClause as any,
          });
          if (existing) {
            if (mode === "overwrite") {
              await prisma.ingredientMinThreshold.update({
                where: { id: existing.id },
                data: { minQuantity: t.minQuantity, unit: t.unit },
              });
            }
            skipped++;
          } else {
            await prisma.ingredientMinThreshold.create({
              data: {
                ingredientId: ing.id,
                minQuantity: t.minQuantity,
                unit: t.unit,
                ...(householdId ? { householdId } : { userId }),
              },
            });
            created++;
          }
        }
        results.ingredientThresholds = { created, skipped, updated: 0 };
      }
      if (data.thresholds.recipes) {
        let created = 0,
          skipped = 0;
        for (const t of data.thresholds.recipes) {
          const rec = await prisma.recipe.findFirst({
            where: { title: t.recipeTitle, userId },
          });
          if (!rec) {
            skipped++;
            continue;
          }
          const whereClause = householdId
            ? { recipeId_householdId: { recipeId: rec.id, householdId } }
            : { recipeId_userId: { recipeId: rec.id, userId } };
          const existing = await prisma.recipeMinThreshold.findUnique({
            where: whereClause as any,
          });
          if (existing) {
            if (mode === "overwrite") {
              await prisma.recipeMinThreshold.update({
                where: { id: existing.id },
                data: { minServings: t.minServings },
              });
            }
            skipped++;
          } else {
            await prisma.recipeMinThreshold.create({
              data: {
                recipeId: rec.id,
                minServings: t.minServings,
                ...(householdId ? { householdId } : { userId }),
              },
            });
            created++;
          }
        }
        results.recipeThresholds = { created, skipped, updated: 0 };
      }
    }

    return { mode, results };
  },
};
