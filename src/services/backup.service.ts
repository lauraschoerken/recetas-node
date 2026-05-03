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
      // Solo ingredientes privados creados por el usuario (no los globales)
      prisma.ingredient.findMany({
        where: { createdByUserId: userId, status: "PRIVATE" },
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
        const existing = await prisma.ingredient.findFirst({
          where: { name: ing.name, status: "GLOBAL" },
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
          let ing = await prisma.ingredient.findFirst({
            where: { name: ri.ingredientName, status: "GLOBAL" },
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
          const ing = await prisma.ingredient.findFirst({
            where: { name: hi.ingredientName, status: "GLOBAL" },
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
        const ing = await prisma.ingredient.findFirst({
          where: { name: si.ingredientName, status: "GLOBAL" },
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
          const ing = await prisma.ingredient.findFirst({
            where: { name: t.ingredientName, status: "GLOBAL" },
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

  async importGlobal(jsonData: any, mode: "overwrite" | "keep" | "review") {
    const data = jsonData.data || jsonData;
    const results: Record<
      string,
      { created: number; skipped: number; updated: number }
    > = {};

    // Mapa email → userId (se actualiza al crear usuarios nuevos)
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true },
    });
    const emailToId = new Map(allUsers.map((u) => [u.email, u.id]));

    // Helpers de lookup (se rellenan después de importar entidades)
    const ingNameToId = new Map<string, number>();
    const variantKeyToId = new Map<string, number>(); // "ingName::variantName"
    const recipeKeyToId = new Map<string, number>(); // "email::title"
    const tagNameToId = new Map<string, number>();
    const householdNameToId = new Map<string, number>();

    // ── 0. En modo "overwrite", eliminar primero todo lo que NO está en el backup ──
    // Se vacían las tablas en orden de FK (hijos primero) solo para las entidades
    // que SÍ están presentes en el backup, de modo que la BD quede exactamente igual.
    if (mode === "overwrite") {
      // Tablas dependientes (hijos primero)
      await prisma.stockAlert.deleteMany();
      await prisma.ingredientProposal.deleteMany();
      await prisma.userStoreIngredient.deleteMany();
      await prisma.userStore.deleteMany();
      await prisma.ingredientTagHidden.deleteMany();
      await prisma.ingredientTagAssignment.deleteMany();
      await prisma.ingredientTag.deleteMany();
      await prisma.ingredientConversionUserOverride.deleteMany();
      await prisma.ingredientVariantUserOverride.deleteMany();
      await prisma.ingredientUserOverride.deleteMany();
      await prisma.householdMember.deleteMany();
      await prisma.householdInvite.deleteMany();
      await prisma.household.deleteMany();
      await prisma.recipeMinThreshold.deleteMany();
      await prisma.ingredientMinThreshold.deleteMany();
      await prisma.shoppingItem.deleteMany();
      await prisma.homeItemHistory.deleteMany();
      await prisma.homeItem.deleteMany();
      await prisma.weekPlanSelection.deleteMany();
      await prisma.weekPlan.deleteMany();
      await prisma.recipeComponentOption.deleteMany();
      await prisma.recipeComponent.deleteMany();
      await prisma.recipeIngredient.deleteMany();
      await prisma.recipe.deleteMany();
      await prisma.unitConversion.deleteMany();
      await prisma.ingredientVariant.deleteMany();
      await prisma.ingredient.deleteMany();
      // Nota: no se eliminan usuarios para no dejar fuera al admin que hace el import
    }

    // ── 1. USUARIOS ────────────────────────────────────────────────────────
    if (data.users) {
      let created = 0,
        updated = 0,
        skipped = 0;
      for (const u of data.users) {
        const existingId = emailToId.get(u.email);
        if (!existingId) {
          if (!u.passwordHash) {
            skipped++;
            continue;
          }
          const newUser = await prisma.user.create({
            data: {
              email: u.email,
              password: u.passwordHash,
              name: u.name ?? u.email,
              role: u.role ?? "USER",
              imageUrl: u.imageUrl ?? null,
              weight: u.weight ?? null,
              height: u.height ?? null,
              age: u.age ?? null,
              gender: u.gender ?? null,
              activityLevel: u.activityLevel ?? null,
              goal: u.goal ?? null,
              customCalories: u.customCalories ?? null,
              customProtein: u.customProtein ?? null,
              customCarbs: u.customCarbs ?? null,
              customFat: u.customFat ?? null,
              planningAlertScope: u.planningAlertScope ?? null,
            },
          });
          emailToId.set(u.email, newUser.id);
          created++;
        } else {
          const patch =
            mode === "keep"
              ? await prisma.user
                  .findUnique({ where: { id: existingId } })
                  .then((cur) => ({
                    weight: cur?.weight ?? u.weight,
                    height: cur?.height ?? u.height,
                    age: cur?.age ?? u.age,
                    gender: cur?.gender ?? u.gender,
                    activityLevel: cur?.activityLevel ?? u.activityLevel,
                    goal: cur?.goal ?? u.goal,
                    customCalories: cur?.customCalories ?? u.customCalories,
                    customProtein: cur?.customProtein ?? u.customProtein,
                    customCarbs: cur?.customCarbs ?? u.customCarbs,
                    customFat: cur?.customFat ?? u.customFat,
                    planningAlertScope:
                      cur?.planningAlertScope ?? u.planningAlertScope,
                  }))
              : {
                  weight: u.weight ?? null,
                  height: u.height ?? null,
                  age: u.age ?? null,
                  gender: u.gender ?? null,
                  activityLevel: u.activityLevel ?? null,
                  goal: u.goal ?? null,
                  customCalories: u.customCalories ?? null,
                  customProtein: u.customProtein ?? null,
                  customCarbs: u.customCarbs ?? null,
                  customFat: u.customFat ?? null,
                  planningAlertScope: u.planningAlertScope ?? null,
                };
          await prisma.user.update({ where: { id: existingId }, data: patch });
          updated++;
        }
      }
      results.users = { created, skipped, updated };
    }

    // ── 2. HOUSEHOLDS ──────────────────────────────────────────────────────
    if (data.households) {
      let created = 0,
        skipped = 0,
        updated = 0;
      for (const h of data.households) {
        const firstMemberEmail = h.members?.[0]?.userEmail;
        const firstMemberId = firstMemberEmail
          ? emailToId.get(firstMemberEmail)
          : null;
        let householdId: number | null = null;
        if (firstMemberId) {
          const existing = await prisma.householdMember.findFirst({
            where: { userId: firstMemberId },
            select: { householdId: true },
          });
          if (existing) householdId = existing.householdId;
        }
        if (householdId) {
          householdNameToId.set(h.name, householdId);
          if (mode === "overwrite") {
            await prisma.household.update({
              where: { id: householdId },
              data: {
                name: h.name,
                shareHome: h.shareHome,
                shareShopping: h.shareShopping,
                shareAlerts: h.shareAlerts,
              },
            });
            updated++;
          } else {
            skipped++;
          }
          continue;
        }
        const newH = await prisma.household.create({
          data: {
            name: h.name,
            shareHome: h.shareHome ?? true,
            shareShopping: h.shareShopping ?? true,
            shareAlerts: h.shareAlerts ?? true,
          },
        });
        householdId = newH.id;
        householdNameToId.set(h.name, householdId);
        for (const m of h.members || []) {
          const memberId = emailToId.get(m.userEmail);
          if (!memberId) continue;
          await prisma.householdMember.upsert({
            where: { userId_householdId: { userId: memberId, householdId } },
            create: { userId: memberId, householdId, role: m.role ?? "MEMBER" },
            update: { role: m.role ?? "MEMBER" },
          });
        }
        created++;
      }
      results.households = { created, skipped, updated };
    }

    // ── 3. INGREDIENTES ────────────────────────────────────────────────────
    if (data.ingredients) {
      let created = 0,
        skipped = 0,
        updated = 0;
      for (const ing of data.ingredients) {
        const isGlobal = ing.status === "GLOBAL" || !ing.status;
        const creatorId = ing.createdByEmail
          ? emailToId.get(ing.createdByEmail)
          : null;

        const existing = await prisma.ingredient.findFirst({
          where: isGlobal
            ? { name: ing.name, status: "GLOBAL" }
            : {
                name: ing.name,
                createdByUserId: creatorId ?? undefined,
                status: ing.status,
              },
        });

        if (existing) {
          ingNameToId.set(ing.name, existing.id);
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
            if (ing.variants) {
              await prisma.ingredientVariant.deleteMany({
                where: { ingredientId: existing.id },
              });
              for (const v of ing.variants) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { createdByEmail, id, ...vData } = v as any;
                await prisma.ingredientVariant.create({
                  data: {
                    ...vData,
                    createdByUserId: createdByEmail
                      ? (emailToId.get(createdByEmail) ?? null)
                      : null,
                    ingredientId: existing.id,
                  },
                });
              }
            }
            if (ing.conversions) {
              await prisma.unitConversion.deleteMany({
                where: { ingredientId: existing.id },
              });
              for (const c of ing.conversions) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id: _cid, ingredientId: _ciid, ...cData } = c as any;
                await prisma.unitConversion.create({
                  data: { ...cData, ingredientId: existing.id },
                });
              }
            }
            updated++;
          } else {
            skipped++;
          }
        } else {
          const newIng = await prisma.ingredient.create({
            data: {
              name: ing.name,
              status: ing.status ?? "GLOBAL",
              unit: ing.unit,
              preferredUnit: ing.preferredUnit,
              defaultLocation: ing.defaultLocation,
              imageUrl: ing.imageUrl,
              createdByUserId: creatorId ?? null,
              variants: ing.variants
                ? {
                    create: ing.variants.map((v: any) => ({
                      name: v.name,
                      isDefault: v.isDefault,
                      isGlobal: v.isGlobal ?? true,
                      calories: v.calories,
                      protein: v.protein,
                      carbs: v.carbs,
                      fat: v.fat,
                      fiber: v.fiber,
                      weightFactor: v.weightFactor ?? 1,
                      createdByUserId: v.createdByEmail
                        ? (emailToId.get(v.createdByEmail) ?? null)
                        : null,
                    })),
                  }
                : undefined,
              conversions: ing.conversions
                ? { create: ing.conversions }
                : undefined,
            },
          });
          ingNameToId.set(ing.name, newIng.id);
          created++;
        }
      }
      // Rellenar ingNameToId para ingredientes ya existentes que no se crearon ahora
      const allIngs = await prisma.ingredient.findMany({
        select: { id: true, name: true },
      });
      for (const i of allIngs) {
        ingNameToId.set(i.name, i.id);
      }
      // Rellenar variantKeyToId
      const allVariants = await prisma.ingredientVariant.findMany({
        include: { ingredient: { select: { name: true } } },
      });
      for (const v of allVariants) {
        variantKeyToId.set(`${v.ingredient.name}::${v.name}`, v.id);
      }
      results.ingredients = { created, skipped, updated };
    } else {
      // Sin importar ingredientes, aún necesitamos los mapas
      const allIngs = await prisma.ingredient.findMany({
        select: { id: true, name: true },
      });
      for (const i of allIngs) ingNameToId.set(i.name, i.id);
      const allVariants = await prisma.ingredientVariant.findMany({
        include: { ingredient: { select: { name: true } } },
      });
      for (const v of allVariants)
        variantKeyToId.set(`${v.ingredient.name}::${v.name}`, v.id);
    }

    // ── 4. TAGS DE INGREDIENTES ────────────────────────────────────────────
    if (data.ingredientTags) {
      let created = 0,
        skipped = 0,
        updated = 0;
      for (const t of data.ingredientTags) {
        const creatorId = t.createdByEmail
          ? emailToId.get(t.createdByEmail)
          : null;
        const existing = await prisma.ingredientTag.findFirst({
          where: { name: t.name },
        });
        if (existing) {
          tagNameToId.set(t.name, existing.id);
          if (mode === "overwrite") {
            await prisma.ingredientTag.update({
              where: { id: existing.id },
              data: { color: t.color, isGlobal: t.isGlobal },
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          const newTag = await prisma.ingredientTag.create({
            data: {
              name: t.name,
              color: t.color,
              isGlobal: t.isGlobal ?? false,
              createdByUserId: creatorId ?? null,
            },
          });
          tagNameToId.set(t.name, newTag.id);
          created++;
        }
      }
      // Rellenar mapa para tags existentes no creados ahora
      const allTags = await prisma.ingredientTag.findMany({
        select: { id: true, name: true },
      });
      for (const tag of allTags) tagNameToId.set(tag.name, tag.id);
      results.ingredientTags = { created, skipped, updated };
    } else {
      const allTags = await prisma.ingredientTag.findMany({
        select: { id: true, name: true },
      });
      for (const tag of allTags) tagNameToId.set(tag.name, tag.id);
    }

    // ── 5. ASIGNACIONES Y OCULTOS DE TAGS ─────────────────────────────────
    if (data.ingredientTagAssignments) {
      let created = 0,
        skipped = 0;
      for (const a of data.ingredientTagAssignments) {
        const ingId = ingNameToId.get(a.ingredientName);
        const tagId = tagNameToId.get(a.tagName);
        const userId = a.userEmail
          ? (emailToId.get(a.userEmail) ?? null)
          : null;
        if (!ingId || !tagId) {
          skipped++;
          continue;
        }
        await prisma.ingredientTagAssignment
          .upsert({
            where: {
              ingredientId_tagId_userId: {
                ingredientId: ingId,
                tagId,
                userId: userId ?? 0,
              },
            } as any,
            create: { ingredientId: ingId, tagId, userId },
            update: {},
          })
          .catch(() => skipped++);
        created++;
      }
      results.ingredientTagAssignments = { created, skipped, updated: 0 };
    }

    if (data.ingredientTagHidden) {
      let created = 0,
        skipped = 0;
      for (const h of data.ingredientTagHidden) {
        const userId = emailToId.get(h.userEmail);
        const ingId = ingNameToId.get(h.ingredientName);
        const tagId = tagNameToId.get(h.tagName);
        if (!userId || !ingId || !tagId) {
          skipped++;
          continue;
        }
        await prisma.ingredientTagHidden.upsert({
          where: {
            userId_ingredientId_tagId: { userId, ingredientId: ingId, tagId },
          },
          create: { userId, ingredientId: ingId, tagId },
          update: {},
        });
        created++;
      }
      results.ingredientTagHidden = { created, skipped, updated: 0 };
    }

    // ── 6. OVERRIDES DE INGREDIENTES ──────────────────────────────────────
    if (data.ingredientUserOverrides) {
      let created = 0,
        skipped = 0,
        updated = 0;
      for (const o of data.ingredientUserOverrides) {
        const userId = emailToId.get(o.userEmail);
        const ingId = ingNameToId.get(o.ingredientName);
        if (!userId || !ingId) {
          skipped++;
          continue;
        }
        await prisma.ingredientUserOverride.upsert({
          where: { userId_ingredientId: { userId, ingredientId: ingId } },
          create: {
            userId,
            ingredientId: ingId,
            preferredUnit: o.preferredUnit,
            imageUrl: o.imageUrl,
            defaultLocation: o.defaultLocation,
            purchaseIsIndifferent: o.purchaseIsIndifferent ?? false,
          },
          update:
            mode === "overwrite"
              ? {
                  preferredUnit: o.preferredUnit,
                  imageUrl: o.imageUrl,
                  defaultLocation: o.defaultLocation,
                  purchaseIsIndifferent: o.purchaseIsIndifferent ?? false,
                }
              : {},
        });
        created++;
      }
      results.ingredientUserOverrides = { created, skipped, updated };
    }

    if (data.ingredientVariantOverrides) {
      let created = 0,
        skipped = 0,
        updated = 0;
      for (const o of data.ingredientVariantOverrides) {
        const userId = emailToId.get(o.userEmail);
        const variantId = variantKeyToId.get(
          `${o.ingredientName}::${o.variantName}`,
        );
        if (!userId || !variantId) {
          skipped++;
          continue;
        }
        await prisma.ingredientVariantUserOverride.upsert({
          where: { userId_variantId: { userId, variantId } },
          create: {
            userId,
            variantId,
            calories: o.calories,
            protein: o.protein,
            carbs: o.carbs,
            fat: o.fat,
            fiber: o.fiber,
            weightFactor: o.weightFactor,
          },
          update:
            mode === "overwrite"
              ? {
                  calories: o.calories,
                  protein: o.protein,
                  carbs: o.carbs,
                  fat: o.fat,
                  fiber: o.fiber,
                  weightFactor: o.weightFactor,
                }
              : {},
        });
        created++;
      }
      results.ingredientVariantOverrides = { created, skipped, updated };
    }

    if (data.ingredientConversionOverrides) {
      let created = 0,
        skipped = 0,
        updated = 0;
      for (const o of data.ingredientConversionOverrides) {
        const userId = emailToId.get(o.userEmail);
        const ingId = ingNameToId.get(o.ingredientName);
        if (!userId || !ingId) {
          skipped++;
          continue;
        }
        await prisma.ingredientConversionUserOverride.upsert({
          where: {
            userId_ingredientId_unitName: {
              userId,
              ingredientId: ingId,
              unitName: o.unitName,
            },
          },
          create: {
            userId,
            ingredientId: ingId,
            unitName: o.unitName,
            gramsPerUnit: o.gramsPerUnit,
          },
          update: mode === "overwrite" ? { gramsPerUnit: o.gramsPerUnit } : {},
        });
        created++;
      }
      results.ingredientConversionOverrides = { created, skipped, updated };
    }

    // ── 7. RECETAS ────────────────────────────────────────────────────────
    if (data.recipes) {
      let created = 0,
        skipped = 0,
        updated = 0;
      for (const rec of data.recipes) {
        const userId = emailToId.get(rec.userEmail);
        if (!userId) {
          skipped++;
          continue;
        }

        const ingredientConnects = [];
        for (const ri of rec.ingredients || []) {
          let ingId = ingNameToId.get(ri.ingredientName);
          if (!ingId) {
            const newIng = await prisma.ingredient.create({
              data: { name: ri.ingredientName, unit: ri.unit || "g" },
            });
            ingId = newIng.id;
            ingNameToId.set(ri.ingredientName, ingId);
          }
          const variantId = ri.variantName
            ? (variantKeyToId.get(`${ri.ingredientName}::${ri.variantName}`) ??
              null)
            : null;
          const cookedVariantId = ri.cookedVariantName
            ? (variantKeyToId.get(
                `${ri.ingredientName}::${ri.cookedVariantName}`,
              ) ?? null)
            : null;
          ingredientConnects.push({
            quantity: ri.quantity,
            unit: ri.unit,
            ingredientId: ingId,
            variantId,
            cookedVariantId,
          });
        }

        const existing = await prisma.recipe.findFirst({
          where: { title: rec.title, userId },
        });
        if (existing) {
          recipeKeyToId.set(`${rec.userEmail}::${rec.title}`, existing.id);
          if (mode === "overwrite") {
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
                defaultLocation: rec.defaultLocation,
                ingredients: { create: ingredientConnects },
              },
            });
            for (const comp of rec.components || []) {
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
                          ingredientId: o.ingredientName
                            ? (ingNameToId.get(o.ingredientName) ?? null)
                            : null,
                          variantId:
                            o.variantName && o.ingredientName
                              ? (variantKeyToId.get(
                                  `${o.ingredientName}::${o.variantName}`,
                                ) ?? null)
                              : null,
                        })),
                      }
                    : undefined,
                },
              });
            }
            updated++;
          } else {
            skipped++;
          }
          continue;
        }

        const newRecipe = await prisma.recipe.create({
          data: {
            title: rec.title,
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
            defaultLocation: rec.defaultLocation,
            userId,
            ingredients: { create: ingredientConnects },
          },
        });
        recipeKeyToId.set(`${rec.userEmail}::${rec.title}`, newRecipe.id);
        for (const comp of rec.components || []) {
          await prisma.recipeComponent.create({
            data: {
              name: comp.name,
              sortOrder: comp.sortOrder ?? 0,
              isOptional: comp.isOptional ?? false,
              defaultEnabled: comp.defaultEnabled ?? true,
              recipeId: newRecipe.id,
              options: comp.options
                ? {
                    create: comp.options.map((o: any) => ({
                      name: o.name,
                      isDefault: o.isDefault ?? false,
                      quantity: o.quantity,
                      unit: o.unit,
                      recipeServings: o.recipeServings,
                      ingredientId: o.ingredientName
                        ? (ingNameToId.get(o.ingredientName) ?? null)
                        : null,
                      variantId:
                        o.variantName && o.ingredientName
                          ? (variantKeyToId.get(
                              `${o.ingredientName}::${o.variantName}`,
                            ) ?? null)
                          : null,
                    })),
                  }
                : undefined,
            },
          });
        }
        created++;
      }
      // Rellenar mapa de recetas existentes
      const allRecipes = await prisma.recipe.findMany({
        select: { id: true, title: true, userId: true },
      });
      const userIdToEmail = new Map(
        [...emailToId.entries()].map(([e, id]) => [id, e]),
      );
      for (const r of allRecipes) {
        const email = userIdToEmail.get(r.userId) ?? "";
        recipeKeyToId.set(`${email}::${r.title}`, r.id);
      }
      results.recipes = { created, skipped, updated };
    } else {
      const allRecipes = await prisma.recipe.findMany({
        select: { id: true, title: true, userId: true },
      });
      const userIdToEmail = new Map(
        [...emailToId.entries()].map(([e, id]) => [id, e]),
      );
      for (const r of allRecipes) {
        const email = userIdToEmail.get(r.userId) ?? "";
        recipeKeyToId.set(`${email}::${r.title}`, r.id);
      }
    }

    // ── 8. WEEK PLANS ─────────────────────────────────────────────────────
    if (data.weekPlans) {
      let created = 0,
        skipped = 0,
        updated = 0;
      for (const wp of data.weekPlans) {
        const userId = emailToId.get(wp.userEmail);
        if (!userId) {
          skipped++;
          continue;
        }
        const plannedDate = new Date(wp.plannedDate);
        const recipeId = wp.recipeTitle
          ? (recipeKeyToId.get(`${wp.userEmail}::${wp.recipeTitle}`) ?? null)
          : null;
        const ingredientId = wp.ingredientName
          ? (ingNameToId.get(wp.ingredientName) ?? null)
          : null;

        const existing = await prisma.weekPlan.findFirst({
          where: {
            userId,
            plannedDate,
            type: wp.type,
            recipeId: recipeId ?? undefined,
          },
        });
        if (existing) {
          if (mode === "overwrite") {
            await prisma.weekPlan.update({
              where: { id: existing.id },
              data: {
                servings: wp.servings,
                cooked: wp.cooked,
                consumed: wp.consumed,
              },
            });
            updated++;
          } else {
            skipped++;
          }
          continue;
        }
        await prisma.weekPlan.create({
          data: {
            userId,
            plannedDate,
            servings: wp.servings,
            type: wp.type ?? "meal",
            cooked: wp.cooked ?? false,
            consumed: wp.consumed ?? false,
            recipeId,
            ingredientId,
            ingredientQty: wp.ingredientQty,
            ingredientUnit: wp.ingredientUnit,
          },
        });
        created++;
      }
      results.weekPlans = { created, skipped, updated };
    }

    // ── 9. HOME ITEMS ─────────────────────────────────────────────────────
    if (data.homeItems) {
      let created = 0,
        skipped = 0;
      for (const hi of data.homeItems) {
        const userId = emailToId.get(hi.userEmail);
        if (!userId) {
          skipped++;
          continue;
        }
        const ingId = hi.ingredientName
          ? (ingNameToId.get(hi.ingredientName) ?? null)
          : null;
        const recId = hi.recipeTitle
          ? (recipeKeyToId.get(`${hi.userEmail}::${hi.recipeTitle}`) ?? null)
          : null;
        const varId =
          hi.variantName && hi.ingredientName
            ? (variantKeyToId.get(`${hi.ingredientName}::${hi.variantName}`) ??
              null)
            : null;

        const newItem = await prisma.homeItem.create({
          data: {
            userId,
            location: hi.location ?? "PANTRY",
            quantity: hi.quantity,
            unit: hi.unit,
            addedAt: hi.addedAt ? new Date(hi.addedAt) : new Date(),
            expiresAt: hi.expiresAt ? new Date(hi.expiresAt) : null,
            ingredientId: ingId,
            recipeId: recId,
            variantId: varId,
          },
        });
        for (const h of hi.histories || []) {
          await prisma.homeItemHistory.create({
            data: {
              homeItemId: newItem.id,
              userId,
              action: h.action,
              quantity: h.quantity,
              unit: h.unit,
              origin: h.origin,
              createdAt: new Date(h.createdAt),
            },
          });
        }
        created++;
      }
      results.homeItems = { created, skipped, updated: 0 };
    }

    // ── 10. SHOPPING ITEMS ────────────────────────────────────────────────
    if (data.shoppingItems) {
      let created = 0,
        skipped = 0;
      for (const si of data.shoppingItems) {
        const userId = emailToId.get(si.userEmail);
        const ingId = ingNameToId.get(si.ingredientName);
        if (!userId || !ingId) {
          skipped++;
          continue;
        }
        const existing = await prisma.shoppingItem.findFirst({
          where: { userId, ingredientId: ingId, purchased: false },
        });
        if (existing) {
          skipped++;
          continue;
        }
        await prisma.shoppingItem.create({
          data: {
            userId,
            ingredientId: ingId,
            quantity: si.quantity,
            unit: si.unit,
            purchased: si.purchased ?? false,
          },
        });
        created++;
      }
      results.shoppingItems = { created, skipped, updated: 0 };
    }

    // ── 11. THRESHOLDS ────────────────────────────────────────────────────
    if (data.thresholds?.ingredients) {
      let created = 0,
        skipped = 0,
        updated = 0;
      for (const t of data.thresholds.ingredients) {
        const userId = t.userEmail
          ? (emailToId.get(t.userEmail) ?? null)
          : null;
        const ingId = ingNameToId.get(t.ingredientName);
        if (!ingId) {
          skipped++;
          continue;
        }
        const existing = await prisma.ingredientMinThreshold.findFirst({
          where: userId
            ? { ingredientId: ingId, userId }
            : { ingredientId: ingId },
        });
        if (existing) {
          if (mode === "overwrite") {
            await prisma.ingredientMinThreshold.update({
              where: { id: existing.id },
              data: { minQuantity: t.minQuantity, unit: t.unit },
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          await prisma.ingredientMinThreshold.create({
            data: {
              ingredientId: ingId,
              minQuantity: t.minQuantity,
              unit: t.unit,
              userId,
            },
          });
          created++;
        }
      }
      results.ingredientThresholds = { created, skipped, updated };
    }
    if (data.thresholds?.recipes) {
      let created = 0,
        skipped = 0,
        updated = 0;
      for (const t of data.thresholds.recipes) {
        const userId = t.userEmail
          ? (emailToId.get(t.userEmail) ?? null)
          : null;
        const recId = Object.values(Object.fromEntries(recipeKeyToId)).find(
          (_, i) =>
            [...recipeKeyToId.entries()][i][0].endsWith(`::${t.recipeTitle}`),
        ) as any;
        const actualRecId =
          [...recipeKeyToId.entries()].find(([k]) =>
            k.endsWith(`::${t.recipeTitle}`),
          )?.[1] ?? null;
        if (!actualRecId) {
          skipped++;
          continue;
        }
        const existing = await prisma.recipeMinThreshold.findFirst({
          where: userId
            ? { recipeId: actualRecId, userId }
            : { recipeId: actualRecId },
        });
        if (existing) {
          if (mode === "overwrite") {
            await prisma.recipeMinThreshold.update({
              where: { id: existing.id },
              data: { minServings: t.minServings },
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          await prisma.recipeMinThreshold.create({
            data: { recipeId: actualRecId, minServings: t.minServings, userId },
          });
          created++;
        }
      }
      results.recipeThresholds = { created, skipped, updated };
    }

    // ── 12. STOCK ALERTS ──────────────────────────────────────────────────
    if (data.stockAlerts) {
      let created = 0,
        skipped = 0;
      for (const a of data.stockAlerts) {
        const userId = emailToId.get(a.userEmail);
        if (!userId) {
          skipped++;
          continue;
        }
        const ingId = a.ingredientName
          ? (ingNameToId.get(a.ingredientName) ?? null)
          : null;
        const recId = a.recipeTitle
          ? ([...recipeKeyToId.entries()].find(([k]) =>
              k.endsWith(`::${a.recipeTitle}`),
            )?.[1] ?? null)
          : null;
        await prisma.stockAlert.create({
          data: {
            userId,
            status: a.status ?? "OPEN",
            triggerType: a.triggerType,
            beforeQty: a.beforeQty,
            deltaQty: a.deltaQty,
            afterQty: a.afterQty,
            minimum: a.minimum,
            message: a.message,
            createdAt: new Date(a.createdAt),
            snoozedUntil: a.snoozedUntil ? new Date(a.snoozedUntil) : null,
            ingredientId: ingId,
            recipeId: recId,
          },
        });
        created++;
      }
      results.stockAlerts = { created, skipped, updated: 0 };
    }

    // ── 13. PROPUESTAS ────────────────────────────────────────────────────
    if (data.proposals) {
      let created = 0,
        skipped = 0;
      for (const p of data.proposals) {
        const proposedById = emailToId.get(p.proposedByEmail);
        const ingId = ingNameToId.get(p.ingredientName);
        if (!proposedById || !ingId) {
          skipped++;
          continue;
        }
        const varId = p.variantName
          ? (variantKeyToId.get(`${p.ingredientName}::${p.variantName}`) ??
            null)
          : null;
        const reviewedById = p.reviewedByEmail
          ? (emailToId.get(p.reviewedByEmail) ?? null)
          : null;
        const existing = await prisma.ingredientProposal.findFirst({
          where: {
            proposedByUserId: proposedById,
            ingredientId: ingId,
            type: p.type,
            fieldName: p.fieldName ?? null,
            status: "PENDING",
          },
        });
        if (existing) {
          skipped++;
          continue;
        }
        await prisma.ingredientProposal.create({
          data: {
            type: p.type,
            status: p.status ?? "PENDING",
            proposedByUserId: proposedById,
            reviewedByUserId: reviewedById,
            ingredientId: ingId,
            variantId: varId,
            fieldName: p.fieldName,
            currentValue: p.currentValue,
            proposedValue: p.proposedValue,
            adminNote: p.adminNote,
            createdAt: new Date(p.createdAt),
          },
        });
        created++;
      }
      results.proposals = { created, skipped, updated: 0 };
    }

    // ── 14. TIENDAS DE USUARIO ────────────────────────────────────────────
    if (data.userStores) {
      let created = 0,
        skipped = 0,
        updated = 0;
      for (const s of data.userStores) {
        const userId = emailToId.get(s.userEmail);
        if (!userId) {
          skipped++;
          continue;
        }
        const existing = await prisma.userStore.findFirst({
          where: { userId, name: s.name },
        });
        if (existing) {
          if (mode === "overwrite") {
            await prisma.userStore.update({
              where: { id: existing.id },
              data: {
                url: s.url,
                logoUrl: s.logoUrl,
                isShared: s.isShared ?? false,
              },
            });
            for (const si of s.ingredients || []) {
              const ingId = ingNameToId.get(si.ingredientName);
              if (!ingId) continue;
              await prisma.userStoreIngredient.upsert({
                where: {
                  storeId_ingredientId: {
                    storeId: existing.id,
                    ingredientId: ingId,
                  },
                },
                create: {
                  storeId: existing.id,
                  ingredientId: ingId,
                  purchaseUrl: si.purchaseUrl,
                  preferredUnit: si.preferredUnit,
                  sortOrder: si.sortOrder,
                },
                update: {
                  purchaseUrl: si.purchaseUrl,
                  preferredUnit: si.preferredUnit,
                  sortOrder: si.sortOrder,
                },
              });
            }
            updated++;
          } else {
            skipped++;
          }
          continue;
        }
        const newStore = await prisma.userStore.create({
          data: {
            userId,
            name: s.name,
            url: s.url,
            logoUrl: s.logoUrl,
            isShared: s.isShared ?? false,
          },
        });
        for (const si of s.ingredients || []) {
          const ingId = ingNameToId.get(si.ingredientName);
          if (!ingId) continue;
          await prisma.userStoreIngredient.create({
            data: {
              storeId: newStore.id,
              ingredientId: ingId,
              purchaseUrl: si.purchaseUrl,
              preferredUnit: si.preferredUnit,
              sortOrder: si.sortOrder,
            },
          });
        }
        created++;
      }
      results.userStores = { created, skipped, updated };
    }

    return { mode, results };
  },

  async exportGlobal() {
    const [
      users,
      ingredients,
      recipes,
      weekPlans,
      homeItems,
      shoppingItems,
      thresholdsIng,
      thresholdsRec,
      households,
      ingredientOverrides,
      variantOverrides,
      conversionOverrides,
      tags,
      tagAssignments,
      tagHidden,
      proposals,
      stores,
      stockAlerts,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          password: true,
          name: true,
          role: true,
          createdAt: true,
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
        include: {
          user: { select: { email: true, name: true } },
          ingredients: {
            include: {
              ingredient: true,
              variant: true,
              cookedVariant: true,
            },
          },
          components: {
            include: {
              options: {
                include: {
                  recipe: { select: { title: true } },
                  ingredient: { select: { name: true } },
                  variant: {
                    select: {
                      name: true,
                      ingredient: { select: { name: true } },
                    },
                  },
                  cookedVariant: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
      prisma.weekPlan.findMany({
        include: {
          user: { select: { email: true } },
          recipe: { select: { title: true } },
          ingredient: { select: { name: true } },
          selections: {
            include: {
              option: {
                include: {
                  component: {
                    select: { name: true, recipe: { select: { title: true } } },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.homeItem.findMany({
        include: {
          user: { select: { email: true } },
          ingredient: { select: { name: true } },
          recipe: { select: { title: true } },
          variant: {
            select: { name: true, ingredient: { select: { name: true } } },
          },
          histories: true,
        },
      }),
      prisma.shoppingItem.findMany({
        include: {
          user: { select: { email: true } },
          ingredient: { select: { name: true } },
        },
      }),
      prisma.ingredientMinThreshold.findMany({ include: { ingredient: true } }),
      prisma.recipeMinThreshold.findMany({ include: { recipe: true } }),
      prisma.household.findMany({
        include: {
          members: { include: { user: { select: { email: true } } } },
        },
      }),
      prisma.ingredientUserOverride.findMany({
        include: {
          user: { select: { email: true } },
          ingredient: { select: { name: true } },
        },
      }),
      prisma.ingredientVariantUserOverride.findMany({
        include: {
          user: { select: { email: true } },
          variant: { include: { ingredient: { select: { name: true } } } },
        },
      }),
      prisma.ingredientConversionUserOverride.findMany({
        include: {
          user: { select: { email: true } },
          ingredient: { select: { name: true } },
        },
      }),
      prisma.ingredientTag.findMany({
        include: { createdBy: { select: { email: true } } },
      }),
      prisma.ingredientTagAssignment.findMany({
        include: {
          ingredient: { select: { name: true } },
          tag: { select: { name: true } },
          user: { select: { email: true } },
        },
      }),
      prisma.ingredientTagHidden.findMany({
        include: {
          user: { select: { email: true } },
          ingredient: { select: { name: true } },
          tag: { select: { name: true } },
        },
      }),
      prisma.ingredientProposal.findMany({
        include: {
          proposedBy: { select: { email: true } },
          reviewedBy: { select: { email: true } },
          ingredient: { select: { name: true } },
          variant: { select: { name: true } },
        },
      }),
      prisma.userStore.findMany({
        include: {
          user: { select: { email: true } },
          ingredients: { include: { ingredient: { select: { name: true } } } },
        },
      }),
      prisma.stockAlert.findMany({
        include: {
          user: { select: { email: true } },
        },
      }),
    ]);

    // Mapa id→email para resolver referencias de threshold
    const userById = new Map(users.map((u) => [u.id, u.email]));
    // Mapas auxiliares para StockAlert (no tiene relaciones a ingredient/recipe)
    const ingNameToExport = new Map(ingredients.map((i) => [i.name, i.id]));
    const recTitleToExport = new Map(recipes.map((r) => [r.title, r.id]));

    return {
      exportDate: new Date().toISOString(),
      version: "2.0",
      type: "global-admin",
      data: {
        users: users.map((u) => ({
          email: u.email,
          passwordHash: u.password,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
          imageUrl: u.imageUrl,
          weight: u.weight,
          height: u.height,
          age: u.age,
          gender: u.gender,
          activityLevel: u.activityLevel,
          goal: u.goal,
          customCalories: u.customCalories,
          customProtein: u.customProtein,
          customCarbs: u.customCarbs,
          customFat: u.customFat,
          planningAlertScope: u.planningAlertScope,
        })),

        households: households.map((h) => ({
          name: h.name,
          shareHome: h.shareHome,
          shareShopping: h.shareShopping,
          shareAlerts: h.shareAlerts,
          members: h.members.map((m) => ({
            userEmail: m.user.email,
            role: m.role,
          })),
        })),

        ingredients: ingredients.map((i) => ({
          name: i.name,
          status: i.status,
          unit: i.unit,
          preferredUnit: i.preferredUnit,
          defaultLocation: i.defaultLocation,
          imageUrl: i.imageUrl,
          createdByEmail: userById.get(i.createdByUserId ?? -1) ?? null,
          variants: i.variants.map((v) => ({
            name: v.name,
            isDefault: v.isDefault,
            isGlobal: v.isGlobal,
            createdByEmail: userById.get(v.createdByUserId ?? -1) ?? null,
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

        ingredientTags: tags.map((t) => ({
          name: t.name,
          color: t.color,
          isGlobal: t.isGlobal,
          createdByEmail: t.createdBy?.email ?? null,
        })),

        ingredientTagAssignments: tagAssignments.map((a) => ({
          ingredientName: a.ingredient.name,
          tagName: a.tag.name,
          userEmail: a.user?.email ?? null,
        })),

        ingredientTagHidden: tagHidden.map((h) => ({
          userEmail: h.user.email,
          ingredientName: h.ingredient.name,
          tagName: h.tag.name,
        })),

        ingredientUserOverrides: ingredientOverrides.map((o) => ({
          userEmail: o.user.email,
          ingredientName: o.ingredient.name,
          preferredUnit: o.preferredUnit,
          imageUrl: o.imageUrl,
          defaultLocation: o.defaultLocation,
          purchaseIsIndifferent: o.purchaseIsIndifferent,
        })),

        ingredientVariantOverrides: variantOverrides.map((o) => ({
          userEmail: o.user.email,
          ingredientName: o.variant.ingredient.name,
          variantName: o.variant.name,
          calories: o.calories,
          protein: o.protein,
          carbs: o.carbs,
          fat: o.fat,
          fiber: o.fiber,
          weightFactor: o.weightFactor,
        })),

        ingredientConversionOverrides: conversionOverrides.map((o) => ({
          userEmail: o.user.email,
          ingredientName: o.ingredient.name,
          unitName: o.unitName,
          gramsPerUnit: o.gramsPerUnit,
        })),

        recipes: recipes.map((r) => ({
          userEmail: r.user.email,
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
          defaultLocation: r.defaultLocation,
          ingredients: r.ingredients.map((ri) => ({
            ingredientName: ri.ingredient.name,
            quantity: ri.quantity,
            unit: ri.unit,
            variantName: ri.variant?.name ?? null,
            cookedVariantName: ri.cookedVariant?.name ?? null,
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
              ingredientName: o.ingredient?.name ?? null,
              variantName: o.variant?.name ?? null,
              cookedVariantName: o.cookedVariant?.name ?? null,
            })),
          })),
        })),

        weekPlans: weekPlans.map((wp) => ({
          userEmail: wp.user.email,
          plannedDate: wp.plannedDate.toISOString(),
          servings: wp.servings,
          type: wp.type,
          cooked: wp.cooked,
          consumed: wp.consumed,
          recipeTitle: wp.recipe?.title ?? null,
          ingredientName: wp.ingredient?.name ?? null,
          ingredientQty: wp.ingredientQty,
          ingredientUnit: wp.ingredientUnit,
          selections: wp.selections.map((s) => ({
            componentName: (s.option as any).component?.name ?? null,
            recipeTitle: (s.option as any).component?.recipe?.title ?? null,
            optionName: s.option.name,
          })),
        })),

        homeItems: homeItems.map((hi) => ({
          userEmail: hi.user.email,
          location: hi.location,
          quantity: hi.quantity,
          unit: hi.unit,
          addedAt: hi.addedAt.toISOString(),
          expiresAt: hi.expiresAt?.toISOString() ?? null,
          ingredientName: hi.ingredient?.name ?? null,
          recipeTitle: hi.recipe?.title ?? null,
          variantName: hi.variant?.name ?? null,
          histories: hi.histories.map((h) => ({
            action: h.action,
            quantity: h.quantity,
            unit: h.unit,
            origin: h.origin,
            createdAt: h.createdAt.toISOString(),
          })),
        })),

        shoppingItems: shoppingItems.map((si) => ({
          userEmail: si.user.email,
          ingredientName: si.ingredient.name,
          quantity: si.quantity,
          unit: si.unit,
          purchased: si.purchased,
        })),

        thresholds: {
          ingredients: thresholdsIng.map((t) => ({
            userEmail: userById.get(t.userId ?? -1) ?? null,
            ingredientName: t.ingredient.name,
            minQuantity: t.minQuantity,
            unit: t.unit,
          })),
          recipes: thresholdsRec.map((t) => ({
            userEmail: userById.get(t.userId ?? -1) ?? null,
            recipeTitle: t.recipe.title,
            minServings: t.minServings,
          })),
        },

        stockAlerts: stockAlerts.map((a) => {
          const ingName = a.ingredientId
            ? ([...ingNameToExport.entries()].find(
                ([, id]) => id === a.ingredientId,
              )?.[0] ?? null)
            : null;
          const recTitle = a.recipeId
            ? ([...recTitleToExport.entries()].find(
                ([, id]) => id === a.recipeId,
              )?.[0] ?? null)
            : null;
          return {
            userEmail: a.user.email,
            status: a.status,
            triggerType: a.triggerType,
            beforeQty: a.beforeQty,
            deltaQty: a.deltaQty,
            afterQty: a.afterQty,
            minimum: a.minimum,
            message: a.message,
            createdAt: a.createdAt.toISOString(),
            snoozedUntil: a.snoozedUntil?.toISOString() ?? null,
            ingredientName: ingName,
            recipeTitle: recTitle,
          };
        }),

        proposals: proposals.map((p) => ({
          type: p.type,
          status: p.status,
          proposedByEmail: p.proposedBy.email,
          reviewedByEmail: p.reviewedBy?.email ?? null,
          ingredientName: p.ingredient.name,
          variantName: p.variant?.name ?? null,
          fieldName: p.fieldName,
          currentValue: p.currentValue,
          proposedValue: p.proposedValue,
          adminNote: p.adminNote,
          createdAt: p.createdAt.toISOString(),
        })),

        userStores: stores.map((s) => ({
          userEmail: s.user.email,
          name: s.name,
          url: s.url,
          logoUrl: s.logoUrl,
          isShared: s.isShared,
          ingredients: s.ingredients.map((si) => ({
            ingredientName: si.ingredient.name,
            purchaseUrl: si.purchaseUrl,
            preferredUnit: si.preferredUnit,
            sortOrder: si.sortOrder,
          })),
        })),
      },
    };
  },
};
