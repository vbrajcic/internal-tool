"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialSchema1696000000000 = void 0;
class InitialSchema1696000000000 {
    constructor() {
        this.name = 'InitialSchema1696000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text,
        "leadId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_teams_name" UNIQUE ("name"),
        CONSTRAINT "PK_teams" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "firstName" character varying NOT NULL,
        "lastName" character varying NOT NULL,
        "role" character varying NOT NULL DEFAULT 'Employee',
        "teamId" uuid,
        "isActive" boolean NOT NULL DEFAULT true,
        "authId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_authId" UNIQUE ("authId"),
        CONSTRAINT "CHK_users_role" CHECK ("role" IN ('Employee', 'TeamLead', 'Admin')),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE TABLE "equipment" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "serialNumber" character varying NOT NULL,
        "qrCode" character varying NOT NULL,
        "brand" character varying NOT NULL,
        "model" character varying NOT NULL,
        "type" character varying NOT NULL,
        "status" character varying NOT NULL DEFAULT 'Available',
        "purchaseDate" date NOT NULL,
        "classificationTag" character varying NOT NULL,
        "currentOwnerId" uuid,
        "condition" character varying NOT NULL DEFAULT 'Good',
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_equipment_serialNumber" UNIQUE ("serialNumber"),
        CONSTRAINT "UQ_equipment_qrCode" UNIQUE ("qrCode"),
        CONSTRAINT "CHK_equipment_type" CHECK ("type" IN ('Laptop', 'Display', 'Phone', 'Tablet', 'Dongle', 'Keyboard', 'Mouse', 'Furniture')),
        CONSTRAINT "CHK_equipment_status" CHECK ("status" IN ('Available', 'Assigned', 'Pending', 'Broken', 'Stolen')),
        CONSTRAINT "CHK_equipment_condition" CHECK ("condition" IN ('New', 'Good', 'Fair', 'Poor')),
        CONSTRAINT "CHK_equipment_classification" CHECK ("classificationTag" IN ('Profico', 'ZOPI', 'Leasing')),
        CONSTRAINT "PK_equipment" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "price" decimal(10,2) NOT NULL,
        "billingFrequency" character varying NOT NULL,
        "paymentMethod" character varying NOT NULL,
        "ownerId" uuid NOT NULL,
        "ownerEmail" character varying NOT NULL,
        "renewalDate" date,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_subscriptions_billingFrequency" CHECK ("billingFrequency" IN ('Monthly', 'Yearly')),
        CONSTRAINT "CHK_subscriptions_paymentMethod" CHECK ("paymentMethod" IN ('CompanyCard', 'PersonalReimbursed')),
        CONSTRAINT "CHK_subscriptions_price" CHECK ("price" > 0),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE TABLE "requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "requesterId" uuid NOT NULL,
        "equipmentType" character varying NOT NULL,
        "justification" text NOT NULL,
        "specifications" text,
        "status" character varying NOT NULL DEFAULT 'Submitted',
        "teamLeadId" uuid,
        "teamLeadDecision" character varying DEFAULT 'Pending',
        "teamLeadNotes" text,
        "adminId" uuid,
        "adminDecision" character varying DEFAULT 'Pending',
        "adminNotes" text,
        "rejectionReason" text,
        "requestedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "teamLeadReviewedAt" TIMESTAMP,
        "adminReviewedAt" TIMESTAMP,
        "fulfilledAt" TIMESTAMP,
        "equipmentId" uuid,
        CONSTRAINT "CHK_requests_equipmentType" CHECK ("equipmentType" IN ('Laptop', 'Display', 'Phone', 'Tablet', 'Dongle', 'Keyboard', 'Mouse', 'Furniture')),
        CONSTRAINT "CHK_requests_status" CHECK ("status" IN ('Submitted', 'TeamLeadReview', 'AdminReview', 'Approved', 'Rejected', 'Ordered', 'Fulfilled')),
        CONSTRAINT "CHK_requests_teamLeadDecision" CHECK ("teamLeadDecision" IN ('Approved', 'Rejected', 'Pending')),
        CONSTRAINT "CHK_requests_adminDecision" CHECK ("adminDecision" IN ('Approved', 'Rejected', 'Pending')),
        CONSTRAINT "PK_requests" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE TABLE "transfers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "equipmentId" uuid NOT NULL,
        "fromUserId" uuid,
        "toUserId" uuid,
        "transferType" character varying NOT NULL,
        "reason" text NOT NULL,
        "fromUserConfirmed" boolean NOT NULL DEFAULT false,
        "toUserConfirmed" boolean NOT NULL DEFAULT false,
        "adminConfirmed" boolean NOT NULL DEFAULT false,
        "transferredAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_transfers_transferType" CHECK ("transferType" IN ('Assignment', 'Return', 'Transfer', 'Decommission')),
        CONSTRAINT "PK_transfers" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subscriptionId" uuid NOT NULL,
        "fileName" character varying NOT NULL,
        "filePath" character varying NOT NULL,
        "uploadedById" uuid NOT NULL,
        "amount" decimal(10,2),
        "invoiceDate" date,
        "description" text,
        "isVerified" boolean NOT NULL DEFAULT false,
        "verifiedById" uuid,
        "uploadedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "verifiedAt" TIMESTAMP,
        CONSTRAINT "CHK_invoices_amount" CHECK ("amount" IS NULL OR "amount" > 0),
        CONSTRAINT "PK_invoices" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      ALTER TABLE "teams" ADD CONSTRAINT "FK_teams_leadId"
      FOREIGN KEY ("leadId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
        await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "FK_users_teamId"
      FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL
    `);
        await queryRunner.query(`
      ALTER TABLE "equipment" ADD CONSTRAINT "FK_equipment_currentOwnerId"
      FOREIGN KEY ("currentOwnerId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
        await queryRunner.query(`
      ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_subscriptions_ownerId"
      FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
        await queryRunner.query(`
      ALTER TABLE "requests" ADD CONSTRAINT "FK_requests_requesterId"
      FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
        await queryRunner.query(`
      ALTER TABLE "requests" ADD CONSTRAINT "FK_requests_teamLeadId"
      FOREIGN KEY ("teamLeadId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
        await queryRunner.query(`
      ALTER TABLE "requests" ADD CONSTRAINT "FK_requests_adminId"
      FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
        await queryRunner.query(`
      ALTER TABLE "requests" ADD CONSTRAINT "FK_requests_equipmentId"
      FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE SET NULL
    `);
        await queryRunner.query(`
      ALTER TABLE "transfers" ADD CONSTRAINT "FK_transfers_equipmentId"
      FOREIGN KEY ("equipmentId") REFERENCES "equipment"("id") ON DELETE CASCADE
    `);
        await queryRunner.query(`
      ALTER TABLE "transfers" ADD CONSTRAINT "FK_transfers_fromUserId"
      FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
        await queryRunner.query(`
      ALTER TABLE "transfers" ADD CONSTRAINT "FK_transfers_toUserId"
      FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE SET NULL
    `);
        await queryRunner.query(`
      ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_subscriptionId"
      FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE
    `);
        await queryRunner.query(`
      ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_uploadedById"
      FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE
    `);
        await queryRunner.query(`
      ALTER TABLE "invoices" ADD CONSTRAINT "FK_invoices_verifiedById"
      FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL
    `);
        await queryRunner.query(`CREATE INDEX "IDX_users_email" ON "users" ("email")`);
        await queryRunner.query(`CREATE INDEX "IDX_users_role_isActive" ON "users" ("role", "isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_equipment_serialNumber" ON "equipment" ("serialNumber")`);
        await queryRunner.query(`CREATE INDEX "IDX_equipment_qrCode" ON "equipment" ("qrCode")`);
        await queryRunner.query(`CREATE INDEX "IDX_equipment_status_type" ON "equipment" ("status", "type")`);
        await queryRunner.query(`CREATE INDEX "IDX_equipment_currentOwnerId" ON "equipment" ("currentOwnerId")`);
        await queryRunner.query(`CREATE INDEX "IDX_requests_status_requesterId" ON "requests" ("status", "requesterId")`);
        await queryRunner.query(`CREATE INDEX "IDX_requests_teamLeadId_status" ON "requests" ("teamLeadId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_requests_status" ON "requests" ("status")`);
        await queryRunner.query(`CREATE INDEX "IDX_transfers_equipmentId_transferredAt" ON "transfers" ("equipmentId", "transferredAt")`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`DROP TABLE "transfers"`);
        await queryRunner.query(`DROP TABLE "requests"`);
        await queryRunner.query(`DROP TABLE "subscriptions"`);
        await queryRunner.query(`DROP TABLE "equipment"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "teams"`);
    }
}
exports.InitialSchema1696000000000 = InitialSchema1696000000000;
//# sourceMappingURL=001_initial_schema.js.map