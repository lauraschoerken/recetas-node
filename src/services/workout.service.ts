import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface WorkoutInput {
  title: string;
  performedAt: string;
  durationMinutes?: number | null;
  caloriesBurned?: number | null;
  averageHeartRate?: number | null;
  exercises?: string | null;
  notes?: string | null;
  addCaloriesToGoal?: boolean;
  templateId?: number | null;
}

export interface WorkoutTemplateInput {
  title: string;
  durationMinutes?: number | null;
  caloriesBurned?: number | null;
  averageHeartRate?: number | null;
  exercises?: string | null;
  notes?: string | null;
  defaultAddCaloriesToGoal?: boolean;
}

function validateWorkout(data: WorkoutInput) {
  if (!data.title?.trim()) throw { httpCode: 400, message: 'El título es obligatorio' };
  if (!data.performedAt || Number.isNaN(new Date(data.performedAt).getTime())) {
    throw { httpCode: 400, message: 'La fecha del entrenamiento no es válida' };
  }
  if (data.durationMinutes != null && (data.durationMinutes < 1 || data.durationMinutes > 1440)) {
    throw { httpCode: 400, message: 'La duración debe estar entre 1 y 1440 minutos' };
  }
  if (data.caloriesBurned != null && (data.caloriesBurned < 0 || data.caloriesBurned > 10000)) {
    throw { httpCode: 400, message: 'Las calorías no son válidas' };
  }
  if (data.averageHeartRate != null && (data.averageHeartRate < 20 || data.averageHeartRate > 250)) {
    throw { httpCode: 400, message: 'Las pulsaciones no son válidas' };
  }
}

function validateTemplate(data: WorkoutTemplateInput) {
  validateWorkout({ ...data, performedAt: '2000-01-01T12:00:00', addCaloriesToGoal: data.defaultAddCaloriesToGoal });
}

class WorkoutService {
  async list(userId: number, startDate?: string, endDate?: string) {
    const performedAt = startDate || endDate ? {
      ...(startDate ? { gte: new Date(`${startDate}T00:00:00`) } : {}),
      ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999`) } : {})
    } : undefined;
    return prisma.workout.findMany({
      where: { userId, ...(performedAt ? { performedAt } : {}) },
      orderBy: { performedAt: 'desc' }
    });
  }

  async create(userId: number, data: WorkoutInput) {
    validateWorkout(data);
    if (data.templateId) {
      const template = await prisma.workoutTemplate.findFirst({ where: { id: data.templateId, userId } });
      if (!template) throw { httpCode: 404, message: 'Entrenamiento guardado no encontrado' };
    }
    return prisma.workout.create({
      data: {
        userId,
        title: data.title.trim(),
        performedAt: new Date(data.performedAt),
        durationMinutes: data.durationMinutes,
        caloriesBurned: data.caloriesBurned,
        averageHeartRate: data.averageHeartRate,
        exercises: data.exercises?.trim() || null,
        notes: data.notes?.trim() || null,
        addCaloriesToGoal: data.addCaloriesToGoal ?? false,
        templateId: data.templateId ?? null
      }
    });
  }

  async update(userId: number, id: number, data: WorkoutInput) {
    validateWorkout(data);
    const found = await prisma.workout.findFirst({ where: { id, userId } });
    if (!found) throw { httpCode: 404, message: 'Entrenamiento no encontrado' };
    return prisma.workout.update({
      where: { id },
      data: {
        title: data.title.trim(),
        performedAt: new Date(data.performedAt),
        durationMinutes: data.durationMinutes,
        caloriesBurned: data.caloriesBurned,
        averageHeartRate: data.averageHeartRate,
        exercises: data.exercises?.trim() || null,
        notes: data.notes?.trim() || null,
        addCaloriesToGoal: data.addCaloriesToGoal ?? false,
        templateId: data.templateId ?? null
      }
    });
  }

  async remove(userId: number, id: number) {
    const result = await prisma.workout.deleteMany({ where: { id, userId } });
    if (!result.count) throw { httpCode: 404, message: 'Entrenamiento no encontrado' };
  }

  async listTemplates(userId: number) {
    return prisma.workoutTemplate.findMany({ where: { userId }, orderBy: { title: 'asc' } });
  }

  async createTemplate(userId: number, data: WorkoutTemplateInput) {
    validateTemplate(data);
    return prisma.workoutTemplate.create({
      data: {
        userId,
        title: data.title.trim(),
        durationMinutes: data.durationMinutes,
        caloriesBurned: data.caloriesBurned,
        averageHeartRate: data.averageHeartRate,
        exercises: data.exercises?.trim() || null,
        notes: data.notes?.trim() || null,
        defaultAddCaloriesToGoal: data.defaultAddCaloriesToGoal ?? false
      }
    });
  }

  async updateTemplate(userId: number, id: number, data: WorkoutTemplateInput) {
    validateTemplate(data);
    const found = await prisma.workoutTemplate.findFirst({ where: { id, userId } });
    if (!found) throw { httpCode: 404, message: 'Entrenamiento guardado no encontrado' };
    return prisma.workoutTemplate.update({ where: { id }, data: {
      title: data.title.trim(), durationMinutes: data.durationMinutes, caloriesBurned: data.caloriesBurned,
      averageHeartRate: data.averageHeartRate, exercises: data.exercises?.trim() || null,
      notes: data.notes?.trim() || null, defaultAddCaloriesToGoal: data.defaultAddCaloriesToGoal ?? false
    } });
  }

  async removeTemplate(userId: number, id: number) {
    const result = await prisma.workoutTemplate.deleteMany({ where: { id, userId } });
    if (!result.count) throw { httpCode: 404, message: 'Entrenamiento guardado no encontrado' };
  }

  async importJson(userId: number, payload: { templates?: unknown[]; entries?: unknown[] }) {
    const rawTemplates = Array.isArray(payload.templates) ? payload.templates : [];
    const rawEntries = Array.isArray(payload.entries) ? payload.entries : [];
    if (rawTemplates.length + rawEntries.length === 0) throw { httpCode: 400, message: 'El JSON no contiene templates ni entries' };
    if (rawTemplates.length + rawEntries.length > 200) throw { httpCode: 400, message: 'La importación admite un máximo de 200 elementos' };

    let templatesImported = 0;
    for (let index = 0; index < rawTemplates.length; index++) {
      const raw = rawTemplates[index] as any;
      const input = this.normalizeTemplate(raw, `template ${index + 1}`);
      await prisma.workoutTemplate.upsert({
        where: { userId_title: { userId, title: input.title } },
        create: { userId, ...input },
        update: input
      });
      templatesImported++;
    }

    const created = [];
    for (let index = 0; index < rawEntries.length; index++) {
      const raw = rawEntries[index] as any;
      if (!raw || typeof raw !== 'object') throw { httpCode: 400, message: `entry ${index + 1} debe ser un objeto` };
      const kind = String(raw.kind || raw.type || 'custom').toLowerCase();
      const date = String(raw.date || raw.performedAt || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw { httpCode: 400, message: `entry ${index + 1}: date debe tener formato YYYY-MM-DD` };
      if (kind === 'template' || kind === 'saved') {
        const template = raw.templateId
          ? await prisma.workoutTemplate.findFirst({ where: { id: Number(raw.templateId), userId } })
          : await prisma.workoutTemplate.findFirst({ where: { userId, title: { equals: String(raw.templateTitle || raw.title || ''), mode: 'insensitive' } } });
        if (!template) throw { httpCode: 400, message: `entry ${index + 1}: entrenamiento guardado no encontrado` };
        created.push(await this.create(userId, {
          title: template.title, performedAt: `${date}T12:00:00`, durationMinutes: raw.durationMinutes ?? template.durationMinutes,
          caloriesBurned: raw.caloriesBurned ?? template.caloriesBurned, averageHeartRate: raw.averageHeartRate ?? template.averageHeartRate,
          exercises: raw.exercises ?? template.exercises, notes: raw.notes ?? template.notes,
          addCaloriesToGoal: raw.addCaloriesToGoal ?? template.defaultAddCaloriesToGoal, templateId: template.id
        }));
      } else if (kind === 'custom' || kind === 'manual') {
        created.push(await this.create(userId, {
          title: String(raw.title || '').trim(), performedAt: `${date}T12:00:00`, durationMinutes: this.optionalNumber(raw.durationMinutes),
          caloriesBurned: this.optionalNumber(raw.caloriesBurned), averageHeartRate: this.optionalNumber(raw.averageHeartRate),
          exercises: raw.exercises ? String(raw.exercises) : null, notes: raw.notes ? String(raw.notes) : null,
          addCaloriesToGoal: raw.addCaloriesToGoal === true
        }));
      } else throw { httpCode: 400, message: `entry ${index + 1}: kind no válido: ${kind}` };
    }
    return { templatesImported, importedCount: created.length, entries: created };
  }

  private normalizeTemplate(raw: any, label: string) {
    const input: WorkoutTemplateInput = {
      title: String(raw?.title || '').trim(), durationMinutes: this.optionalNumber(raw?.durationMinutes),
      caloriesBurned: this.optionalNumber(raw?.caloriesBurned), averageHeartRate: this.optionalNumber(raw?.averageHeartRate),
      exercises: raw?.exercises ? String(raw.exercises) : null, notes: raw?.notes ? String(raw.notes) : null,
      defaultAddCaloriesToGoal: raw?.defaultAddCaloriesToGoal === true
    };
    try { validateTemplate(input); } catch (error: any) { throw { httpCode: 400, message: `${label}: ${error.message}` }; }
    return input;
  }

  private optionalNumber(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw { httpCode: 400, message: `${value} no es un número válido` };
    return parsed;
  }
}

export const workoutService = new WorkoutService();
