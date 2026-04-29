import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class IngredientProposalService {
  async getAll(filters: { status?: string; userId?: number } = {}) {
    return prisma.ingredientProposal.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.userId ? { proposedByUserId: filters.userId } : {}),
      },
      include: {
        proposedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } },
        ingredient: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getById(id: number) {
    return prisma.ingredientProposal.findUnique({
      where: { id },
      include: {
        proposedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true } },
        ingredient: { select: { id: true, name: true } },
        variant: { select: { id: true, name: true } },
      },
    });
  }

  async create(
    data: {
      type: string;
      ingredientId: number;
      variantId?: number;
      fieldName?: string;
      currentValue?: unknown;
      proposedValue?: unknown;
    },
    proposedByUserId: number,
  ) {
    return prisma.ingredientProposal.create({
      data: {
        type: data.type,
        ingredientId: data.ingredientId,
        variantId: data.variantId,
        fieldName: data.fieldName,
        currentValue: data.currentValue as never,
        proposedValue: data.proposedValue as never,
        proposedByUserId,
        status: "PENDING",
      },
    });
  }

  async review(
    proposalId: number,
    reviewedByUserId: number,
    status: "ACCEPTED" | "REJECTED",
    adminNote?: string,
  ) {
    const proposal = await prisma.ingredientProposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal || proposal.status !== "PENDING") return null;

    const updated = await prisma.ingredientProposal.update({
      where: { id: proposalId },
      data: {
        status,
        reviewedByUserId,
        adminNote,
        updatedAt: new Date(),
      },
    });

    // Si se acepta, aplicar el cambio automáticamente
    if (status === "ACCEPTED") {
      await this.applyProposal(updated);
    }

    return updated;
  }

  private async applyProposal(proposal: {
    type: string;
    ingredientId: number;
    variantId: number | null;
    fieldName: string | null;
    proposedValue: unknown;
  }) {
    if (
      proposal.type === "EDIT_FIELD" &&
      proposal.fieldName &&
      proposal.proposedValue != null
    ) {
      await prisma.ingredient.update({
        where: { id: proposal.ingredientId },
        data: { [proposal.fieldName]: proposal.proposedValue },
      });
    } else if (
      proposal.type === "EDIT_VARIANT" &&
      proposal.variantId &&
      proposal.fieldName
    ) {
      await prisma.ingredientVariant.update({
        where: { id: proposal.variantId },
        data: { [proposal.fieldName]: proposal.proposedValue },
      });
    }
    // NEW_INGREDIENT, NEW_VARIANT, NEW_CONVERSION son manejados manualmente por admin
  }
}

export const ingredientProposalService = new IngredientProposalService();
