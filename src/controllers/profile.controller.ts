import { JsonController, Get, Put, Body, QueryParam, Req, UseBefore } from 'routing-controllers';
import { profileService } from '../services';
import { Gender, ActivityLevel, Goal, UserProfile } from '../services/profile.service';
import { authMiddleware, AuthRequest } from '../middlewares';

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         weight:
 *           type: number
 *           description: Peso en kg
 *         height:
 *           type: number
 *           description: Altura en cm
 *         age:
 *           type: integer
 *         gender:
 *           type: string
 *           enum: [male, female]
 *         activityLevel:
 *           type: string
 *           enum: [sedentary, light, moderate, active, very_active]
 *         goal:
 *           type: string
 *           enum: [maintain, lose, gain]
 *         customCalories:
 *           type: integer
 *         customProtein:
 *           type: integer
 *         customCarbs:
 *           type: integer
 *         customFat:
 *           type: integer
 *     RecommendedMacros:
 *       type: object
 *       properties:
 *         calories:
 *           type: integer
 *         protein:
 *           type: integer
 *         carbs:
 *           type: integer
 *         fat:
 *           type: integer
 *         bmr:
 *           type: integer
 *           description: Basal Metabolic Rate
 *         tdee:
 *           type: integer
 *           description: Total Daily Energy Expenditure
 *     WeeklyNutrition:
 *       type: object
 *       properties:
 *         days:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *               calories:
 *                 type: integer
 *               protein:
 *                 type: integer
 *               carbs:
 *                 type: integer
 *               fat:
 *                 type: integer
 *               fiber:
 *                 type: integer
 *         totals:
 *           type: object
 *         averages:
 *           type: object
 */

@JsonController('/profile')
@UseBefore(authMiddleware)
export class ProfileController {
  /**
   * @swagger
   * /api/profile:
   *   get:
   *     tags: [Perfil]
   *     summary: Obtener perfil del usuario
   *     responses:
   *       200:
   *         description: Perfil del usuario
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserProfile'
   */
  @Get('/')
  async getProfile(@Req() req: AuthRequest) {
    return profileService.getProfile(req.userId!);
  }

  /**
   * @swagger
   * /api/profile:
   *   put:
   *     tags: [Perfil]
   *     summary: Actualizar perfil del usuario
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UserProfile'
   *     responses:
   *       200:
   *         description: Perfil actualizado
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UserProfile'
   */
  @Put('/')
  async updateProfile(
    @Body() body: {
      imageUrl?: string;
      weight?: number;
      height?: number;
      age?: number;
      gender?: string;
      activityLevel?: string;
      goal?: string;
      customCalories?: number;
      customProtein?: number;
      customCarbs?: number;
      customFat?: number;
    },
    @Req() req: AuthRequest
  ) {
    const profileData: Partial<UserProfile> = {
      ...body,
      gender: body.gender as Gender | undefined,
      activityLevel: body.activityLevel as ActivityLevel | undefined,
      goal: body.goal as Goal | undefined
    };
    return profileService.updateProfile(req.userId!, profileData);
  }

  /**
   * @swagger
   * /api/profile/recommended-macros:
   *   get:
   *     tags: [Perfil]
   *     summary: Obtener macros recomendados calculados
   *     description: Calcula los macros basados en los datos del perfil usando la fórmula Mifflin-St Jeor
   *     responses:
   *       200:
   *         description: Macros recomendados
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/RecommendedMacros'
   *       204:
   *         description: No hay suficientes datos en el perfil para calcular
   */
  @Get('/recommended-macros')
  async getRecommendedMacros(@Req() req: AuthRequest) {
    const macros = await profileService.getRecommendedMacros(req.userId!);
    if (!macros) {
      return { message: 'No hay suficientes datos en el perfil para calcular los macros recomendados' };
    }
    return macros;
  }

  /**
   * @swagger
   * /api/profile/weekly-nutrition:
   *   get:
   *     tags: [Perfil]
   *     summary: Obtener nutrición semanal
   *     parameters:
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *           format: date
   *     responses:
   *       200:
   *         description: Nutrición de la semana
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/WeeklyNutrition'
   */
  @Get('/weekly-nutrition')
  async getWeeklyNutrition(
    @QueryParam('startDate') startDate: string,
    @QueryParam('endDate') endDate: string,
    @Req() req: AuthRequest
  ) {
    if (!startDate || !endDate) {
      throw { httpCode: 400, message: 'startDate y endDate son requeridos' };
    }

    // Parsear fechas como hora local (añadiendo T00:00:00 para evitar problemas de zona horaria)
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    return profileService.getWeeklyNutrition(
      req.userId!,
      start,
      end
    );
  }
}
