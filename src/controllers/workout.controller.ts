import { Body, Delete, Get, JsonController, Param, Post, Put, QueryParam, Req, UseBefore } from 'routing-controllers';
import { authMiddleware, AuthRequest } from '../middlewares';
import { WorkoutInput, WorkoutTemplateInput, workoutService } from '../services/workout.service';

@JsonController('/workouts')
@UseBefore(authMiddleware)
export class WorkoutController {
  @Get('/')
  list(@Req() req: AuthRequest, @QueryParam('startDate') startDate?: string, @QueryParam('endDate') endDate?: string) {
    return workoutService.list(req.userId!, startDate, endDate);
  }

  @Post('/')
  create(@Req() req: AuthRequest, @Body() body: WorkoutInput) {
    return workoutService.create(req.userId!, body);
  }

  @Post('/import')
  importJson(@Req() req: AuthRequest, @Body() body: { templates?: unknown[]; entries?: unknown[] }) {
    return workoutService.importJson(req.userId!, body);
  }

  @Put('/:id')
  update(@Req() req: AuthRequest, @Param('id') id: number, @Body() body: WorkoutInput) {
    return workoutService.update(req.userId!, id, body);
  }

  @Delete('/:id')
  async remove(@Req() req: AuthRequest, @Param('id') id: number) {
    await workoutService.remove(req.userId!, id);
    return { success: true };
  }
}

@JsonController('/workout-templates')
@UseBefore(authMiddleware)
export class WorkoutTemplateController {
  @Get('/')
  list(@Req() req: AuthRequest) { return workoutService.listTemplates(req.userId!); }

  @Post('/')
  create(@Req() req: AuthRequest, @Body() body: WorkoutTemplateInput) {
    return workoutService.createTemplate(req.userId!, body);
  }

  @Put('/:id')
  update(@Req() req: AuthRequest, @Param('id') id: number, @Body() body: WorkoutTemplateInput) {
    return workoutService.updateTemplate(req.userId!, id, body);
  }

  @Delete('/:id')
  async remove(@Req() req: AuthRequest, @Param('id') id: number) {
    await workoutService.removeTemplate(req.userId!, id);
    return { success: true };
  }
}
