ALTER TABLE "User" ADD COLUMN "birthDate" DATE;

CREATE TABLE "Workout" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "caloriesBurned" INTEGER,
    "averageHeartRate" INTEGER,
    "notes" TEXT,
    "exercises" TEXT,
    "addCaloriesToGoal" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Workout_userId_performedAt_idx" ON "Workout"("userId", "performedAt");
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
