import {
  JsonController,
  Get,
  Post,
  Body,
  Req,
  UseBefore,
} from "routing-controllers";
import { backupService } from "../services";
import { authMiddleware, AuthRequest } from "../middlewares";

@JsonController("/backup")
@UseBefore(authMiddleware)
export class BackupController {
  /**
   * @swagger
   * /api/backup/export:
   *   get:
   *     tags: [Backup]
   *     summary: Exportar todos los datos del usuario en JSON
   *     description: Devuelve recetas, ingredientes, items del hogar, plan semanal y lista de compra
   *     responses:
   *       200:
   *         description: Datos exportados
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 exportDate:
   *                   type: string
   *                   format: date-time
   *                 version:
   *                   type: string
   *                 recipes:
   *                   type: array
   *                 ingredients:
   *                   type: array
   *                 weekPlan:
   *                   type: array
   *                 homeItems:
   *                   type: array
   */
  @Get("/export")
  async exportAll(@Req() req: AuthRequest) {
    return backupService.exportAll(req.userId!);
  }

  /**
   * @swagger
   * /api/backup/export/csv:
   *   get:
   *     tags: [Backup]
   *     summary: Exportar datos en formato CSV (como ZIP)
   *     responses:
   *       200:
   *         description: Datos en formato CSV por tabla
   */
  @Get("/export/csv")
  async exportCsv(@Req() req: AuthRequest) {
    const data = await backupService.exportAll(req.userId!);
    const csvFiles = backupService.flattenForCsv(data);
    return {
      exportDate: data.exportDate,
      version: data.version,
      files: csvFiles,
    };
  }

  /**
   * @swagger
   * /api/backup/import:
   *   post:
   *     tags: [Backup]
   *     summary: Importar datos desde un backup JSON
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [data, mode]
   *             properties:
   *               data:
   *                 type: object
   *                 description: Datos exportados previamente (formato backup JSON)
   *               mode:
   *                 type: string
   *                 enum: [overwrite, keep, review]
   *                 description: "overwrite: sobreescribe duplicados; keep: conserva los existentes; review: devuelve conflictos sin importar"
   *                 example: keep
   *     responses:
   *       200:
   *         description: Resultado de la importación
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 results:
   *                   type: object
   *                   description: Resumen de items creados por tabla
   *       400:
   *         description: data o mode faltantes o mode inválido
   */
  @Post("/import")
  async importData(
    @Body() body: { data: any; mode: "overwrite" | "keep" | "review" },
    @Req() req: AuthRequest,
  ) {
    if (!body.data || !body.mode) {
      throw { httpCode: 400, message: "data y mode son requeridos" };
    }
    if (!["overwrite", "keep", "review"].includes(body.mode)) {
      throw {
        httpCode: 400,
        message: "mode debe ser overwrite, keep o review",
      };
    }
    try {
      return await backupService.importData(body.data, req.userId!, body.mode);
    } catch (e: any) {
      throw { httpCode: 400, message: e.message };
    }
  }
}
