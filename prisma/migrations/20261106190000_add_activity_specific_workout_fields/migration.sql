ALTER TABLE "Workout"
ADD COLUMN "averagePowerWatts" INTEGER,
ADD COLUMN "maxPowerWatts" INTEGER,
ADD COLUMN "normalizedPowerWatts" INTEGER,
ADD COLUMN "totalReps" INTEGER,
ADD COLUMN "totalSets" INTEGER,
ADD COLUMN "aerobicTrainingEffect" DOUBLE PRECISION,
ADD COLUMN "anaerobicTrainingEffect" DOUBLE PRECISION;
