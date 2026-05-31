/**
 * Tests de auth/profile adicionales.
 *
 * Cubre:
 * - GET /api/auth/me: datos del usuario autenticado
 * - PUT /api/auth/account: actualización de nombre y email
 * - POST /api/auth/change-password: contraseña correcta e incorrecta
 * - Acceso denegado sin token (401)
 */
import request from "supertest";
import { createApp } from "../app";
import { createTestUser, cleanupTestUser, TestUser } from "./helpers";

const app = createApp();

describe("Auth — Perfil y Cuenta", () => {
  let testUser: TestUser;

  beforeEach(async () => {
    testUser = await createTestUser("profile");
  });

  afterEach(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  // ── GET /api/auth/me ────────────────────────────────────────────────────────

  describe("GET /api/auth/me", () => {
    it("devuelve los datos del usuario autenticado", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", testUser.id);
      expect(res.body).toHaveProperty("email", testUser.email);
      expect(res.body).toHaveProperty("name", testUser.name);
      // No debe exponer la contraseña
      expect(res.body).not.toHaveProperty("password");
    });

    it("devuelve 401 sin token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("devuelve 401 con token inválido", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer token-invalido");

      expect(res.status).toBe(401);
    });
  });

  // ── PUT /api/auth/account ───────────────────────────────────────────────────

  describe("PUT /api/auth/account", () => {
    it("actualiza el nombre del usuario", async () => {
      const res = await request(app)
        .put("/api/auth/account")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({ name: "Nombre Actualizado" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("name", "Nombre Actualizado");
    });

    it("devuelve 401 sin autenticación", async () => {
      const res = await request(app)
        .put("/api/auth/account")
        .send({ name: "Sin auth" });

      expect(res.status).toBe(401);
    });
  });

  // ── POST /api/auth/change-password ──────────────────────────────────────────

  describe("POST /api/auth/change-password", () => {
    it("cambia la contraseña con contraseña actual correcta", async () => {
      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({
          currentPassword: "password123",
          newPassword: "newpassword456",
        });

      expect(res.status).toBe(200);
    });

    it("devuelve error con contraseña actual incorrecta", async () => {
      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${testUser.token}`)
        .send({
          currentPassword: "wrong-password",
          newPassword: "newpassword456",
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    it("devuelve 401 sin autenticación", async () => {
      const res = await request(app)
        .post("/api/auth/change-password")
        .send({ currentPassword: "password123", newPassword: "nuevo" });

      expect(res.status).toBe(401);
    });
  });
});
