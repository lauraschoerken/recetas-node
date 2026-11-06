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
  activityType?: string | null;
  locationName?: string | null;
  distanceMeters?: number | null;
  durationSeconds?: number | null;
  movingDurationSeconds?: number | null;
  elapsedDurationSeconds?: number | null;
  averageSpeedMps?: number | null;
  averageMovingSpeedMps?: number | null;
  maxSpeedMps?: number | null;
  elevationGainMeters?: number | null;
  elevationLossMeters?: number | null;
  minElevationMeters?: number | null;
  maxElevationMeters?: number | null;
  averageElevationMeters?: number | null;
  maxHeartRate?: number | null;
  minHeartRate?: number | null;
  averageCadence?: number | null;
  maxCadence?: number | null;
  steps?: number | null;
  restingCalories?: number | null;
  activeCalories?: number | null;
  estimatedSweatLossMl?: number | null;
  moderateIntensityMinutes?: number | null;
  vigorousIntensityMinutes?: number | null;
  intensityMinutes?: number | null;
  maxVerticalSpeedMps?: number | null;
  lapCount?: number | null;
  averagePowerWatts?: number | null;
  maxPowerWatts?: number | null;
  normalizedPowerWatts?: number | null;
  totalReps?: number | null;
  totalSets?: number | null;
  aerobicTrainingEffect?: number | null;
  anaerobicTrainingEffect?: number | null;
}

export interface GarminWorkoutPreview extends WorkoutInput {
  source: 'garmin';
  externalId: string;
  sourceUrl: string;
  activityType: string | null;
  locationName: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  movingDurationSeconds: number | null;
  elapsedDurationSeconds: number | null;
  averageSpeedMps: number | null;
  averageMovingSpeedMps: number | null;
  maxSpeedMps: number | null;
  elevationGainMeters: number | null;
  elevationLossMeters: number | null;
  minElevationMeters: number | null;
  maxElevationMeters: number | null;
  averageElevationMeters: number | null;
  maxHeartRate: number | null;
  minHeartRate: number | null;
  averageCadence: number | null;
  maxCadence: number | null;
  steps: number | null;
  restingCalories: number | null;
  activeCalories: number | null;
  estimatedSweatLossMl: number | null;
  moderateIntensityMinutes: number | null;
  vigorousIntensityMinutes: number | null;
  intensityMinutes: number | null;
  maxVerticalSpeedMps: number | null;
  lapCount: number | null;
  averagePowerWatts: number | null;
  maxPowerWatts: number | null;
  normalizedPowerWatts: number | null;
  totalReps: number | null;
  totalSets: number | null;
  aerobicTrainingEffect: number | null;
  anaerobicTrainingEffect: number | null;
}

const GARMIN_HOST = 'connect.garmin.com';
const GARMIN_ACTIVITY_PATH = /^\/(?:app|modern)\/activity\/(\d+)\/?$/;

function optionalFinite(value: unknown): number | null {
  const parsed = Number(value);
  return value == null || value === '' || !Number.isFinite(parsed) ? null : parsed;
}

function optionalRounded(value: unknown): number | null {
  const parsed = optionalFinite(value);
  return parsed == null ? null : Math.round(parsed);
}

function parseGarminUrl(rawUrl: string) {
  let url: URL;
  try { url = new URL(rawUrl.trim()); } catch { throw { httpCode: 400, message: 'El enlace de Garmin no es válido' }; }
  const match = url.hostname.toLowerCase() === GARMIN_HOST ? url.pathname.match(GARMIN_ACTIVITY_PATH) : null;
  if (!match) throw { httpCode: 400, message: 'Usa un enlace compartido de una actividad de Garmin Connect' };
  url.protocol = 'https:';
  url.hostname = GARMIN_HOST;
  return { activityId: match[1], url: url.toString() };
}

function cookiesFrom(headers: Headers): string {
  const values = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.()
    || (headers.get('set-cookie') ? [headers.get('set-cookie')!] : []);
  return values.flatMap((value) => value.split(/,(?=\s*[^;,=]+=[^;,]*)/))
    .map((value) => value.split(';', 1)[0].trim()).filter(Boolean).join('; ');
}

export function normalizeGarminActivity(raw: any, sourceUrl: string, activityId: string): GarminWorkoutPreview {
  const summary = raw?.summaryDTO || {};
  const totalCalories = optionalRounded(summary.calories);
  const restingCalories = optionalRounded(summary.bmrCalories);
  const durationSeconds = optionalFinite(summary.duration);
  const moderateIntensityMinutes = optionalRounded(summary.moderateIntensityMinutes);
  const vigorousIntensityMinutes = optionalRounded(summary.vigorousIntensityMinutes);
  const startTimeGMT = summary.startTimeGMT ? `${String(summary.startTimeGMT).replace(/Z$/, '')}Z` : null;
  return {
    title: String(raw?.activityName || 'Actividad de Garmin').trim(),
    performedAt: String(startTimeGMT || summary.startTimeLocal || ''),
    durationMinutes: durationSeconds == null ? null : Math.max(1, Math.round(durationSeconds / 60)),
    caloriesBurned: totalCalories,
    averageHeartRate: optionalRounded(summary.averageHR),
    exercises: null,
    notes: null,
    addCaloriesToGoal: false,
    templateId: null,
    source: 'garmin', externalId: activityId, sourceUrl,
    activityType: raw?.activityTypeDTO?.typeKey
      ? String(raw.activityTypeDTO.typeKey)
      : (raw?.activityTypeDTO?.parentTypeId != null ? String(raw.activityTypeDTO.parentTypeId) : null),
    locationName: raw?.locationName ? String(raw.locationName) : null,
    distanceMeters: optionalFinite(summary.distance), durationSeconds,
    movingDurationSeconds: optionalFinite(summary.movingDuration),
    elapsedDurationSeconds: optionalFinite(summary.elapsedDuration),
    averageSpeedMps: optionalFinite(summary.averageSpeed),
    averageMovingSpeedMps: optionalFinite(summary.averageMovingSpeed),
    maxSpeedMps: optionalFinite(summary.maxSpeed),
    elevationGainMeters: optionalFinite(summary.elevationGain),
    elevationLossMeters: optionalFinite(summary.elevationLoss),
    minElevationMeters: optionalFinite(summary.minElevation),
    maxElevationMeters: optionalFinite(summary.maxElevation),
    averageElevationMeters: optionalFinite(summary.avgElevation),
    maxHeartRate: optionalRounded(summary.maxHR),
    minHeartRate: optionalRounded(summary.minHR),
    averageCadence: optionalFinite(summary.averageRunCadence ?? summary.averageBikeCadence ?? summary.averageSwimCadence ?? summary.averageCadence),
    maxCadence: optionalFinite(summary.maxRunCadence ?? summary.maxBikeCadence ?? summary.maxSwimCadence ?? summary.maxCadence),
    steps: optionalRounded(summary.steps), restingCalories,
    activeCalories: totalCalories == null ? null : Math.max(0, totalCalories - (restingCalories || 0)),
    estimatedSweatLossMl: optionalRounded(summary.waterEstimated),
    moderateIntensityMinutes, vigorousIntensityMinutes,
    intensityMinutes: moderateIntensityMinutes == null && vigorousIntensityMinutes == null
      ? null : (moderateIntensityMinutes || 0) + (vigorousIntensityMinutes || 0) * 2,
    maxVerticalSpeedMps: optionalFinite(summary.maxVerticalSpeed),
    lapCount: optionalRounded(raw?.metadataDTO?.lapCount),
    averagePowerWatts: optionalRounded(summary.averagePower ?? summary.avgPower),
    maxPowerWatts: optionalRounded(summary.maxPower),
    normalizedPowerWatts: optionalRounded(summary.normalizedPower ?? summary.normPower),
    totalReps: optionalRounded(summary.totalReps ?? summary.reps ?? raw?.metadataDTO?.totalReps),
    totalSets: optionalRounded(summary.totalSets ?? summary.setCount ?? raw?.metadataDTO?.totalSets),
    aerobicTrainingEffect: optionalFinite(summary.aerobicTrainingEffect ?? summary.trainingEffect),
    anaerobicTrainingEffect: optionalFinite(summary.anaerobicTrainingEffect),
  };
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
  private normalizeWorkoutDetails(raw: any) {
    return {
      activityType: raw?.activityType ? String(raw.activityType).trim() : null,
      locationName: raw?.locationName ? String(raw.locationName).trim() : null,
      distanceMeters: optionalFinite(raw?.distanceMeters),
      durationSeconds: optionalFinite(raw?.durationSeconds),
      movingDurationSeconds: optionalFinite(raw?.movingDurationSeconds),
      elapsedDurationSeconds: optionalFinite(raw?.elapsedDurationSeconds),
      averageSpeedMps: optionalFinite(raw?.averageSpeedMps),
      averageMovingSpeedMps: optionalFinite(raw?.averageMovingSpeedMps),
      maxSpeedMps: optionalFinite(raw?.maxSpeedMps),
      elevationGainMeters: optionalFinite(raw?.elevationGainMeters),
      elevationLossMeters: optionalFinite(raw?.elevationLossMeters),
      minElevationMeters: optionalFinite(raw?.minElevationMeters),
      maxElevationMeters: optionalFinite(raw?.maxElevationMeters),
      averageElevationMeters: optionalFinite(raw?.averageElevationMeters),
      maxHeartRate: optionalRounded(raw?.maxHeartRate),
      minHeartRate: optionalRounded(raw?.minHeartRate),
      averageCadence: optionalFinite(raw?.averageCadence),
      maxCadence: optionalFinite(raw?.maxCadence),
      steps: optionalRounded(raw?.steps),
      restingCalories: optionalRounded(raw?.restingCalories),
      activeCalories: optionalRounded(raw?.activeCalories),
      estimatedSweatLossMl: optionalRounded(raw?.estimatedSweatLossMl),
      moderateIntensityMinutes: optionalRounded(raw?.moderateIntensityMinutes),
      vigorousIntensityMinutes: optionalRounded(raw?.vigorousIntensityMinutes),
      intensityMinutes: optionalRounded(raw?.intensityMinutes),
      maxVerticalSpeedMps: optionalFinite(raw?.maxVerticalSpeedMps),
      lapCount: optionalRounded(raw?.lapCount),
      averagePowerWatts: optionalRounded(raw?.averagePowerWatts),
      maxPowerWatts: optionalRounded(raw?.maxPowerWatts),
      normalizedPowerWatts: optionalRounded(raw?.normalizedPowerWatts),
      totalReps: optionalRounded(raw?.totalReps),
      totalSets: optionalRounded(raw?.totalSets),
      aerobicTrainingEffect: optionalFinite(raw?.aerobicTrainingEffect),
      anaerobicTrainingEffect: optionalFinite(raw?.anaerobicTrainingEffect),
    };
  }

  async previewGarmin(rawUrl: string): Promise<GarminWorkoutPreview> {
    const { activityId, url } = parseGarminUrl(rawUrl);
    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0.0.0 Safari/537.36',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    };
    let page: Response;
    try { page = await fetch(url, { headers: { ...browserHeaders, Accept: 'text/html,application/xhtml+xml' }, redirect: 'follow' }); }
    catch { throw { httpCode: 502, message: 'No se pudo conectar con Garmin Connect' }; }
    if (!page.ok) throw { httpCode: 502, message: 'Garmin no ha permitido abrir el enlace compartido' };
    const html = await page.text();
    const csrf = html.match(/<meta\s+name=["']csrf-token["']\s+content=["']([^"']+)["']/i)?.[1];
    if (!csrf) throw { httpCode: 502, message: 'Garmin no devolvió una sesión pública válida' };
    const cookie = cookiesFrom(page.headers);
    let activity: Response;
    try {
      activity = await fetch(`https://${GARMIN_HOST}/gc-api/activity-service/activity/${activityId}`, {
        headers: {
          ...browserHeaders, Accept: 'application/json, text/plain, */*', Referer: url,
          Origin: `https://${GARMIN_HOST}`, 'Connect-Csrf-Token': csrf,
          'Sec-Fetch-Dest': 'empty', 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Site': 'same-origin',
          ...(cookie ? { Cookie: cookie } : {})
        }
      });
    } catch { throw { httpCode: 502, message: 'No se pudieron obtener los datos de Garmin' }; }
    if (activity.status === 401 || activity.status === 403 || activity.status === 404) {
      throw { httpCode: 400, message: 'La actividad no es pública o el enlace compartido ha caducado' };
    }
    if (!activity.ok) throw { httpCode: 502, message: 'Garmin no pudo devolver los datos de la actividad' };
    const data = await activity.json();
    const preview = normalizeGarminActivity(data, url, activityId);
    if (!preview.performedAt || Number.isNaN(new Date(preview.performedAt).getTime())) {
      throw { httpCode: 502, message: 'Garmin no devolvió una fecha válida para la actividad' };
    }
    return preview;
  }

  async importGarmin(userId: number, rawUrl: string, addCaloriesToGoal: boolean) {
    const preview = await this.previewGarmin(rawUrl);
    const duplicate = await prisma.workout.findFirst({ where: { userId, source: 'garmin', externalId: preview.externalId } });
    if (duplicate) throw { httpCode: 409, message: 'Esta actividad de Garmin ya está importada' };
    validateWorkout(preview);
    return prisma.workout.create({ data: { ...preview, userId, addCaloriesToGoal } });
  }

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
        templateId: data.templateId ?? null,
        ...this.normalizeWorkoutDetails(data)
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
        templateId: data.templateId ?? null,
        ...this.normalizeWorkoutDetails(data)
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
          addCaloriesToGoal: raw.addCaloriesToGoal ?? template.defaultAddCaloriesToGoal, templateId: template.id,
          ...this.normalizeWorkoutDetails(raw)
        }));
      } else if (kind === 'custom' || kind === 'manual') {
        created.push(await this.create(userId, {
          title: String(raw.title || '').trim(), performedAt: `${date}T12:00:00`, durationMinutes: this.optionalNumber(raw.durationMinutes),
          caloriesBurned: this.optionalNumber(raw.caloriesBurned), averageHeartRate: this.optionalNumber(raw.averageHeartRate),
          exercises: raw.exercises ? String(raw.exercises) : null, notes: raw.notes ? String(raw.notes) : null,
          addCaloriesToGoal: raw.addCaloriesToGoal === true,
          ...this.normalizeWorkoutDetails(raw)
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
