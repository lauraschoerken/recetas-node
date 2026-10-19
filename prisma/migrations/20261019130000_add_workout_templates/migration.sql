CREATE TABLE "WorkoutTemplate" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "caloriesBurned" INTEGER,
    "averageHeartRate" INTEGER,
    "exercises" TEXT,
    "notes" TEXT,
    "defaultAddCaloriesToGoal" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Workout" ADD COLUMN "templateId" INTEGER;
CREATE UNIQUE INDEX "WorkoutTemplate_userId_title_key" ON "WorkoutTemplate"("userId", "title");
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
