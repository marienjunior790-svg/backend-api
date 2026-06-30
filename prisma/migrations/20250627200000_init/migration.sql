-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('AGENCY', 'OWNER');
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'AGENT', 'TENANT');
CREATE TYPE "ApartmentStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE');
CREATE TYPE "LeaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'LATE', 'PARTIAL', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CHECK', 'OTHER');
CREATE TYPE "DocumentType" AS ENUM ('APARTMENT_PHOTO', 'LEASE_CONTRACT', 'PAYMENT_RECEIPT', 'ID_DOCUMENT', 'OTHER');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Brazzaville',
    "country" TEXT NOT NULL DEFAULT 'CG',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'AGENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "district" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Brazzaville',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "apartments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "buildingId" TEXT,
    "label" TEXT NOT NULL,
    "floor" INTEGER,
    "surface" DECIMAL(8,2),
    "rooms" INTEGER,
    "rentAmount" DECIMAL(12,0) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" "ApartmentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "apartments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "idNumber" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "leases" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "monthlyRent" DECIMAL(12,0) NOT NULL,
    "depositAmount" DECIMAL(12,0),
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "status" "LeaseStatus" NOT NULL DEFAULT 'DRAFT',
    "terms" TEXT,
    "contractPdfUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "amount" DECIMAL(12,0) NOT NULL,
    "amountPaid" DECIMAL(12,0) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "dueDate" DATE NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentMethod",
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "receiptPdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "cloudinaryUrl" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT NOT NULL,
    "apartmentId" TEXT,
    "leaseId" TEXT,
    "paymentId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organizations_type_idx" ON "organizations"("type");

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");
CREATE INDEX "users_role_idx" ON "users"("role");

CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

CREATE INDEX "buildings_organizationId_idx" ON "buildings"("organizationId");
CREATE INDEX "buildings_organizationId_city_idx" ON "buildings"("organizationId", "city");

CREATE INDEX "apartments_organizationId_idx" ON "apartments"("organizationId");
CREATE INDEX "apartments_organizationId_status_idx" ON "apartments"("organizationId", "status");
CREATE INDEX "apartments_buildingId_idx" ON "apartments"("buildingId");

CREATE UNIQUE INDEX "tenants_userId_key" ON "tenants"("userId");
CREATE INDEX "tenants_organizationId_idx" ON "tenants"("organizationId");
CREATE INDEX "tenants_organizationId_phone_idx" ON "tenants"("organizationId", "phone");

CREATE INDEX "leases_organizationId_idx" ON "leases"("organizationId");
CREATE INDEX "leases_organizationId_status_idx" ON "leases"("organizationId", "status");
CREATE INDEX "leases_apartmentId_idx" ON "leases"("apartmentId");
CREATE INDEX "leases_tenantId_idx" ON "leases"("tenantId");
CREATE INDEX "leases_endDate_idx" ON "leases"("endDate");

CREATE UNIQUE INDEX "payments_leaseId_periodMonth_periodYear_key" ON "payments"("leaseId", "periodMonth", "periodYear");
CREATE INDEX "payments_organizationId_idx" ON "payments"("organizationId");
CREATE INDEX "payments_organizationId_status_idx" ON "payments"("organizationId", "status");
CREATE INDEX "payments_dueDate_idx" ON "payments"("dueDate");
CREATE INDEX "payments_status_idx" ON "payments"("status");

CREATE INDEX "documents_organizationId_idx" ON "documents"("organizationId");
CREATE INDEX "documents_apartmentId_idx" ON "documents"("apartmentId");
CREATE INDEX "documents_leaseId_idx" ON "documents"("leaseId");
CREATE INDEX "documents_paymentId_idx" ON "documents"("paymentId");
CREATE INDEX "documents_type_idx" ON "documents"("type");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "buildings" ADD CONSTRAINT "buildings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "apartments" ADD CONSTRAINT "apartments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "apartments" ADD CONSTRAINT "apartments_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tenants" ADD CONSTRAINT "tenants_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leases" ADD CONSTRAINT "leases_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
