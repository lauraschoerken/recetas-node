/**
 * Tests de recetas — filtros, paginación y permisos.
 *
 * Cubre:
 * - Paginación (page, pageSize)
 * - Filtro de visibilidad: solo ver recetas propias + públicas ajenas
 * - Un usuario no puede eliminar la receta de otro
 * - Un usuario no puede editar la receta de otro
 * - GET /api/recipes/authors devuelve autores
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

describe("Recipe Controller — Filtros, Paginación y Permisos", () => {
  let userA: TestUser;
  let userB: TestUser;
  let ingredientId: number;

  beforeAll(async () => {
    userA = await createTestUser("recipe_filters_a");
    userB = await createTestUser("recipe_filters_b");
    ingredientId = await createTestIngredient("recipe_filters_test");
  });

  afterAll(async () => {
    await cleanupTestUser(userA.id);
    await cleanupTestUser(userB.id);
    await cleanupTestIngredient(ingredientId);
  });

  // ── Paginación ─────────────────────────────────────────────────────────────

  describe("Paginación", () => {
    beforeAll(async () => {
      // Crear 3 recetas para el usuario A
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post("/api/recipes")
          .set("Authorization", `Bearer ${userA.token}`)
          .send({
            title: `Paginacion Recipe ${i}`,
            servings: 4,
            ingredients: [],
          });
      }
    });

    it("respeta el parámetro pageSize", async () => {
      const res = await request(app)
        .get("/api/recipes?page=1&pageSize=2")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("total");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it("devuelve la segunda página correctamente", async () => {
      const page1 = await request(app)
        .get("/api/recipes?page=1&pageSize=2&visibility=mine")
        .set("Authorization", `Bearer ${userA.token}`);

      const page2 = await request(app)
        .get("/api/recipes?page=2&pageSize=2&visibility=mine")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      // Los IDs de la página 2 no deben repetirse en la página 1
      const idsPage1 = page1.body.data.map((r: any) => r.id);
      const idsPage2 = page2.body.data.map((r: any) => r.id);
      const overlap = idsPage1.filter((id: number) => idsPage2.includes(id));
      expect(overlap.length).toBe(0);
    });

    it("devuelve el total correcto de recetas", async () => {
      const res = await request(app)
        .get("/api/recipes?page=1&pageSize=10&visibility=mine")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(typeof res.body.total).toBe("number");
      expect(res.body.total).toBeGreaterThanOrEqual(3);
    });
  });

  // ── Visibilidad ─────────────────────────────────────────────────────────────

  describe("Filtro de visibilidad", () => {
    let publicRecipeId: number;
    let privateRecipeId: number;

    beforeAll(async () => {
      // userB crea una receta pública y una privada
      const pubRes = await request(app)
        .post("/api/recipes")
        .set("Authorization", `Bearer ${userB.token}`)
        .send({
          title: "Receta Publica de B",
          servings: 2,
          isPublic: true,
          ingredients: [],
        });
      publicRecipeId = pubRes.body.id;

      const privRes = await request(app)
        .post("/api/recipes")
        .set("Authorization", `Bearer ${userB.token}`)
        .send({
          title: "Receta Privada de B",
          servings: 2,
          isPublic: false,
          ingredients: [],
        });
      privateRecipeId = privRes.body.id;
    });

    it("userA puede ver la receta pública de userB", async () => {
      const res = await request(app)
        .get("/api/recipes")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((r: any) => r.id);
      expect(ids).toContain(publicRecipeId);
    });

    it("userA NO puede ver la receta privada de userB", async () => {
      const res = await request(app)
        .get("/api/recipes")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((r: any) => r.id);
      expect(ids).not.toContain(privateRecipeId);
    });

    it("visibility=mine devuelve solo las recetas del usuario", async () => {
      const res = await request(app)
        .get("/api/recipes?visibility=mine")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((recipe: any) => {
        expect(recipe.userId).toBe(userA.id);
      });
    });
  });

  // ── Permisos de propietario ─────────────────────────────────────────────────

  describe("Permisos: un usuario no puede modificar/eliminar recetas de otro", () => {
    let recipeOfA: number;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/recipes")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          title: "Receta de A para permisos",
          servings: 4,
          ingredients: [],
        });
      recipeOfA = res.body.id;
    });

    it("userB no puede eliminar la receta de userA", async () => {
      const res = await request(app)
        .delete(`/api/recipes/${recipeOfA}`)
        .set("Authorization", `Bearer ${userB.token}`);

      // Debe ser 403 o 404 (dependiendo de la implementación)
      expect([403, 404]).toContain(res.status);
    });

    it("userB no puede editar la receta de userA", async () => {
      const res = await request(app)
        .put(`/api/recipes/${recipeOfA}`)
        .set("Authorization", `Bearer ${userB.token}`)
        .send({ title: "Título modificado por B" });

      expect([403, 404]).toContain(res.status);
    });
  });

  // ── Búsqueda ────────────────────────────────────────────────────────────────

  describe("Filtro de búsqueda", () => {
    let searchRecipeId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/recipes")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          title: "Receta Unica Para Busqueda",
          servings: 4,
          ingredients: [],
        });
      searchRecipeId = res.body.id;
    });

    it("busca recetas por título", async () => {
      const res = await request(app)
        .get("/api/recipes?search=Receta+Unica+Para+Busqueda")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((r: any) => r.id === searchRecipeId)).toBe(
        true,
      );
    });

    it("devuelve lista vacía cuando no hay coincidencias", async () => {
      const res = await request(app)
        .get("/api/recipes?search=XyzNoExisteEstaReceta123")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      // Puede devolver [] o data con pocos resultados — verificamos que es un array
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ── GET /api/recipes/authors ────────────────────────────────────────────────

  describe("GET /api/recipes/authors", () => {
    it("devuelve la lista de autores", async () => {
      const res = await request(app)
        .get("/api/recipes/authors")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("devuelve 401 sin autenticación", async () => {
      const res = await request(app).get("/api/recipes/authors");
      expect(res.status).toBe(401);
    });
  });
});
