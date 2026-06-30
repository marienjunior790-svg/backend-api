-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PAYMENT_DUE_SOON', 'PAYMENT_LATE', 'PAYMENT_DUNNING', 'PAYMENT_OWNER_ALERT', 'PAYMENT_RECEIVED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RentFollowUpType" AS ENUM ('DUE_SOON', 'DUNNING_L1', 'DUNNING_L2', 'DUNNING_L3', 'OWNER_ALERT');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rent_follow_up_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" "RentFollowUpType" NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_follow_up_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_organizationId_createdAt_idx" ON "notifications"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "rent_follow_up_logs_organizationId_idx" ON "rent_follow_up_logs"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "rent_follow_up_logs_paymentId_type_key" ON "rent_follow_up_logs"("paymentId", "type");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_follow_up_logs" ADD CONSTRAINT "rent_follow_up_logs_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
