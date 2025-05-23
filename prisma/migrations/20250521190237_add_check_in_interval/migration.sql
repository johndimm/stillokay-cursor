-- AlterTable
ALTER TABLE "users" ADD COLUMN     "check_in_interval" INTEGER NOT NULL DEFAULT 24,
ALTER COLUMN "caregiver_email" DROP NOT NULL;
