import {
  JsonController,
  Get,
  Put,
  Delete,
  Param,
  Body,
  QueryParam,
  Req,
  UseBefore,
  HttpCode,
} from "routing-controllers";
import { adminService } from "../services";
import { authMiddleware, adminMiddleware, AuthRequest } from "../middlewares";

@JsonController("/admin")
@UseBefore(authMiddleware, adminMiddleware)
export class AdminController {
  /**
   * @swagger
   * /api/admin/users:
   *   get:
   *     tags: [Admin]
   *     summary: (Admin) Listar todos los usuarios
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer }
   *       - in: query
   *         name: pageSize
   *         schema: { type: integer }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Lista paginada de usuarios
   */
  @Get("/users")
  async getUsers(
    @QueryParam("page") page?: number,
    @QueryParam("pageSize") pageSize?: number,
    @QueryParam("search") search?: string,
  ) {
    return adminService.getAllUsers({ page, pageSize, search });
  }

  /**
   * @swagger
   * /api/admin/users/{id}/role:
   *   put:
   *     tags: [Admin]
   *     summary: (Admin) Cambiar rol de usuario
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [role]
   *             properties:
   *               role: { type: string, enum: [USER, ADMIN] }
   *     responses:
   *       200:
   *         description: Rol actualizado
   */
  @Put("/users/:id/role")
  async setRole(
    @Param("id") id: number,
    @Body() body: { role: "USER" | "ADMIN" },
    @Req() req: AuthRequest,
  ) {
    if (!body.role || !["USER", "ADMIN"].includes(body.role)) {
      throw { httpCode: 400, message: "Role debe ser USER o ADMIN" };
    }
    // No puede quitarse admin a sí mismo
    if (id === req.userId) {
      throw { httpCode: 400, message: "No puedes cambiar tu propio rol" };
    }
    return adminService.setRole(id, body.role);
  }

  /**
   * @swagger
   * /api/admin/users/{id}:
   *   delete:
   *     tags: [Admin]
   *     summary: (Admin) Eliminar usuario
   */
  @Delete("/users/:id")
  @HttpCode(204)
  async deleteUser(@Param("id") id: number, @Req() req: AuthRequest) {
    if (id === req.userId) {
      throw { httpCode: 400, message: "No puedes eliminarte a ti mismo" };
    }
    await adminService.deleteUser(id);
    return null;
  }

  /**
   * @swagger
   * /api/admin/ingredients/pending:
   *   get:
   *     tags: [Admin]
   *     summary: (Admin) Listar ingredientes pendientes de aprobación
   *     responses:
   *       200:
   *         description: Ingredientes con status PENDING
   */
  @Get("/ingredients/pending")
  async getPendingIngredients() {
    return adminService.getPendingIngredients();
  }

  /**
   * @swagger
   * /api/admin/proposals/pending:
   *   get:
   *     tags: [Admin]
   *     summary: (Admin) Listar propuestas pendientes de revisión
   *     responses:
   *       200:
   *         description: Propuestas con status PENDING
   */
  @Get("/proposals/pending")
  async getPendingProposals() {
    return adminService.getPendingProposals();
  }
}
