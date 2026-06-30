-- Migration: add_saas_subscription
-- Exécution : npx prisma migrate dev --name add_saas_subscription

CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED');
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');

CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "gracePeriodEndsAt" TIMESTAMP(3),
    "customerId" TEXT,
    "externalSubscriptionId" TEXT,
    "paymentProvider" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "organizations" ADD COLUMN "subscriptionId" TEXT,
ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "plan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
ADD COLUMN "subscriptionExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "organizations_subscriptionId_key" ON "organizations"("subscriptionId");
CREATE INDEX "organizations_subscriptionStatus_idx" ON "organizations"("subscriptionStatus");
CREATE INDEX "organizations_plan_idx" ON "organizations"("plan");

CREATE INDEX "subscriptions_organizationId_idx" ON "subscriptions"("organizationId");
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");
CREATE INDEX "subscriptions_expiresAt_idx" ON "subscriptions"("expiresAt");

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organizations" ADD CONSTRAINT "organizations_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
