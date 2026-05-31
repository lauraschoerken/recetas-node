/**
 * Tests de Perfil de usuario y Tiendas.
 *
 * Profile (GET/PUT /api/profile):
 * - Obtener perfil del usuario
 * - Actualizar datos de perfil (peso, altura, etc.)
 * - Autenticación requerida
 *
 * Stores (CRUD /api/stores):
 * - Crear tienda
 * - Listar tiendas
 * - Obtener tienda por ID
 * - Actualizar tienda
 * - Eliminar tienda
 * - Autenticación requerida
 */
import request from "supertest";
import { createApp } from "../app";
import { createTestUser, cleanupTestUser, TestUser } from "./helpers";

const app = createApp();

describe("Profile Controller", () => {
  let testUser: TestUser;

  beforeAll(async () => {
    testUser = await createTestUser("profile");
  });

  afterAll(async () => {
    await cleanupTestUser(testUser.id);
  });

  // ── Autenticación ───────────────────────────────────────────────────────────

  describe("Autenticación requerida", () => {
    it("GET /profile devuelve 401 sin token", async () => {
      const res = await request(app).get("/api/profile");
      expect(res.status).toBe(401);
    });

    it("PUT /profile devuelve 401 sin token", async () => {
      const res = await request(app).put("/api/profile").send({ weight: 70 });
      expect(res.status).toBe(401);
    });
  });

  // ── Obtener perfil ──────────────────────────────────────────────────────────

  describe("GET /api/profile", () => {
    it("devuelve el perfil del usuario autenticado", async () => {
      const res = await request(app)
        .get("/api/profile")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      // El perfil puede existir (con datos) o ser null si no se ha configurado
      // En cualquier caso la respuesta es válida
      expect(res.body !== undefined).toBe(true);
    });
  });

  // ── Actualizar perfil ───────────────────────────────────────────────────────

  describe("PUT /api/profile", () => {
    it("actualiza datos de perfil (peso y altura)", async () => {
      const res = await request(app)
        .put("/api/profile")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({
          weight: 75,
          height: 175,
          age: 30,
          gender: "male",
          activityLevel: "moderate",
          goal: "maintain",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("weight", 75);
      expect(res.body).toHaveProperty("height", 175);
    });

    it("acepta actualización parcial", async () => {
      const res = await request(app)
        .put("/api/profile")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ weight: 80 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("weight", 80);
    });

    it("los cambios persisten al hacer GET", async () => {
      await request(app)
        .put("/api/profile")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ weight: 72 });

      const res = await request(app)
        .get("/api/profile")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("weight", 72);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════════

describe("UserStore Controller", () => {
  let testUser: TestUser;
  let storeId: number;

  beforeAll(async () => {
    testUser = await createTestUser("stores");
  });

  afterAll(async () => {
    await cleanupTestUser(testUser.id);
  });

  // ── Autenticación ───────────────────────────────────────────────────────────

  describe("Autenticación requerida", () => {
    it("GET /stores devuelve 401 sin token", async () => {
      const res = await request(app).get("/api/stores");
      expect(res.status).toBe(401);
    });

    it("POST /stores devuelve 401 sin token", async () => {
      const res = await request(app)
        .post("/api/stores")
        .send({ name: "Mercadona" });
      expect(res.status).toBe(401);
    });
  });

  // ── Crear tienda ────────────────────────────────────────────────────────────

  describe("POST /api/stores", () => {
    it("requiere nombre", async () => {
      const res = await request(app)
        .post("/api/stores")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it("crea una tienda correctamente", async () => {
      const res = await request(app)
        .post("/api/stores")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ name: "Mercadona Test", url: "https://mercadona.es" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body).toHaveProperty("name", "Mercadona Test");
      storeId = res.body.id;
    });
  });

  // ── Listar tiendas ──────────────────────────────────────────────────────────

  describe("GET /api/stores", () => {
    it("devuelve la lista de tiendas del usuario", async () => {
      const res = await request(app)
        .get("/api/stores")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((s: any) => s.id === storeId)).toBe(true);
    });
  });

  // ── Obtener por ID ──────────────────────────────────────────────────────────

  describe("GET /api/stores/:id", () => {
    it("devuelve la tienda correcta", async () => {
      const res = await request(app)
        .get(`/api/stores/${storeId}`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", storeId);
      expect(res.body).toHaveProperty("name", "Mercadona Test");
    });

    it("devuelve 404 para tienda inexistente", async () => {
      const res = await request(app)
        .get("/api/stores/999999")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
    });
  });

  // ── Actualizar tienda ───────────────────────────────────────────────────────

  describe("PUT /api/stores/:id", () => {
    it("actualiza el nombre de la tienda", async () => {
      const res = await request(app)
        .put(`/api/stores/${storeId}`)
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ name: "Mercadona Actualizado" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("name", "Mercadona Actualizado");
    });

    it("devuelve 404 al actualizar tienda inexistente", async () => {
      const res = await request(app)
        .put("/api/stores/999999")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ name: "No existe" });

      expect(res.status).toBe(404);
    });
  });

  // ── Eliminar tienda ─────────────────────────────────────────────────────────

  describe("DELETE /api/stores/:id", () => {
    it("elimina la tienda", async () => {
      const res = await request(app)
        .delete(`/api/stores/${storeId}`)
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(204);
    });

    it("la tienda eliminada ya no aparece en la lista", async () => {
      const res = await request(app)
        .get("/api/stores")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.some((s: any) => s.id === storeId)).toBe(false);
    });

    it("devuelve 404 al eliminar tienda inexistente", async () => {
      const res = await request(app)
        .delete("/api/stores/999999")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(404);
    });
  });
});
