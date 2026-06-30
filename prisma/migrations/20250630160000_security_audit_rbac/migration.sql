-- Migration unique finale : audit + RBAC + états des lieux + centre de notifications
-- NE PAS exécuter avant validation complète de l'architecture backend

-- Extension des rôles futurs
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ACCOUNTANT';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MAINTENANCE_LEAD';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VISITOR';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPPORT';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SYSTEM_BOT';

-- Journal d'audit
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "userRole" "UserRole",
    "ipAddress" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");
CREATE INDEX "audit_logs_resourceType_resourceId_idx" ON "audit_logs"("resourceType", "resourceId");

-- RBAC — permissions en base
CREATE TABLE "rbac_permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rbac_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rbac_permissions_key_key" ON "rbac_permissions"("key");
CREATE INDEX "rbac_permissions_module_idx" ON "rbac_permissions"("module");

CREATE TABLE "rbac_role_permissions" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rbac_role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rbac_role_permissions_role_permissionKey_key" ON "rbac_role_permissions"("role", "permissionKey");
CREATE INDEX "rbac_role_permissions_role_idx" ON "rbac_role_permissions"("role");

ALTER TABLE "rbac_role_permissions" ADD CONSTRAINT "rbac_role_permissions_permissionKey_fkey" FOREIGN KEY ("permissionKey") REFERENCES "rbac_permissions"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- États des lieux
CREATE TYPE "InspectionType" AS ENUM ('ENTRY', 'EXIT');
CREATE TYPE "InspectionStatus" AS ENUM ('DRAFT', 'COMPLETED', 'SIGNED');

CREATE TABLE "property_inspections" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "leaseId" TEXT,
    "tenantId" TEXT,
    "type" "InspectionType" NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "checklist" JSONB,
    "photos" JSONB,
    "tenantSignatureUrl" TEXT,
    "agentSignatureUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "conductedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "property_inspections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "property_inspections_organizationId_createdAt_idx" ON "property_inspections"("organizationId", "createdAt");
CREATE INDEX "property_inspections_apartmentId_idx" ON "property_inspections"("apartmentId");
CREATE INDEX "property_inspections_leaseId_idx" ON "property_inspections"("leaseId");

ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_inspections" ADD CONSTRAINT "property_inspections_conductedById_fkey" FOREIGN KEY ("conductedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Centre de notifications
CREATE TYPE "StaffTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'CANCELLED');

CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "threadId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "messages_organizationId_createdAt_idx" ON "messages"("organizationId", "createdAt");
CREATE INDEX "messages_recipientId_readAt_idx" ON "messages"("recipientId", "readAt");
CREATE INDEX "messages_threadId_idx" ON "messages"("threadId");

ALTER TABLE "messages" ADD CONSTRAINT "messages_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "staff_tasks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "StaffTaskStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "staff_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "staff_tasks_organizationId_status_idx" ON "staff_tasks"("organizationId", "status");
CREATE INDEX "staff_tasks_assignedToId_idx" ON "staff_tasks"("assignedToId");

ALTER TABLE "staff_tasks" ADD CONSTRAINT "staff_tasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_tasks" ADD CONSTRAINT "staff_tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "staff_tasks" ADD CONSTRAINT "staff_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetUserId" TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reminders_organizationId_status_scheduledAt_idx" ON "reminders"("organizationId", "status", "scheduledAt");

ALTER TABLE "reminders" ADD CONSTRAINT "reminders_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
