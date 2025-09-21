# Data Model: Internal Asset & Subscription Management System

## Core Entities

### User
**Purpose**: Company employees with role-based access and team assignments
**Fields**:
- id: UUID (primary key)
- email: string (unique, required)
- firstName: string (required)
- lastName: string (required)
- role: enum (Employee, TeamLead, Admin)
- teamId: UUID (foreign key to Team)
- isActive: boolean (default: true)
- createdAt: timestamp
- updatedAt: timestamp

**Relationships**:
- belongsTo: Team (many-to-one)
- hasMany: Equipment (one-to-many via ownership)
- hasMany: Subscription (one-to-many via ownership)
- hasMany: Request (one-to-many as requester)
- hasMany: Request (one-to-many as approver)

**Validation Rules**:
- Email must be valid company domain
- Role changes require admin privileges
- Deactivation preserves all historical data

### Team
**Purpose**: Organizational units with lead assignments for equipment visibility
**Fields**:
- id: UUID (primary key)
- name: string (required, unique)
- leadId: UUID (foreign key to User)
- description: string (optional)
- createdAt: timestamp
- updatedAt: timestamp

**Relationships**:
- hasMany: User (one-to-many as members)
- belongsTo: User (many-to-one as lead)

**Validation Rules**:
- Team lead must have TeamLead or Admin role
- Team cannot be deleted if has active members

### Equipment
**Purpose**: Physical company assets with tracking and QR code management
**Fields**:
- id: UUID (primary key)
- serialNumber: string (unique, required)
- qrCode: string (unique, auto-generated)
- brand: string (required)
- model: string (required)
- type: enum (Laptop, Display, Phone, Tablet, Dongle, Keyboard, Mouse, Furniture)
- status: enum (Available, Assigned, Pending, Broken, Stolen)
- purchaseDate: date (required)
- classificationTag: enum (Profico, ZOPI, Leasing)
- currentOwnerId: UUID (foreign key to User, nullable)
- condition: enum (New, Good, Fair, Poor)
- notes: text (optional)
- createdAt: timestamp
- updatedAt: timestamp

**Relationships**:
- belongsTo: User (many-to-one as current owner)
- hasMany: Transfer (one-to-many for ownership history)
- hasMany: Request (one-to-many for pending requests)

**Validation Rules**:
- Serial number must be unique across all equipment
- QR code auto-generated on creation
- Status transitions must follow business rules
- Cannot delete equipment with active assignments

**State Transitions**:
- Available → Assigned (via transfer)
- Assigned → Available (via transfer)
- Any → Broken/Stolen (with required notes)
- Broken → Available (after repair with notes)

### Subscription
**Purpose**: Software licenses with billing and invoice management
**Fields**:
- id: UUID (primary key)
- name: string (required)
- price: decimal (required)
- billingFrequency: enum (Monthly, Yearly)
- paymentMethod: enum (CompanyCard, PersonalReimbursed)
- ownerId: UUID (foreign key to User)
- ownerEmail: string (for identification)
- renewalDate: date
- isActive: boolean (default: true)
- createdAt: timestamp
- updatedAt: timestamp

**Relationships**:
- belongsTo: User (many-to-one as owner)
- hasMany: Invoice (one-to-many for documentation)

**Validation Rules**:
- Owner email must match user email
- Price must be positive
- Renewal date must be future date for active subscriptions

### Request
**Purpose**: Equipment requests with two-tier approval workflow
**Fields**:
- id: UUID (primary key)
- requesterId: UUID (foreign key to User)
- equipmentType: enum (matches Equipment.type)
- justification: text (required)
- specifications: text (optional)
- status: enum (Submitted, TeamLeadReview, AdminReview, Approved, Rejected, Ordered, Fulfilled)
- teamLeadId: UUID (foreign key to User)
- teamLeadDecision: enum (Approved, Rejected, Pending)
- teamLeadNotes: text (optional)
- adminId: UUID (foreign key to User, nullable)
- adminDecision: enum (Approved, Rejected, Pending, nullable)
- adminNotes: text (optional)
- rejectionReason: text (conditional required)
- requestedAt: timestamp
- teamLeadReviewedAt: timestamp (nullable)
- adminReviewedAt: timestamp (nullable)
- fulfilledAt: timestamp (nullable)
- equipmentId: UUID (foreign key to Equipment, nullable - set when fulfilled)

**Relationships**:
- belongsTo: User (many-to-one as requester)
- belongsTo: User (many-to-one as team lead)
- belongsTo: User (many-to-one as admin)
- belongsTo: Equipment (many-to-one when fulfilled)

**Validation Rules**:
- Team lead must be requester's team lead
- Admin decision only after team lead approval
- Rejection requires reasoning
- Status transitions must follow workflow order

**State Transitions**:
- Submitted → TeamLeadReview (automatic)
- TeamLeadReview → AdminReview (if approved)
- TeamLeadReview → Rejected (if rejected)
- AdminReview → Approved/Rejected (with reasoning)
- Approved → Ordered → Fulfilled

### Transfer
**Purpose**: Equipment ownership changes with audit trail
**Fields**:
- id: UUID (primary key)
- equipmentId: UUID (foreign key to Equipment)
- fromUserId: UUID (foreign key to User, nullable for new equipment)
- toUserId: UUID (foreign key to User, nullable for return to pool)
- transferType: enum (Assignment, Return, Transfer, Decommission)
- reason: text (required)
- fromUserConfirmed: boolean (default: false)
- toUserConfirmed: boolean (default: false)
- adminConfirmed: boolean (default: false)
- transferredAt: timestamp (nullable - set when all confirmations complete)
- createdAt: timestamp

**Relationships**:
- belongsTo: Equipment (many-to-one)
- belongsTo: User (many-to-one as from user)
- belongsTo: User (many-to-one as to user)

**Validation Rules**:
- Both parties must confirm transfer (if applicable)
- Admin must confirm all transfers
- Cannot transfer equipment already in transfer process

### Invoice
**Purpose**: Financial documents for subscription tracking and compliance
**Fields**:
- id: UUID (primary key)
- subscriptionId: UUID (foreign key to Subscription)
- fileName: string (required)
- filePath: string (required - S3 key)
- uploadedById: UUID (foreign key to User)
- amount: decimal (extracted or manual)
- invoiceDate: date (extracted or manual)
- description: text (optional)
- isVerified: boolean (default: false)
- verifiedById: UUID (foreign key to User, nullable)
- uploadedAt: timestamp
- verifiedAt: timestamp (nullable)

**Relationships**:
- belongsTo: Subscription (many-to-one)
- belongsTo: User (many-to-one as uploader)
- belongsTo: User (many-to-one as verifier)

**Validation Rules**:
- File must be PDF format
- Amount must be positive if provided
- Invoice date must be reasonable (within 2 years)

### AuditLog
**Purpose**: Complete audit trail for all system changes
**Fields**:
- id: UUID (primary key)
- entityType: string (table name)
- entityId: UUID (record ID)
- action: enum (CREATE, UPDATE, DELETE)
- userId: UUID (foreign key to User)
- oldValues: jsonb (previous state)
- newValues: jsonb (new state)
- timestamp: timestamp

**Relationships**:
- belongsTo: User (many-to-one as actor)

**Validation Rules**:
- All changes must be logged
- Log entries are immutable
- Retention policy: 7 years for compliance

## Database Relationships Summary

```
User (1) ← (M) Equipment [currentOwnerId]
User (1) ← (M) Subscription [ownerId]
User (1) ← (M) Request [requesterId, teamLeadId, adminId]
User (1) ← (M) Transfer [fromUserId, toUserId]
User (1) ← (M) Invoice [uploadedById, verifiedById]
User (M) → (1) Team [teamId]

Equipment (1) ← (M) Transfer [equipmentId]
Equipment (1) ← (M) Request [equipmentId]

Subscription (1) ← (M) Invoice [subscriptionId]

Team (1) ← (M) User [teamId]
User (1) ← (1) Team [leadId]
```

## Indexes for Performance

**User**:
- email (unique)
- role, isActive (composite for role-based queries)

**Equipment**:
- serialNumber (unique)
- qrCode (unique)
- status, type (composite for filtering)
- currentOwnerId (foreign key)

**Request**:
- status, requesterId (composite for user requests)
- teamLeadId, status (composite for team lead queue)
- status (for admin queue)

**Transfer**:
- equipmentId, transferredAt (composite for equipment history)

**AuditLog**:
- entityType, entityId, timestamp (composite for entity history)
- userId, timestamp (composite for user actions)

## Data Constraints

- Referential integrity enforced via foreign keys
- Check constraints on enums and date ranges
- Unique constraints on business keys (email, serialNumber, qrCode)
- Not null constraints on required fields
- Audit triggers on all business tables