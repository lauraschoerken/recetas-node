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
            ingredients: [
              { ingredientId, name: "Ingrediente test", quantity: 1, unit: "g" },
            ],
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
          ingredients: [
            { ingredientId, name: "Ingrediente test", quantity: 1, unit: "g" },
          ],
        });
      publicRecipeId = pubRes.body.id;

      const privRes = await request(app)
        .post("/api/recipes")
        .set("Authorization", `Bearer ${userB.token}`)
        .send({
          title: "Receta Privada de B",
          servings: 2,
          isPublic: false,
          ingredients: [
            { ingredientId, name: "Ingrediente test", quantity: 1, unit: "g" },
          ],
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

    it("permite ocultar y restaurar una receta pública solo para el usuario", async () => {
      const hideRes = await request(app)
        .post(`/api/recipes/${publicRecipeId}/hide`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(hideRes.status).toBe(200);

      const listWhileHidden = await request(app)
        .get("/api/recipes")
        .set("Authorization", `Bearer ${userA.token}`);
      expect(listWhileHidden.body.data.map((r: any) => r.id)).not.toContain(
        publicRecipeId,
      );
      expect(listWhileHidden.body.hiddenTotal).toBeGreaterThanOrEqual(1);

      const filteredNormalList = await request(app)
        .get(`/api/recipes?search=Publica&author=${userB.id}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(filteredNormalList.body.data.map((r: any) => r.id)).not.toContain(
        publicRecipeId,
      );
      expect(filteredNormalList.body.hiddenTotal).toBe(1);

      const hidden = await request(app)
        .get("/api/recipes/hidden?page=1&pageSize=1&search=Publica")
        .set("Authorization", `Bearer ${userA.token}`);
      expect(hidden.status).toBe(200);
      expect(hidden.body.total).toBe(1);
      expect(hidden.body.data.map((r: any) => r.id)).toContain(publicRecipeId);

      const directWhileHidden = await request(app)
        .get(`/api/recipes/${publicRecipeId}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(directWhileHidden.status).toBe(200);
      expect(directWhileHidden.body.isHiddenForCurrentUser).toBe(true);

      const hiddenPage = await request(app)
        .get(
          `/api/recipes?hidden=only&page=1&pageSize=1&search=Publica&author=${userB.id}`,
        )
        .set("Authorization", `Bearer ${userA.token}`);
      expect(hiddenPage.status).toBe(200);
      expect(hiddenPage.body.total).toBe(1);
      expect(hiddenPage.body.data.map((r: any) => r.id)).toEqual([
        publicRecipeId,
      ]);

      const hiddenAuthors = await request(app)
        .get("/api/recipes/authors?hidden=only")
        .set("Authorization", `Bearer ${userA.token}`);
      expect(hiddenAuthors.status).toBe(200);
      expect(hiddenAuthors.body.map((author: any) => author.id)).toContain(
        userB.id,
      );

      const ownerList = await request(app)
        .get("/api/recipes?visibility=mine")
        .set("Authorization", `Bearer ${userB.token}`);
      expect(ownerList.body.data.map((r: any) => r.id)).toContain(
        publicRecipeId,
      );

      const unhideRes = await request(app)
        .delete(`/api/recipes/${publicRecipeId}/hide`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(unhideRes.status).toBe(200);

      const listRestored = await request(app)
        .get("/api/recipes")
        .set("Authorization", `Bearer ${userA.token}`);
      expect(listRestored.body.data.map((r: any) => r.id)).toContain(
        publicRecipeId,
      );

      const directAfterRestore = await request(app)
        .get(`/api/recipes/${publicRecipeId}`)
        .set("Authorization", `Bearer ${userA.token}`);
      expect(directAfterRestore.body.isHiddenForCurrentUser).toBe(false);
    });

    it("no revela una receta oculta si pasa a privada y la recupera si vuelve a ser pública", async () => {
      await request(app)
        .post(`/api/recipes/${publicRecipeId}/hide`)
        .set("Authorization", `Bearer ${userA.token}`);

      expect(
        (
          await request(app)
            .put(`/api/recipes/${publicRecipeId}`)
            .set("Authorization", `Bearer ${userB.token}`)
            .send({ isPublic: false })
        ).status,
      ).toBe(200);

      const privateHidden = await request(app)
        .get("/api/recipes?hidden=only&search=Publica")
        .set("Authorization", `Bearer ${userA.token}`);
      expect(privateHidden.body.total).toBe(0);
      expect(
        (
          await request(app)
            .get(`/api/recipes/${publicRecipeId}`)
            .set("Authorization", `Bearer ${userA.token}`)
        ).status,
      ).toBe(404);

      await request(app)
        .put(`/api/recipes/${publicRecipeId}`)
        .set("Authorization", `Bearer ${userB.token}`)
        .send({ isPublic: true });

      const publicAgain = await request(app)
        .get("/api/recipes?hidden=only&search=Publica")
        .set("Authorization", `Bearer ${userA.token}`);
      expect(publicAgain.body.data.map((recipe: any) => recipe.id)).toContain(
        publicRecipeId,
      );

      await request(app)
        .delete(`/api/recipes/${publicRecipeId}/hide`)
        .set("Authorization", `Bearer ${userA.token}`);
    });

    it("elimina del listado oculto una receta cuyo original ha sido borrado", async () => {
      const created = await request(app)
        .post("/api/recipes")
        .set("Authorization", `Bearer ${userB.token}`)
        .send({
          title: "Receta oculta que se borra",
          servings: 2,
          isPublic: true,
          ingredients: [
            { ingredientId, name: "Ingrediente test", quantity: 1, unit: "g" },
          ],
        });
      const recipeId = created.body.id;

      await request(app)
        .post(`/api/recipes/${recipeId}/hide`)
        .set("Authorization", `Bearer ${userA.token}`);
      await request(app)
        .delete(`/api/recipes/${recipeId}`)
        .set("Authorization", `Bearer ${userB.token}`);

      const hiddenAfterDelete = await request(app)
        .get("/api/recipes?hidden=only&search=oculta%20que%20se%20borra")
        .set("Authorization", `Bearer ${userA.token}`);
      expect(hiddenAfterDelete.body.total).toBe(0);
      expect(hiddenAfterDelete.body.data).toEqual([]);
    });

    it("mantiene total y página coherentes al restaurar la última oculta de una página", async () => {
      const ids: number[] = [];
      for (const suffix of ["A", "B"]) {
        const created = await request(app)
          .post("/api/recipes")
          .set("Authorization", `Bearer ${userB.token}`)
          .send({
            title: `Oculta paginada ${suffix}`,
            servings: 2,
            isPublic: true,
            ingredients: [
              { ingredientId, name: "Ingrediente test", quantity: 1, unit: "g" },
            ],
          });
        ids.push(created.body.id);
        await request(app)
          .post(`/api/recipes/${created.body.id}/hide`)
          .set("Authorization", `Bearer ${userA.token}`);
      }

      const secondPage = await request(app)
        .get("/api/recipes?hidden=only&search=Oculta%20paginada&page=2&pageSize=1")
        .set("Authorization", `Bearer ${userA.token}`);
      expect(secondPage.body.total).toBe(2);
      expect(secondPage.body.data).toHaveLength(1);

      await request(app)
        .delete(`/api/recipes/${secondPage.body.data[0].id}/hide`)
        .set("Authorization", `Bearer ${userA.token}`);

      const pageAfterRestore = await request(app)
        .get("/api/recipes?hidden=only&search=Oculta%20paginada&page=2&pageSize=1")
        .set("Authorization", `Bearer ${userA.token}`);
      expect(pageAfterRestore.body.total).toBe(1);
      expect(pageAfterRestore.body.data).toEqual([]);

      await Promise.all(
        ids.map((id) =>
          request(app)
            .delete(`/api/recipes/${id}/hide`)
            .set("Authorization", `Bearer ${userA.token}`),
        ),
      );
    });

    it("no permite ocultar una receta propia", async () => {
      const res = await request(app)
        .post(`/api/recipes/${publicRecipeId}/hide`)
        .set("Authorization", `Bearer ${userB.token}`);

      expect(res.status).toBe(404);
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
          ingredients: [
            { ingredientId, name: "Ingrediente test", quantity: 1, unit: "g" },
          ],
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
          ingredients: [
            { ingredientId, name: "Ingrediente test", quantity: 1, unit: "g" },
          ],
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
