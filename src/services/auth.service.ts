import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { CreateUserDto, LoginDto, AuthResponse, UserResponse } from "../domain";

const prisma = new PrismaClient();

export class AuthService {
  async register(data: CreateUserDto): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("El email ya está registrado");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
    });

    const token = this.generateToken(user.id);
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    return { user: userResponse, token };
  }

  async login(data: LoginDto): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error("Credenciales inválidas");
    }

    const validPassword = await bcrypt.compare(data.password, user.password);

    if (!validPassword) {
      throw new Error("Credenciales inválidas");
    }

    const token = this.generateToken(user.id);
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl || undefined,
    };

    return { user: userResponse, token };
  }

  async getUserById(id: number): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  private generateToken(userId: number): string {
    return jwt.sign({ userId }, process.env.JWT_SECRET || "default-secret", {
      expiresIn: "7d",
    });
  }
}

export const authService = new AuthService();
