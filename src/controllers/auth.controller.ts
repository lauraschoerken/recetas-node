import {
  JsonController,
  Post,
  Get,
  Put,
  Body,
  Req,
  UseBefore,
  HttpCode,
} from "routing-controllers";
import { authService } from "../services";
import { authMiddleware, AuthRequest } from "../middlewares";
import { Request } from "express";

@JsonController("/auth")
export class AuthController {
  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Registrar nuevo usuario
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password, name]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: usuario@ejemplo.com
   *               password:
   *                 type: string
   *                 example: "123456"
   *               name:
   *                 type: string
   *                 example: Juan García
   *     responses:
   *       201:
   *         description: Usuario registrado correctamente
   *       400:
   *         description: Email ya registrado o datos inválidos
   */
  @Post("/register")
  @HttpCode(201)
  async register(
    @Body() body: { email: string; password: string; name: string },
  ) {
    const { email, password, name } = body;

    if (!email || !password || !name) {
      throw { httpCode: 400, message: "Todos los campos son requeridos" };
    }

    try {
      return await authService.register({ email, password, name });
    } catch (error: any) {
      throw {
        httpCode: 400,
        message: error.message || "Error al registrar usuario",
      };
    }
  }

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Iniciar sesión
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: usuario@ejemplo.com
   *               password:
   *                 type: string
   *                 example: "123456"
   *     responses:
   *       200:
   *         description: Login exitoso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       401:
   *         description: Credenciales inválidas
   */
  @Post("/login")
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;

    if (!email || !password) {
      throw { httpCode: 400, message: "Email y contraseña son requeridos" };
    }

    try {
      return await authService.login({ email, password });
    } catch (error: any) {
      throw {
        httpCode: 401,
        message: error.message || "Credenciales inválidas",
      };
    }
  }

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     tags: [Auth]
   *     summary: Obtener usuario actual
   *     responses:
   *       200:
   *         description: Datos del usuario
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         description: No autenticado
   */
  @Get("/me")
  @UseBefore(authMiddleware)
  async me(@Req() req: AuthRequest) {
    if (!req.userId) {
      throw { httpCode: 401, message: "No autorizado" };
    }

    const user = await authService.getUserById(req.userId);

    if (!user) {
      throw { httpCode: 404, message: "Usuario no encontrado" };
    }

    return user;
  }

  @Put("/account")
  @UseBefore(authMiddleware)
  async updateAccount(
    @Req() req: AuthRequest,
    @Body() body: { name?: string; email?: string; imageUrl?: string },
  ) {
    if (!req.userId) throw { httpCode: 401, message: "No autorizado" };
    try {
      return await authService.updateAccount(req.userId, body);
    } catch (error: any) {
      throw {
        httpCode: 400,
        message: error.message || "Error al actualizar cuenta",
      };
    }
  }

  @Post("/change-password")
  @UseBefore(authMiddleware)
  async changePassword(
    @Req() req: AuthRequest,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (!req.userId) throw { httpCode: 401, message: "No autorizado" };
    if (!body.currentPassword || !body.newPassword) {
      throw { httpCode: 400, message: "Ambas contraseñas son requeridas" };
    }
    if (body.newPassword.length < 6) {
      throw {
        httpCode: 400,
        message: "La nueva contraseña debe tener al menos 6 caracteres",
      };
    }
    try {
      return await authService.changePassword(
        req.userId,
        body.currentPassword,
        body.newPassword,
      );
    } catch (error: any) {
      throw {
        httpCode: 400,
        message: error.message || "Error al cambiar contraseña",
      };
    }
  }
}
