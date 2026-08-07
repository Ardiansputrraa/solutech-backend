-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "master";

-- CreateEnum
CREATE TYPE "master"."RoleName" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "master"."roles" (
    "id" TEXT NOT NULL,
    "name" "master"."RoleName" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "master"."api_clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "master"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "master"."users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "master"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "api_clients_clientKey_key" ON "master"."api_clients"("clientKey");

-- AddForeignKey
ALTER TABLE "master"."users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "master"."roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
