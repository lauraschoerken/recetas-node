import { PrismaClient } from "@prisma/client";
import {
  CreateHouseholdDto,
  InviteMemberDto,
  UpdateHouseholdDto,
} from "../domain";
import { emailService } from "./email.service";

const prisma = new PrismaClient();

const INVITE_EXPIRY_DAYS = 7;

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const householdService = {
  async getForUser(userId: number) {
    const membership = await prisma.householdMember.findFirst({
      where: { userId },
      include: {
        household: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, imageUrl: true },
                },
              },
            },
            invites: {
              where: { accepted: false, expiresAt: { gt: new Date() } },
            },
          },
        },
      },
    });
    if (!membership) return null;
    return { ...membership.household, myRole: membership.role };
  },

  async create(dto: CreateHouseholdDto, userId: number) {
    const existing = await prisma.householdMember.findFirst({
      where: { userId },
    });
    if (existing) throw new Error("Ya perteneces a un hogar");

    const joinCode = generateJoinCode();

    const household = await prisma.household.create({
      data: {
        name: dto.name,
        joinCode,
        members: {
          create: { userId, role: "ADMIN" },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, imageUrl: true },
            },
          },
        },
      },
    });

    // Transfer all user's items to the new household
    await prisma.$transaction([
      prisma.homeItem.updateMany({
        where: { userId },
        data: { householdId: household.id },
      }),
      prisma.shoppingItem.updateMany({
        where: { userId },
        data: { householdId: household.id },
      }),
      prisma.ingredientMinThreshold.updateMany({
        where: { userId },
        data: { householdId: household.id },
      }),
      prisma.recipeMinThreshold.updateMany({
        where: { userId },
        data: { householdId: household.id },
      }),
    ]);

    return household;
  },

  async update(householdId: number, dto: UpdateHouseholdDto, userId: number) {
    await this.assertMember(userId, householdId);
    return prisma.household.update({
      where: { id: householdId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.shareHome !== undefined && { shareHome: dto.shareHome }),
        ...(dto.shareShopping !== undefined && {
          shareShopping: dto.shareShopping,
        }),
        ...(dto.shareAlerts !== undefined && { shareAlerts: dto.shareAlerts }),
      },
    });
  },

  async invite(householdId: number, dto: InviteMemberDto, senderId: number) {
    await this.assertMember(senderId, householdId);
    const existingUser = await prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      const alreadyMember = await prisma.householdMember.findFirst({
        where: { userId: existingUser.id, householdId },
      });
      if (alreadyMember)
        throw new Error("Este usuario ya es miembro del hogar");
    }

    const pendingInvite = await prisma.householdInvite.findFirst({
      where: {
        email: dto.email,
        householdId,
        accepted: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (pendingInvite)
      throw new Error("Ya existe una invitación pendiente para este email");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    const invite = await prisma.householdInvite.create({
      data: { email: dto.email, expiresAt, senderId, householdId },
    });

    // Send invitation email
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true },
    });
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      select: { name: true },
    });
    await emailService.sendHouseholdInvite({
      toEmail: dto.email,
      senderName: sender?.name || "Un usuario",
      householdName: household?.name || "Hogar",
      token: invite.token,
    });

    return invite;
  },

  async acceptInvite(token: string, userId: number) {
    const invite = await prisma.householdInvite.findUnique({
      where: { token },
    });
    if (!invite) throw new Error("Invitación no encontrada");
    if (invite.accepted) throw new Error("Invitación ya aceptada");
    if (invite.expiresAt < new Date()) throw new Error("Invitación caducada");

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== invite.email)
      throw new Error("Email no coincide con la invitación");

    const existing = await prisma.householdMember.findFirst({
      where: { userId },
    });
    if (existing) throw new Error("Ya perteneces a un hogar");

    // Delete user's personal items before joining (they will use the household's items)
    await prisma.$transaction([
      prisma.homeItem.deleteMany({ where: { userId, householdId: null } }),
      prisma.shoppingItem.deleteMany({ where: { userId, householdId: null } }),
      prisma.ingredientMinThreshold.deleteMany({
        where: { userId, householdId: null },
      }),
      prisma.recipeMinThreshold.deleteMany({
        where: { userId, householdId: null },
      }),
      prisma.householdInvite.update({
        where: { id: invite.id },
        data: { accepted: true },
      }),
      prisma.householdMember.create({
        data: { userId, householdId: invite.householdId, role: "MEMBER" },
      }),
    ]);

    return this.getForUser(userId);
  },

  async joinByCode(code: string, userId: number) {
    const household = await prisma.household.findFirst({
      where: { joinCode: code.toUpperCase().trim() },
    });
    if (!household) throw new Error("Código de hogar no válido");

    const existing = await prisma.householdMember.findFirst({
      where: { userId },
    });
    if (existing) throw new Error("Ya perteneces a un hogar");

    // Delete user's personal items before joining
    await prisma.$transaction([
      prisma.homeItem.deleteMany({ where: { userId, householdId: null } }),
      prisma.shoppingItem.deleteMany({ where: { userId, householdId: null } }),
      prisma.ingredientMinThreshold.deleteMany({
        where: { userId, householdId: null },
      }),
      prisma.recipeMinThreshold.deleteMany({
        where: { userId, householdId: null },
      }),
      prisma.householdMember.create({
        data: { userId, householdId: household.id, role: "MEMBER" },
      }),
    ]);

    return this.getForUser(userId);
  },

  async getPendingInvitesForUser(email: string) {
    return prisma.householdInvite.findMany({
      where: {
        email,
        accepted: false,
        expiresAt: { gt: new Date() },
      },
      include: {
        household: { select: { id: true, name: true } },
        sender: { select: { name: true } },
      },
    });
  },

  async removeMember(
    householdId: number,
    targetUserId: number,
    requesterId: number,
  ) {
    const requester = await prisma.householdMember.findFirst({
      where: { userId: requesterId, householdId },
    });
    if (!requester) throw new Error("No eres miembro de este hogar");
    if (requester.role !== "ADMIN" && targetUserId !== requesterId) {
      throw new Error("Solo el administrador puede expulsar miembros");
    }

    await prisma.householdMember.deleteMany({
      where: { userId: targetUserId, householdId },
    });

    const remaining = await prisma.householdMember.count({
      where: { householdId },
    });
    if (remaining === 0) {
      await prisma.household.delete({ where: { id: householdId } });
    }

    return { success: true };
  },

  async leave(householdId: number, userId: number) {
    return this.removeMember(householdId, userId, userId);
  },

  async updatePlanningAlertScope(userId: number, scope: "own" | "all") {
    return prisma.user.update({
      where: { id: userId },
      data: { planningAlertScope: scope },
    });
  },

  async cancelInvite(
    householdId: number,
    inviteId: number,
    requesterId: number,
  ) {
    const requester = await prisma.householdMember.findFirst({
      where: { userId: requesterId, householdId },
    });
    if (!requester) throw new Error("No eres miembro de este hogar");
    if (requester.role !== "ADMIN")
      throw new Error("Solo el administrador puede cancelar invitaciones");

    const invite = await prisma.householdInvite.findFirst({
      where: { id: inviteId, householdId },
    });
    if (!invite) throw new Error("Invitación no encontrada");

    await prisma.householdInvite.delete({ where: { id: inviteId } });
    return { success: true };
  },

  async assertMember(userId: number, householdId: number) {
    const m = await prisma.householdMember.findFirst({
      where: { userId, householdId },
    });
    if (!m) throw new Error("No eres miembro de este hogar");
    return m;
  },

  async getHouseholdId(userId: number): Promise<number | null> {
    const m = await prisma.householdMember.findFirst({
      where: { userId },
      select: { householdId: true },
    });
    return m?.householdId ?? null;
  },
};
