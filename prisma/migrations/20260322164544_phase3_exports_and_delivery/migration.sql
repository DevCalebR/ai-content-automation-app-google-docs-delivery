-- CreateEnum
CREATE TYPE "RunDeliveryProvider" AS ENUM ('GOOGLE_DOCS');

-- CreateEnum
CREATE TYPE "RunDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UsageEventType" ADD VALUE 'RUN_DELIVERED';
ALTER TYPE "UsageEventType" ADD VALUE 'RUN_DELIVERY_FAILED';
ALTER TYPE "UsageEventType" ADD VALUE 'RUN_EXPORT_DOWNLOADED';

-- CreateTable
CREATE TABLE "RunDelivery" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "initiatedById" TEXT NOT NULL,
    "provider" "RunDeliveryProvider" NOT NULL,
    "status" "RunDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RunDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RunDelivery_workspaceId_provider_createdAt_idx" ON "RunDelivery"("workspaceId", "provider", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "RunDelivery_runId_provider_key" ON "RunDelivery"("runId", "provider");

-- AddForeignKey
ALTER TABLE "RunDelivery" ADD CONSTRAINT "RunDelivery_runId_fkey" FOREIGN KEY ("runId") REFERENCES "GenerationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunDelivery" ADD CONSTRAINT "RunDelivery_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunDelivery" ADD CONSTRAINT "RunDelivery_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
