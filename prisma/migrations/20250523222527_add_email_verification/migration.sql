-- AlterTable
ALTER TABLE "users" ADD COLUMN "caregiver_email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "caregiver_email_token" TEXT,
ADD COLUMN "caregiver_email_token_expiry" TIMESTAMP(3); 