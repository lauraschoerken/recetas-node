import { PrismaClient } from "@prisma/client";
import request from "supertest";

import { createApp } from "../app";
import {
  cleanupTestIngredient,
  cleanupTestUser,
  createTestIngredient,
  createTestUser,
  TestUser,
} from "./helpers";

const app = createApp();
const prisma = new PrismaClient();

describe("Ingredient tags — asignaciones globales de admin", () => {
  let admin: TestUser;
  let ingredientId: number;
  let tagId: number;

  beforeAll(async () => {
    admin = await createTestUser("ingredient_tag_admin");
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: "ADMIN" },
    });
    ingredientId = await createTestIngredient("ingredient_tag_admin");

    const tag = await prisma.ingredientTag.create({
      data: {
        name: `Global admin tag ${Date.now()}`,
        isGlobal: true,
        createdByUserId: admin.id,
      },
    });
    tagId = tag.id;
  });

  afterAll(async () => {
    await prisma.ingredientTagAssignment.deleteMany({ where: { tagId } });
    await prisma.ingredientTag.delete({ where: { id: tagId } });
    await cleanupTestIngredient(ingredientId);
    await cleanupTestUser(admin.id);
    await prisma.$disconnect();
  });

  it("permite asignar y quitar una tag global con userId nulo", async () => {
    const assignResponse = await request(app)
      .post(`/api/ingredient-tags/ingredients/${ingredientId}/assign/${tagId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({});

    expect(assignResponse.status).toBe(201);
    expect(assignResponse.body).toMatchObject({
      ingredientId,
      tagId,
      userId: null,
    });

    const repeatedAssignResponse = await request(app)
      .post(`/api/ingredient-tags/ingredients/${ingredientId}/assign/${tagId}`)
      .set("Authorization", `Bearer ${admin.token}`)
      .send({});

    expect(repeatedAssignResponse.status).toBe(201);
    await expect(
      prisma.ingredientTagAssignment.count({
        where: { ingredientId, tagId, userId: null },
      }),
    ).resolves.toBe(1);

    const unassignResponse = await request(app)
      .delete(`/api/ingredient-tags/ingredients/${ingredientId}/unassign/${tagId}`)
      .set("Authorization", `Bearer ${admin.token}`);

    expect(unassignResponse.status).toBe(204);
    await expect(
      prisma.ingredientTagAssignment.findFirst({
        where: { ingredientId, tagId, userId: null },
      }),
    ).resolves.toBeNull();
  });
});
