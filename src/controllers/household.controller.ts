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
  @Get("/")
  async get(@Req() req: AuthRequest) {
    const result = await householdService.getForUser(req.userId!);
    return result ?? { household: null };
  }

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

  @Post("/accept-invite")
  async acceptInvite(@Body() body: { token: string }, @Req() req: AuthRequest) {
    if (!body.token) throw { httpCode: 400, message: "Token es requerido" };
    try {
      return await householdService.acceptInvite(body.token, req.userId!);
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }

  @Post("/join-by-code")
  async joinByCode(@Body() body: { code: string }, @Req() req: AuthRequest) {
    if (!body.code) throw { httpCode: 400, message: "Código es requerido" };
    try {
      return await householdService.joinByCode(body.code, req.userId!);
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }

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

  @Post("/:id/leave")
  async leave(@Param("id") id: number, @Req() req: AuthRequest) {
    try {
      return await householdService.leave(id, req.userId!);
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }

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
