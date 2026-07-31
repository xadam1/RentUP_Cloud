CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

START TRANSACTION;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260731071815_InitialCreate') THEN
    CREATE TABLE "AumSnapshots" (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "Date" timestamp with time zone NOT NULL,
        "TotalAum" numeric(18,2) NOT NULL,
        "TotalMonthlyDeposit" numeric(18,2) NOT NULL,
        "PointsPerYear" numeric(18,6) NOT NULL,
        CONSTRAINT "PK_AumSnapshots" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260731071815_InitialCreate') THEN
    CREATE TABLE "Deals" (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "ClientName" character varying(200) NOT NULL,
        "Date" timestamp with time zone NOT NULL,
        "Category" integer NOT NULL,
        "Company" integer NOT NULL,
        "ProductName" character varying(200) NOT NULL,
        "DepositAmount" numeric(18,2) NOT NULL,
        "CalculatedPoints" numeric(18,6) NOT NULL,
        "EstimatedCommission" numeric(18,2) NOT NULL,
        "Status" integer NOT NULL,
        "Note" character varying(1000) NOT NULL,
        CONSTRAINT "PK_Deals" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260731071815_InitialCreate') THEN
    CREATE TABLE "Products" (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "Name" character varying(200) NOT NULL,
        "Category" integer NOT NULL,
        "Company" integer NOT NULL,
        "ColorHex" character varying(9) NOT NULL,
        "AverageYield" numeric(18,6) NOT NULL,
        "MonthlyDeposit" numeric(18,2) NOT NULL,
        "CommissionFormula" character varying(500) NOT NULL,
        "Order" integer NOT NULL,
        "IsActive" boolean NOT NULL,
        CONSTRAINT "PK_Products" PRIMARY KEY ("Id")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260731071815_InitialCreate') THEN
    CREATE TABLE "UserSettings" (
        "UserId" text NOT NULL,
        "BasePointValue" numeric(18,4) NOT NULL,
        "MonthlyGoalPoints" numeric(18,4) NOT NULL,
        "Theme" character varying(20) NOT NULL,
        CONSTRAINT "PK_UserSettings" PRIMARY KEY ("UserId")
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260731071815_InitialCreate') THEN
    CREATE TABLE "ProductSnapshots" (
        "Id" uuid NOT NULL,
        "UserId" text NOT NULL,
        "ProductId" uuid NOT NULL,
        "Date" timestamp with time zone NOT NULL,
        "Aum" numeric(18,2) NOT NULL,
        "MonthlyDeposit" numeric(18,2) NOT NULL,
        CONSTRAINT "PK_ProductSnapshots" PRIMARY KEY ("Id"),
        CONSTRAINT "FK_ProductSnapshots_Products_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products" ("Id") ON DELETE CASCADE
    );
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260731071815_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_AumSnapshots_UserId_Date" ON "AumSnapshots" ("UserId", "Date");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260731071815_InitialCreate') THEN
    CREATE INDEX "IX_Deals_UserId_Date" ON "Deals" ("UserId", "Date");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260731071815_InitialCreate') THEN
    CREATE INDEX "IX_Products_UserId_Name" ON "Products" ("UserId", "Name");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260731071815_InitialCreate') THEN
    CREATE UNIQUE INDEX "IX_ProductSnapshots_ProductId_Date" ON "ProductSnapshots" ("ProductId", "Date");
    END IF;
END $EF$;

DO $EF$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM "__EFMigrationsHistory" WHERE "MigrationId" = '20260731071815_InitialCreate') THEN
    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
    VALUES ('20260731071815_InitialCreate', '10.0.10');
    END IF;
END $EF$;
COMMIT;

