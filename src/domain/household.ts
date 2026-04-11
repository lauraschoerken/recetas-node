export type HouseholdRole = "ADMIN" | "MEMBER";

export interface Household {
  id: number;
  name: string;
  createdAt: Date;
  shareHome: boolean;
  shareShopping: boolean;
  shareAlerts: boolean;
}

export interface HouseholdMember {
  id: number;
  role: HouseholdRole;
  joinedAt: Date;
  userId: number;
  householdId: number;
  user?: { id: number; name: string; email: string; imageUrl?: string | null };
}

export interface HouseholdInvite {
  id: number;
  email: string;
  token: string;
  expiresAt: Date;
  accepted: boolean;
  createdAt: Date;
  senderId: number;
  householdId: number;
}

export interface CreateHouseholdDto {
  name: string;
}

export interface InviteMemberDto {
  email: string;
}

export interface UpdateHouseholdDto {
  name?: string;
  shareHome?: boolean;
  shareShopping?: boolean;
  shareAlerts?: boolean;
}

export interface HouseholdWithMembers extends Household {
  members: HouseholdMember[];
  invites?: HouseholdInvite[];
}
