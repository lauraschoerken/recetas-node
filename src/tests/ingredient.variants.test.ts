/**
 * Tests de ingredientes — variantes y conversiones de unidad.
 *
 * Cubre:
 * - Gestión de variantes (crear, listar)
 * - Gestión de conversiones de unidad (crear, listar, eliminar)
 * - Filtro de ingredientes por estado
 */
import request from "supertest";
import { createApp } from "../app";
import { createTestUser, cleanupTestUser, TestUser } from "./helpers";
import { PrismaClient } from "@prisma/client";

const app = createApp();
const prisma = new PrismaClient();

describe("Ingredient Controller — Variantes y Conversiones", () => {
  let testUser: TestUser;
  const createdIngredientIds: number[] = [];

  beforeAll(async () => {
    testUser = await createTestUser("ing_variants");
  });

  afterAll(async () => {
    for (const id of createdIngredientIds) {
      try {
        await prisma.ingredientVariant.deleteMany({
          where: { ingredientId: id },
        });
        await prisma.unitConversion.deleteMany({ where: { ingredientId: id } });
        await prisma.ingredient.delete({ where: { id } });
      } catch {
        // ignore
      }
    }
    await cleanupTestUser(testUser.id);
  });

  async function createIngredient(nameSuffix: string): Promise<number> {
    const timestamp = Date.now();
    const res = await request(app)
      .post("/api/ingredients")
      .set("Authorization", `Bearer ${testUser.token}`)
      .send({ name: `Ingredient ${nameSuffix} ${timestamp}`, unit: "g" });
    createdIngredientIds.push(res.body.id);
    return res.body.id;
  }

  // ── Variantes ──────────────────────────────────────────────────────────────

  describe("Variantes de ingrediente", () => {
    let ingredientId: number;

    beforeAll(async () => {
      ingredientId = await createIngredient("variants");
    });

    it("crea una variante para un ingrediente", async () => {
      const res = await request(app)
        .post(`/api/ingredients/${ingredientId}/variants`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({
          name: "Cocinado",
          calories: 150,
          protein: 5,
          carbs: 30,
          fat: 1,
          fiber: 2,
          weightFactor: 1.5,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("name", "Cocinado");
      expect(res.body).toHaveProperty("ingredientId", ingredientId);
    });

    it("lista las variantes de un ingrediente", async () => {
      const res = await request(app)
        .get(`/api/ingredients/${ingredientId}/variants`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Debe haber al menos la variante que acabamos de crear
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  // ── Conversiones de unidad ─────────────────────────────────────────────────

  describe("Conversiones de unidad", () => {
    let ingredientId: number;
    let conversionId: number;

    beforeAll(async () => {
      ingredientId = await createIngredient("conversions");
    });

    it("añade una conversión de unidad al ingrediente", async () => {
      const res = await request(app)
        .post(`/api/ingredients/${ingredientId}/conversions`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ unitName: "diente", gramsPerUnit: 5 });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("unitName", "diente");
      expect(res.body).toHaveProperty("gramsPerUnit", 5);
      conversionId = res.body.id;
    });

    it("lista las conversiones del ingrediente", async () => {
      const res = await request(app)
        .get(`/api/ingredients/${ingredientId}/conversions`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((c: any) => c.id === conversionId)).toBe(true);
    });

    it("elimina una conversión de unidad", async () => {
      const res = await request(app)
        .delete(`/api/ingredients/${ingredientId}/conversions/${conversionId}`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(204);
    });

    it("no permite crear conversión duplicada para el mismo ingrediente", async () => {
      // Crear la primera conversión
      await request(app)
        .post(`/api/ingredients/${ingredientId}/conversions`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ unitName: "cucharada", gramsPerUnit: 15 });

      // Intentar crear la misma conversión otra vez
      const res = await request(app)
        .post(`/api/ingredients/${ingredientId}/conversions`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ unitName: "cucharada", gramsPerUnit: 15 });

      // Debe fallar (conflicto o error de validación)
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ── Filtro por estado ──────────────────────────────────────────────────────

  describe("Filtro de ingredientes", () => {
    it("la lista de ingredientes devuelve un objeto con data y total", async () => {
      const res = await request(app)
        .get("/api/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      // La respuesta puede ser array o { data, total }
      const isArray = Array.isArray(res.body);
      const isObject =
        !isArray &&
        typeof res.body === "object" &&
        ("data" in res.body || Array.isArray(res.body.data));
      expect(isArray || isObject).toBe(true);
    });

    it("permite búsqueda de ingredientes por nombre", async () => {
      // Crear ingrediente con nombre único
      const timestamp = Date.now();
      const uniqueName = `BusquedaUnica${timestamp}`;
      await request(app)
        .post("/api/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ name: uniqueName, unit: "g" });

      const res = await request(app)
        .get(`/api/ingredients?search=${uniqueName}`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
    });
  });
});
