import {
  JsonController,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseBefore,
  HttpCode,
} from "routing-controllers";
import { PrismaClient } from "@prisma/client";
import { householdService } from "../services";
import { authMiddleware, AuthRequest } from "../middlewares";

const prisma = new PrismaClient();

@JsonController("/household")
@UseBefore(authMiddleware)
export class HouseholdController {
  /**
   * @swagger
   * /api/household:
   *   get:
   *     tags: [Hogar]
   *     summary: Obtener el hogar del usuario autenticado
   *     responses:
   *       200:
   *         description: Datos del hogar o null si no pertenece a ninguno
   *         content:
   *           application/json:
   *             schema:
   *               oneOf:
   *                 - $ref: '#/components/schemas/Household'
   *                 - type: object
   *                   properties:
   *                     household:
   *                       type: "null"
   */
  @Get("/")
  async get(@Req() req: AuthRequest) {
    const result = await householdService.getForUser(req.userId!);
    return result ?? { household: null };
  }

  /**
   * @swagger
   * /api/household:
   *   post:
   *     tags: [Hogar]
   *     summary: Crear un nuevo hogar
   *     description: El usuario autenticado se convierte en ADMIN del hogar creado
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name]
   *             properties:
   *               name:
   *                 type: string
   *                 example: "Casa de los García"
   *     responses:
   *       201:
   *         description: Hogar creado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Household'
   *       400:
   *         description: Nombre requerido o el usuario ya pertenece a un hogar
   */
  @Post("/")
  @HttpCode(201)
  async create(@Body() body: { name: string }, @Req() req: AuthRequest) {
    if (!body.name) throw { httpCode: 400, message: "Nombre es requerido" };
    try {
      return await householdService.create(body, req.userId!);
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }

  /**
   * @swagger
   * /api/household/{id}:
   *   put:
   *     tags: [Hogar]
   *     summary: Actualizar configuración del hogar
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               shareHome:
   *                 type: boolean
   *               shareShopping:
   *                 type: boolean
   *               shareAlerts:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Hogar actualizado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Household'
   *       403:
   *         description: No eres miembro de este hogar
   */
  @Put("/:id")
  async update(
    @Param("id") id: number,
    @Body() body: any,
    @Req() req: AuthRequest,
  ) {
    try {
      return await householdService.update(id, body, req.userId!);
    } catch (e: any) {
      throw { httpCode: 403, message: e.message };
    }
  }

  /**
   * @swagger
   * /api/household/{id}/invite:
   *   post:
   *     tags: [Hogar]
   *     summary: Enviar invitación por email a un usuario
   *     description: Solo el ADMIN puede invitar. No se puede invitar si ya hay una invitación pendiente activa o si el usuario ya es miembro
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: amigo@ejemplo.com
   *     responses:
   *       200:
   *         description: Invitación enviada
   *       400:
   *         description: Email requerido, usuario ya miembro o invitación pendiente ya existe
   */
  @Post("/:id/invite")
  async invite(
    @Param("id") id: number,
    @Body() body: { email: string },
    @Req() req: AuthRequest,
  ) {
    if (!body.email) throw { httpCode: 400, message: "Email es requerido" };
    try {
      return await householdService.invite(id, body, req.userId!);
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }

  /**
   * @swagger
   * /api/household/accept-invite:
   *   post:
   *     tags: [Hogar]
   *     summary: Aceptar invitación mediante token
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [token]
   *             properties:
   *               token:
   *                 type: string
   *                 example: "abc123def456"
   *     responses:
   *       200:
   *         description: Hogar al que se ha unido
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Household'
   *       400:
   *         description: Token inválido, caducado, email no coincide o usuario ya en un hogar
   */
  @Post("/accept-invite")
  async acceptInvite(@Body() body: { token: string }, @Req() req: AuthRequest) {
    if (!body.token) throw { httpCode: 400, message: "Token es requerido" };
    try {
      return await householdService.acceptInvite(body.token, req.userId!);
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }

  /**
   * @swagger
   * /api/household/join-by-code:
   *   post:
   *     tags: [Hogar]
   *     summary: Unirse a un hogar mediante código
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [code]
   *             properties:
   *               code:
   *                 type: string
   *                 example: "AB12CD34"
   *     responses:
   *       200:
   *         description: Hogar al que se ha unido
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Household'
   *       400:
   *         description: Código inválido o usuario ya en un hogar
   */
  @Post("/join-by-code")
  async joinByCode(@Body() body: { code: string }, @Req() req: AuthRequest) {
    if (!body.code) throw { httpCode: 400, message: "Código es requerido" };
    try {
      return await householdService.joinByCode(body.code, req.userId!);
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }

  /**
   * @swagger
   * /api/household/pending-invites:
   *   get:
   *     tags: [Hogar]
   *     summary: Obtener invitaciones pendientes recibidas por el usuario autenticado
   *     responses:
   *       200:
   *         description: Lista de invitaciones pendientes para el email del usuario
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: integer
   *                   email:
   *                     type: string
   *                   token:
   *                     type: string
   *                   household:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: integer
   *                       name:
   *                         type: string
   *                   sender:
   *                     type: object
   *                     properties:
   *                       name:
   *                         type: string
   */
  @Get("/pending-invites")
  async getPendingInvites(@Req() req: AuthRequest) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { email: true },
      });
      if (!user) throw { httpCode: 404, message: "Usuario no encontrado" };
      return await householdService.getPendingInvitesForUser(user.email);
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }

  /**
   * @swagger
   * /api/household/{id}/invites/{inviteId}:
   *   delete:
   *     tags: [Hogar]
   *     summary: Cancelar una invitación pendiente
   *     description: Solo el ADMIN del hogar puede cancelar invitaciones
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID del hogar
   *       - in: path
   *         name: inviteId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID de la invitación a cancelar
   *     responses:
   *       204:
   *         description: Invitación cancelada
   *       403:
   *         description: No eres miembro o no eres ADMIN
   */
  @Delete("/:id/invites/:inviteId")
  @HttpCode(204)
  async cancelInvite(
    @Param("id") id: number,
    @Param("inviteId") inviteId: number,
    @Req() req: AuthRequest,
  ) {
    try {
      await householdService.cancelInvite(id, inviteId, req.userId!);
      return null;
    } catch (e: any) {
      throw { httpCode: 403, message: e.message };
    }
  }

  /**
   * @swagger
   * /api/household/{id}/members/{userId}:
   *   delete:
   *     tags: [Hogar]
   *     summary: Eliminar miembro del hogar
   *     description: El ADMIN puede eliminar a cualquier miembro (excepto a sí mismo). Cualquier miembro puede eliminarse a sí mismo (equivale a abandonar)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID del hogar
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *         description: ID del usuario a eliminar
   *     responses:
   *       204:
   *         description: Miembro eliminado
   *       403:
   *         description: Sin permisos
   */
  @Delete("/:id/members/:userId")
  @HttpCode(204)
  async removeMember(
    @Param("id") id: number,
    @Param("userId") targetUserId: number,
    @Req() req: AuthRequest,
  ) {
    try {
      await householdService.removeMember(id, targetUserId, req.userId!);
      return null;
    } catch (e: any) {
      throw { httpCode: 403, message: e.message };
    }
  }

  /**
   * @swagger
   * /api/household/{id}/leave:
   *   post:
   *     tags: [Hogar]
   *     summary: Abandonar el hogar
   *     description: El admin solo puede salir si es el único miembro. Si hay otros, debe transferir el rol o disolver el hogar.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Hogar abandonado correctamente
   *       400:
   *         description: Error al abandonar (ej. admin con otros miembros)
   */
  @Post("/:id/leave")
  async leave(@Param("id") id: number, @Req() req: AuthRequest) {
    try {
      return await householdService.leave(id, req.userId!);
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }

  /**
   * @swagger
   * /api/household/{id}/transfer-admin:
   *   post:
   *     tags: [Hogar]
   *     summary: Transferir el rol de admin a otro miembro y salir del hogar
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [newAdminUserId]
   *             properties:
   *               newAdminUserId:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Admin transferido y solicitante eliminado del hogar
   *       400:
   *         description: Error
   */
  @Post("/:id/transfer-admin")
  async transferAdmin(
    @Param("id") id: number,
    @Body() body: { newAdminUserId: number },
    @Req() req: AuthRequest,
  ) {
    if (!body.newAdminUserId)
      throw { httpCode: 400, message: "newAdminUserId es requerido" };
    try {
      return await householdService.transferAdmin(
        id,
        body.newAdminUserId,
        req.userId!,
      );
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }

  /**
   * @swagger
   * /api/household/{id}/dissolve:
   *   post:
   *     tags: [Hogar]
   *     summary: Disolver el hogar (elimina todos los miembros y el hogar)
   *     description: Solo el ADMIN puede disolver el hogar.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Hogar disuelto
   *       400:
   *         description: Sin permisos
   */
  @Post("/:id/dissolve")
  async dissolve(@Param("id") id: number, @Req() req: AuthRequest) {
    try {
      return await householdService.dissolve(id, req.userId!);
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }

  /**
   * @swagger
   * /api/household/planning-scope:
   *   put:
   *     tags: [Hogar]
   *     summary: Configurar ámbito de alertas de planificación
   *     description: Determina si las alertas de stock se basan solo en tu planificación o en la de todos los miembros
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [scope]
   *             properties:
   *               scope:
   *                 type: string
   *                 enum: [own, all]
   *                 example: own
   *     responses:
   *       200:
   *         description: Configuración guardada
   *       400:
   *         description: Scope inválido
   */
  @Put("/planning-scope")
  async updatePlanningScope(
    @Body() body: { scope: "own" | "all" },
    @Req() req: AuthRequest,
  ) {
    if (!body.scope || !["own", "all"].includes(body.scope)) {
      throw { httpCode: 400, message: 'Scope debe ser "own" o "all"' };
    }
    return householdService.updatePlanningAlertScope(req.userId!, body.scope);
  }
}
