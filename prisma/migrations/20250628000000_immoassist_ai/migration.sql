-- IMMOASSIST AI: technicien, publication, demandes location, validation agences

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TECHNICIAN';

CREATE TYPE "RentalApplicationStatus" AS ENUM (
  'PENDING',
  'UNDER_REVIEW',
  'AI_SCORED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN'
);

ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "isValidated" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "floorCount" INTEGER;
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,7);
ALTER TABLE "buildings" ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7);

ALTER TABLE "apartments" ADD COLUMN IF NOT EXISTS "amenities" TEXT;
ALTER TABLE "apartments" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "apartments" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "apartments_organizationId_isPublished_idx" ON "apartments"("organizationId", "isPublished");
CREATE INDEX IF NOT EXISTS "apartments_isPublished_status_idx" ON "apartments"("isPublished", "status");

CREATE TABLE IF NOT EXISTS "rental_applications" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "apartmentId" TEXT NOT NULL,
  "applicantUserId" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "profession" TEXT,
  "monthlyIncome" DECIMAL(12,0),
  "idNumber" TEXT,
  "guarantorName" TEXT,
  "guarantorPhone" TEXT,
  "documentsNotes" TEXT,
  "status" "RentalApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "aiScore" INTEGER,
  "aiSummary" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rental_applications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "rental_applications" ADD CONSTRAINT "rental_applications_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rental_applications" ADD CONSTRAINT "rental_applications_apartmentId_fkey"
  FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rental_applications" ADD CONSTRAINT "rental_applications_applicantUserId_fkey"
  FOREIGN KEY ("applicantUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rental_applications" ADD CONSTRAINT "rental_applications_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "rental_applications_organizationId_idx" ON "rental_applications"("organizationId");
CREATE INDEX IF NOT EXISTS "rental_applications_apartmentId_idx" ON "rental_applications"("apartmentId");
CREATE INDEX IF NOT EXISTS "rental_applications_applicantUserId_idx" ON "rental_applications"("applicantUserId");
CREATE INDEX IF NOT EXISTS "rental_applications_status_idx" ON "rental_applications"("status");
