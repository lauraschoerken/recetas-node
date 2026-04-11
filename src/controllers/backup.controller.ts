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
  @Get("/export")
  async exportAll(@Req() req: AuthRequest) {
    return backupService.exportAll(req.userId!);
  }

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
