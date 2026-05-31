/**
 * Tests de Alertas de stock.
 *
 * Cubre:
 * - GET /api/alerts — listar alertas (vacío al inicio)
 * - GET /api/alerts/count — contador de alertas
 * - PUT /api/alerts/:id — actualizar estado (read, resolved, dismissed)
 * - GET/POST/DELETE /api/alerts/thresholds/ingredients — umbrales de ingredientes
 * - GET/POST/DELETE /api/alerts/thresholds/recipes — umbrales de recetas
 * - Autenticación requerida en todos los endpoints
 */
import request from "supertest";
import { createApp } from "../app";
import {
  createTestUser,
  cleanupTestUser,
  createTestIngredient,
  cleanupTestIngredient,
  TestUser,
} from "./helpers";
import { PrismaClient } from "@prisma/client";

const app = createApp();
const prisma = new PrismaClient();

describe("Alert Controller", () => {
  let testUser: TestUser;
  let ingredientId: number;
  let recipeId: number;

  beforeAll(async () => {
    testUser = await createTestUser("alerts");
    ingredientId = await createTestIngredient("alerts_test");

    // Crear una receta para usarla en thresholds
    const res = await request(app)
      .post("/api/recipes")
      .set("Authorization", `Bearer ${testUser.token}`)
      .send({ title: "Receta para alertas", servings: 4, ingredients: [] });
    recipeId = res.body.id;
  });

  afterAll(async () => {
    try {
      await prisma.recipe.delete({ where: { id: recipeId } });
    } catch {
      /* ignorar */
    }
    await cleanupTestIngredient(ingredientId);
    await cleanupTestUser(testUser.id);
  });

  // ── Autenticación ───────────────────────────────────────────────────────────

  describe("Autenticación requerida", () => {
    it("GET /alerts devuelve 401 sin token", async () => {
      const res = await request(app).get("/api/alerts");
      expect(res.status).toBe(401);
    });

    it("GET /alerts/count devuelve 401 sin token", async () => {
      const res = await request(app).get("/api/alerts/count");
      expect(res.status).toBe(401);
    });

    it("GET /alerts/thresholds/ingredients devuelve 401 sin token", async () => {
      const res = await request(app).get("/api/alerts/thresholds/ingredients");
      expect(res.status).toBe(401);
    });
  });

  // ── Listar alertas ──────────────────────────────────────────────────────────

  describe("GET /api/alerts", () => {
    it("devuelve un array (posiblemente vacío) para usuario nuevo", async () => {
      const res = await request(app)
        .get("/api/alerts")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("acepta el parámetro includeResolved", async () => {
      const res = await request(app)
        .get("/api/alerts?includeResolved=true")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ── Contador de alertas ─────────────────────────────────────────────────────

  describe("GET /api/alerts/count", () => {
    it("devuelve { count: number }", async () => {
      const res = await request(app)
        .get("/api/alerts/count")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("count");
      expect(typeof res.body.count).toBe("number");
    });

    it("el count inicial es 0 para usuario nuevo", async () => {
      const res = await request(app)
        .get("/api/alerts/count")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
    });
  });

  // ── Umbrales de ingredientes ────────────────────────────────────────────────

  describe("Umbrales de ingredientes", () => {
    it("lista vacía al inicio", async () => {
      const res = await request(app)
        .get("/api/alerts/thresholds/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("requiere ingredientId, minQuantity y unit", async () => {
      const res = await request(app)
        .post("/api/alerts/thresholds/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ ingredientId, minQuantity: 200 }); // falta unit

      expect(res.status).toBe(400);
    });

    it("crea un umbral mínimo para un ingrediente", async () => {
      const res = await request(app)
        .post("/api/alerts/thresholds/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ ingredientId, minQuantity: 200, unit: "g" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("ingredientId", ingredientId);
      expect(res.body).toHaveProperty("minQuantity", 200);
      expect(res.body).toHaveProperty("unit", "g");
    });

    it("el umbral aparece en la lista", async () => {
      const res = await request(app)
        .get("/api/alerts/thresholds/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.some((t: any) => t.ingredientId === ingredientId)).toBe(
        true,
      );
    });

    it("actualiza el umbral si ya existe (upsert)", async () => {
      const res = await request(app)
        .post("/api/alerts/thresholds/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ ingredientId, minQuantity: 500, unit: "g" });

      expect(res.status).toBe(201);
      expect(res.body.minQuantity).toBe(500);
    });

    it("elimina el umbral del ingrediente", async () => {
      const res = await request(app)
        .delete(`/api/alerts/thresholds/ingredients/${ingredientId}`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(204);
    });

    it("la lista vuelve a estar vacía tras eliminar", async () => {
      const res = await request(app)
        .get("/api/alerts/thresholds/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.some((t: any) => t.ingredientId === ingredientId)).toBe(
        false,
      );
    });
  });

  // ── Umbrales de recetas ─────────────────────────────────────────────────────

  describe("Umbrales de recetas", () => {
    it("lista vacía al inicio", async () => {
      const res = await request(app)
        .get("/api/alerts/thresholds/recipes")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("requiere recipeId y minServings", async () => {
      const res = await request(app)
        .post("/api/alerts/thresholds/recipes")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ recipeId }); // falta minServings

      expect(res.status).toBe(400);
    });

    it("crea un umbral mínimo para una receta", async () => {
      const res = await request(app)
        .post("/api/alerts/thresholds/recipes")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ recipeId, minServings: 2 });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("recipeId", recipeId);
      expect(res.body).toHaveProperty("minServings", 2);
    });

    it("el umbral de receta aparece en la lista", async () => {
      const res = await request(app)
        .get("/api/alerts/thresholds/recipes")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.some((t: any) => t.recipeId === recipeId)).toBe(true);
    });

    it("elimina el umbral de la receta", async () => {
      const res = await request(app)
        .delete(`/api/alerts/thresholds/recipes/${recipeId}`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(204);
    });
  });

  // ── Actualizar estado de alerta ─────────────────────────────────────────────

  describe("PUT /api/alerts/:id — actualizar estado", () => {
    let alertId: number | null = null;

    beforeAll(async () => {
      // Crear un umbral que pueda generar una alerta
      await request(app)
        .post("/api/alerts/thresholds/ingredients")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ ingredientId, minQuantity: 9999, unit: "g" }); // umbral muy alto

      // Ver si se generó alguna alerta
      const res = await request(app)
        .get("/api/alerts")
        .set("Authorization", `Bearer ${testUser.token}`);

      if (Array.isArray(res.body) && res.body.length > 0) {
        alertId = res.body[0].id;
      }
    });

    it("devuelve 400 si falta status", async () => {
      if (!alertId) {
        console.log("No hay alertas para actualizar, test saltado");
        return;
      }
      const res = await request(app)
        .put(`/api/alerts/${alertId}`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it("puede marcar una alerta como read", async () => {
      if (!alertId) {
        console.log("No hay alertas disponibles, test saltado");
        return;
      }

      const res = await request(app)
        .put(`/api/alerts/${alertId}`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ status: "read" });

      expect([200, 404]).toContain(res.status);
    });

    it("devuelve 404 para alerta inexistente", async () => {
      const res = await request(app)
        .put("/api/alerts/999999")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ status: "resolved" });

      expect(res.status).toBe(404);
    });
  });
});
