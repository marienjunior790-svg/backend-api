-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MaintenanceTicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MaintenanceEventType" AS ENUM ('CREATED', 'PRIORITY_SET', 'ASSIGNED', 'STATUS_CHANGED', 'NOTE_ADDED', 'CLOSED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'MAINTENANCE_COMPLETED';

-- CreateTable
CREATE TABLE "maintenance_tickets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "apartmentId" TEXT NOT NULL,
    "tenantId" TEXT,
    "leaseId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceTicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "assignedToName" TEXT,
    "reportedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_ticket_events" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "MaintenanceEventType" NOT NULL,
    "message" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_ticket_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_tickets_organizationId_status_idx" ON "maintenance_tickets"("organizationId", "status");

-- CreateIndex
CREATE INDEX "maintenance_tickets_organizationId_createdAt_idx" ON "maintenance_tickets"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "maintenance_tickets_apartmentId_idx" ON "maintenance_tickets"("apartmentId");

-- CreateIndex
CREATE INDEX "maintenance_ticket_events_ticketId_createdAt_idx" ON "maintenance_ticket_events"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "maintenance_ticket_events_organizationId_idx" ON "maintenance_ticket_events"("organizationId");

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "leases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_ticket_events" ADD CONSTRAINT "maintenance_ticket_events_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "maintenance_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
