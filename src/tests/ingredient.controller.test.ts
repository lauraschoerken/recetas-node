import request from "supertest";
import { createApp } from "../app";
import { createTestUser, cleanupTestUser, TestUser } from "./helpers";
import { PrismaClient } from "@prisma/client";

const app = createApp();
const prisma = new PrismaClient();

describe("Ingredient Controller", () => {
  let testUser: TestUser;
  const createdIngredientIds: number[] = [];

  beforeAll(async () => {
    testUser = await createTestUser("ingredient");
  });

  afterAll(async () => {
    // Cleanup created ingredients
    for (const id of createdIngredientIds) {
      try {
        await prisma.unitConversion.deleteMany({ where: { ingredientId: id } });
        await prisma.ingredient.delete({ where: { id } });
      } catch (e) {
        // Ignore
      }
    }
    await cleanupTestUser(testUser.id);
  });

  describe("GET /api/ingredients", () => {
    it("should return list of ingredients", async () => {
      const res = await request(app)
        .get("/api/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("exposes a private ingredient when it is used by a public recipe", async () => {
      const owner = await createTestUser("public_recipe_ingredient_owner");
      const uniqueName = `Public recipe ingredient ${Date.now()}`;

      try {
        const ingredientRes = await request(app)
          .post("/api/ingredients")
          .set("Authorization", `Bearer ${owner.token}`)
          .send({ name: uniqueName, unit: "g" });

        expect(ingredientRes.status).toBe(201);
        expect(ingredientRes.body.status).toBe("PRIVATE");

        const recipeRes = await request(app)
          .post("/api/recipes")
          .set("Authorization", `Bearer ${owner.token}`)
          .send({
            title: `Public ingredient recipe ${Date.now()}`,
            isPublic: true,
            ingredients: [
              {
                ingredientId: ingredientRes.body.id,
                name: uniqueName,
                quantity: 60,
                unit: "g",
              },
            ],
          });

        expect(recipeRes.status).toBe(201);

        const publishedIngredientRes = await request(app)
          .get(`/api/ingredients/${ingredientRes.body.id}`)
          .set("Authorization", `Bearer ${testUser.token}`);

        expect(publishedIngredientRes.status).toBe(200);
        expect(publishedIngredientRes.body.status).toBe("GLOBAL");
        expect(publishedIngredientRes.body.createdByUserId).toBeNull();

        const ownerDeleteRes = await request(app)
          .delete(`/api/ingredients/${ingredientRes.body.id}`)
          .set("Authorization", `Bearer ${owner.token}`);

        expect(ownerDeleteRes.status).toBe(403);

        const makeRecipePrivateRes = await request(app)
          .put(`/api/recipes/${recipeRes.body.id}`)
          .set("Authorization", `Bearer ${owner.token}`)
          .send({ isPublic: false });

        expect(makeRecipePrivateRes.status).toBe(200);

        const stillPublicIngredientRes = await request(app)
          .get(`/api/ingredients/${ingredientRes.body.id}`)
          .set("Authorization", `Bearer ${owner.token}`);

        expect(stillPublicIngredientRes.body.status).toBe("GLOBAL");
        expect(stillPublicIngredientRes.body.createdByUserId).toBeNull();

        const listRes = await request(app)
          .get(`/api/ingredients?search=${encodeURIComponent(uniqueName)}`)
          .set("Authorization", `Bearer ${testUser.token}`);

        expect(listRes.status).toBe(200);
        expect(listRes.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: ingredientRes.body.id }),
          ]),
        );
      } finally {
        await cleanupTestUser(owner.id);
      }
    });
  });

  describe("POST /api/ingredients", () => {
    it("should create a new ingredient", async () => {
      const timestamp = Date.now();
      const requestedAt = new Date();
      const res = await request(app)
        .post("/api/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({
          name: `Test Ingredient ${timestamp}`,
          unit: "g",
          calories: 100,
          protein: 10,
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(`test ingredient ${timestamp}`);
      expect(res.body.unit).toBe("g");
      expect(res.body.createdAt).toBeDefined();
      expect(new Date(res.body.createdAt).getTime()).toBeGreaterThanOrEqual(
        requestedAt.getTime(),
      );
      expect(new Date(res.body.createdAt).getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
      createdIngredientIds.push(res.body.id);
    });

    it("should return 400 without name", async () => {
      const res = await request(app)
        .post("/api/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ unit: "g" });

      expect(res.status).toBe(400);
    });

    it("should default to grams if no unit provided", async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post("/api/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ name: `No Unit Ingredient ${timestamp}` });

      expect(res.status).toBe(201);
      expect(res.body.unit).toBe("g");
      createdIngredientIds.push(res.body.id);
    });
  });

  describe("POST /api/ingredients/bulk", () => {
    it("should create multiple ingredients", async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post("/api/ingredients/bulk")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({
          ingredients: [
            { name: `Bulk1 ${timestamp}`, unit: "g" },
            { name: `Bulk2 ${timestamp}`, unit: "ml" },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.length).toBe(2);
      res.body.forEach((ing: any) => createdIngredientIds.push(ing.id));
    });

    it("should return 400 with empty array", async () => {
      const res = await request(app)
        .post("/api/ingredients/bulk")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ ingredients: [] });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/ingredients/search", () => {
    it("should search ingredients by name", async () => {
      const timestamp = Date.now();
      // First create an ingredient
      const createRes = await request(app)
        .post("/api/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ name: `Searchable ${timestamp}` });
      createdIngredientIds.push(createRes.body.id);

      const res = await request(app)
        .get(`/api/ingredients/search?q=Searchable`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should return 400 without query", async () => {
      const res = await request(app)
        .get("/api/ingredients/search")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/ingredients/:id", () => {
    let ingredientId: number;

    beforeAll(async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post("/api/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ name: `Get By Id ${timestamp}` });
      ingredientId = res.body.id;
      createdIngredientIds.push(ingredientId);
    });

    it("should return an ingredient by id", async () => {
      const res = await request(app)
        .get(`/api/ingredients/${ingredientId}`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ingredientId);
    });

    it("should return 404 for non-existent ingredient", async () => {
      const res = await request(app)
        .get("/api/ingredients/99999")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/ingredients/:id", () => {
    let ingredientId: number;

    beforeAll(async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post("/api/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ name: `To Update ${timestamp}` });
      ingredientId = res.body.id;
      createdIngredientIds.push(ingredientId);
    });

    it("should update an ingredient", async () => {
      const res = await request(app)
        .put(`/api/ingredients/${ingredientId}`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ calories: 200, protein: 15 });

      expect(res.status).toBe(200);
      expect(res.body.calories).toBe(200);
      expect(res.body.protein).toBe(15);
    });
  });

  describe("DELETE /api/ingredients/:id", () => {
    let ingredientId: number;

    beforeEach(async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post("/api/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ name: `To Delete ${timestamp}` });
      ingredientId = res.body.id;
    });

    it("should delete an ingredient", async () => {
      const res = await request(app)
        .delete(`/api/ingredients/${ingredientId}`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(204);
    });
  });

  describe("POST /api/ingredients/:id/conversions", () => {
    let ingredientId: number;

    beforeAll(async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post("/api/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ name: `With Conversion ${timestamp}` });
      ingredientId = res.body.id;
      createdIngredientIds.push(ingredientId);
    });

    it("should add a conversion to an ingredient", async () => {
      const res = await request(app)
        .post(`/api/ingredients/${ingredientId}/conversions`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ unitName: "cup", gramsPerUnit: 240 });

      expect(res.status).toBe(201);
      expect(res.body.unitName).toBe("cup");
      expect(res.body.gramsPerUnit).toBe(240);
    });

    it("should return 400 without required fields", async () => {
      const res = await request(app)
        .post(`/api/ingredients/${ingredientId}/conversions`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ unitName: "spoon" });

      expect(res.status).toBe(400);
    });
  });
});
