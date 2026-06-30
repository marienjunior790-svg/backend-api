-- Step 2: wizard columns, documents table, default status

CREATE TYPE "ApplicationDocumentCategory" AS ENUM (
  'ID_CARD',
  'PROFILE_PHOTO',
  'INCOME_PROOF',
  'EMPLOYMENT_CONTRACT',
  'PROOF_OF_ADDRESS',
  'GUARANTOR_DOCUMENT',
  'ADDITIONAL'
);

ALTER TABLE "rental_applications"
  ADD COLUMN IF NOT EXISTS "formData" JSONB,
  ADD COLUMN IF NOT EXISTS "currentStep" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "employer" TEXT,
  ADD COLUMN IF NOT EXISTS "guarantorEmail" TEXT;

ALTER TABLE "rental_applications" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE TABLE IF NOT EXISTS "application_documents" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "category" "ApplicationDocumentCategory" NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER,
  "fileUrl" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "application_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "application_documents_applicationId_idx" ON "application_documents"("applicationId");
CREATE INDEX IF NOT EXISTS "application_documents_applicationId_category_idx" ON "application_documents"("applicationId", "category");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'application_documents_applicationId_fkey'
  ) THEN
    ALTER TABLE "application_documents"
      ADD CONSTRAINT "application_documents_applicationId_fkey"
      FOREIGN KEY ("applicationId") REFERENCES "rental_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
