-- CreateTable
CREATE TABLE "MagicLinkRateLimit" (
    "identifier" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MagicLinkRateLimit_pkey" PRIMARY KEY ("identifier")
);
