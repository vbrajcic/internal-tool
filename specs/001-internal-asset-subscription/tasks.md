# Tasks: Internal Asset & Subscription Management System

**Input**: Design documents from `/specs/001-internal-asset-subscription/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Phase 3.1: Setup
- [x] T001 Create project structure with backend and frontend directories following plan.md structure
- [x] T002 Initialize NestJS backend project with TypeScript, ESLint, and Prettier configuration
- [x] T003 [P] Initialize React 18 frontend project with TypeScript and Vite configuration
- [x] T004 [P] Configure PostgreSQL database connection and create initial schema
- [x] T005 [P] Configure MongoDB connection for audit logging with change streams
- [x] T006 [P] Set up AWS S3 bucket and CloudFront CDN for invoice file storage
- [x] T007 [P] Configure Auth0 authentication with role-based access control setup

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Endpoints)
- [x] T008 [P] Contract test GET/POST /api/users in backend/tests/contract/test_users_api.spec.ts
- [x] T009 [P] Contract test PUT /api/users/{id} and POST /api/users/{id}/deactivate in backend/tests/contract/test_users_crud.spec.ts
- [x] T010 [P] Contract test GET/POST /api/teams and GET/PUT /api/teams/{id} in backend/tests/contract/test_teams_api.spec.ts
- [x] T011 [P] Contract test GET/POST /api/equipment in backend/tests/contract/test_equipment_api.spec.ts
- [x] T012 [P] Contract test PUT /api/equipment/{id} and POST /api/equipment/{id}/transfer in backend/tests/contract/test_equipment_crud.spec.ts
- [x] T013 [P] Contract test GET /api/equipment/qr/{qrCode} in backend/tests/contract/test_equipment_qr.spec.ts
- [x] T014 [P] Contract test GET/POST /api/subscriptions in backend/tests/contract/test_subscriptions_api.spec.ts
- [x] T015 [P] Contract test PUT /api/subscriptions/{id} and GET/POST /api/subscriptions/{id}/invoices in backend/tests/contract/test_subscriptions_crud.spec.ts
- [x] T016 [P] Contract test GET /api/subscriptions/export in backend/tests/contract/test_subscriptions_export.spec.ts
- [x] T017 [P] Contract test GET/POST /api/requests in backend/tests/contract/test_requests_api.spec.ts
- [x] T018 [P] Contract test PUT /api/requests/{id} in backend/tests/contract/test_requests_crud.spec.ts
- [x] T019 [P] Contract test POST /api/requests/{id}/team-lead-review in backend/tests/contract/test_requests_teamlead.spec.ts
- [x] T020 [P] Contract test POST /api/requests/{id}/admin-review in backend/tests/contract/test_requests_admin.spec.ts
- [x] T021 [P] Contract test POST /api/requests/{id}/fulfill in backend/tests/contract/test_requests_fulfill.spec.ts

### Integration Tests (User Scenarios)
- [x] T022 [P] Integration test equipment assignment and viewing in backend/tests/integration/test_equipment_assignment.spec.ts
- [x] T023 [P] Integration test equipment request and approval workflow in backend/tests/integration/test_request_workflow.spec.ts
- [x] T024 [P] Integration test subscription management and invoice tracking in backend/tests/integration/test_subscription_management.spec.ts
- [x] T025 [P] Integration test QR code scanning and mobile interface in frontend/tests/integration/test_qr_scanning.spec.ts
- [x] T026 [P] Integration test role-based access control validation in backend/tests/integration/test_rbac_validation.spec.ts
- [x] T027 [P] Integration test audit and compliance reporting in backend/tests/integration/test_audit_compliance.spec.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Database Models
- [x] T028 [P] User entity model in backend/src/models/user.entity.ts
- [x] T029 [P] Team entity model in backend/src/models/team.entity.ts
- [x] T030 [P] Equipment entity model in backend/src/models/equipment.entity.ts
- [x] T031 [P] Subscription entity model in backend/src/models/subscription.entity.ts
- [x] T032 [P] Request entity model in backend/src/models/request.entity.ts
- [x] T033 [P] Transfer entity model in backend/src/models/transfer.entity.ts
- [x] T034 [P] Invoice entity model in backend/src/models/invoice.entity.ts
- [x] T035 [P] AuditLog entity model in backend/src/models/audit-log.entity.ts

### Business Services
- [x] T036 UserService CRUD operations in backend/src/services/user.service.ts
- [x] T037 TeamService with lead assignment logic in backend/src/services/team.service.ts
- [x] T038 EquipmentService with QR code generation in backend/src/services/equipment.service.ts
- [x] T039 SubscriptionService with invoice management in backend/src/services/subscription.service.ts
- [x] T040 RequestService with approval workflow logic in backend/src/services/request.service.ts
- [x] T041 TransferService with confirmation tracking in backend/src/services/transfer.service.ts
- [x] T042 InvoiceService with file upload to S3 in backend/src/services/invoice.service.ts
- [x] T043 AuditService with change stream logging in backend/src/services/audit.service.ts

### API Controllers
- [x] T044 UsersController with all user and team endpoints in backend/src/controllers/users.controller.ts
- [x] T045 EquipmentController with QR scanning endpoints in backend/src/controllers/equipment.controller.ts
- [x] T046 SubscriptionsController with export functionality in backend/src/controllers/subscriptions.controller.ts
- [x] T047 RequestsController with approval workflow endpoints in backend/src/controllers/requests.controller.ts

### Authentication & Authorization
- [x] T048 Auth0 JWT strategy implementation in backend/src/auth/jwt.strategy.ts
- [x] T049 Role-based guards (Employee, TeamLead, Admin) in backend/src/auth/roles.guard.ts
- [x] T050 Team-based access control middleware in backend/src/auth/team-access.guard.ts

## Phase 3.4: Frontend Implementation

### Core Components
- [x] T051 [P] Authentication provider with Auth0 integration in frontend/src/providers/AuthProvider.tsx
- [x] T052 [P] QR code scanner component with html5-qrcode in frontend/src/components/QRScanner.tsx
- [x] T053 [P] Equipment list and detail components in frontend/src/components/Equipment/
- [x] T054 [P] Subscription management components in frontend/src/components/Subscriptions/
- [x] T055 [P] Request submission and approval components in frontend/src/components/Requests/
- [x] T056 [P] User and team management components in frontend/src/components/Users/

### Pages and Routing
- [x] T057 Main dashboard with role-based navigation in frontend/src/pages/Dashboard.tsx
- [x] T058 Equipment pages (list, detail, transfer) in frontend/src/pages/Equipment/
- [x] T059 Subscription pages (list, detail, invoices) in frontend/src/pages/Subscriptions/
- [x] T060 Request pages (submit, review, approve) in frontend/src/pages/Requests/
- [x] T061 Admin pages (users, teams, reports) in frontend/src/pages/Admin/

### Mobile-Responsive Features
- [x] T062 Mobile-optimized QR scanning interface in frontend/src/components/Mobile/QRScanPage.tsx
- [x] T063 Touch-friendly equipment condition reporting in frontend/src/components/Mobile/ConditionReport.tsx
- [x] T064 Responsive navigation and layout components in frontend/src/components/Layout/

## Phase 3.5: Integration & Middleware

### Database Integration
- [x] T065 TypeORM configuration with PostgreSQL connection pool in backend/src/database/database.module.ts
- [x] T066 MongoDB audit log connection and change streams in backend/src/audit/audit.module.ts
- [x] T067 Database migrations for all entity schemas in backend/src/migrations/

### External Service Integration
- [x] T068 AWS S3 service for invoice file storage in backend/src/storage/s3.service.ts
- [x] T069 Email notification service with templates in backend/src/notifications/email.service.ts
- [x] T070 QR code generation service in backend/src/utils/qr-code.service.ts

### Middleware & Logging
- [x] T071 Request/response logging middleware in backend/src/middleware/logging.middleware.ts
- [x] T072 Error handling and validation pipes in backend/src/pipes/validation.pipe.ts
- [x] T073 CORS and security headers configuration in backend/src/main.ts

## Phase 3.6: Polish & Performance

### Unit Tests
- [x] T074 [P] Unit tests for UserService business logic in backend/tests/unit/user.service.spec.ts
- [x] T075 [P] Unit tests for EquipmentService QR generation in backend/tests/unit/equipment.service.spec.ts
- [x] T076 [P] Unit tests for RequestService approval workflow in backend/tests/unit/request.service.spec.ts
- [x] T077 [P] Unit tests for React components in frontend/tests/unit/components/
- [x] T078 [P] Unit tests for QR scanning functionality in frontend/tests/unit/qr-scanner.spec.ts

### Performance & Documentation
- [x] T079 Performance optimization for QR scanning (<2 seconds) in frontend/src/components/QRScanner.tsx
- [x] T080 Database query optimization and indexing in backend/src/models/
- [x] T081 [P] API documentation with Swagger/OpenAPI in backend/src/docs/
- [x] T082 [P] Frontend component documentation with Storybook in frontend/src/stories/
- [x] T083 Load testing configuration for 300 concurrent users in tests/performance/

### Deployment & Final Integration
- [x] T084 Docker containerization for backend and frontend in docker-compose.yml
- [x] T085 Environment configuration for development, staging, production in .env files
- [x] T086 Run all quickstart scenarios and validate success criteria in scripts/validate-quickstart.sh

## Dependencies

**Setup Dependencies**:
- T001 → T002, T003
- T002 → T004, T005, T006, T007
- T003 → T051, T052

**Test Dependencies**:
- T004, T005 → T008-T027 (database required for tests)
- T007 → T008-T021 (Auth0 config required for API tests)

**Implementation Dependencies**:
- T008-T027 → T028-T035 (tests before models)
- T028-T035 → T036-T043 (models before services)
- T036-T043 → T044-T047 (services before controllers)
- T048-T050 → T044-T047 (auth required for controllers)
- T044-T047 → T051-T064 (API before frontend)

**Integration Dependencies**:
- T065, T066 → T036-T043 (database modules before services)
- T068, T069, T070 → T042, T047 (external services before dependent features)

## Parallel Example

```bash
# Launch T008-T021 together (Contract tests for all APIs):
Task: "Contract test GET/POST /api/users in backend/tests/contract/test_users_api.spec.ts"
Task: "Contract test GET/POST /api/equipment in backend/tests/contract/test_equipment_api.spec.ts"
Task: "Contract test GET/POST /api/subscriptions in backend/tests/contract/test_subscriptions_api.spec.ts"
Task: "Contract test GET/POST /api/requests in backend/tests/contract/test_requests_api.spec.ts"

# Launch T028-T035 together (All entity models):
Task: "User entity model in backend/src/models/user.entity.ts"
Task: "Team entity model in backend/src/models/team.entity.ts"
Task: "Equipment entity model in backend/src/models/equipment.entity.ts"
Task: "Subscription entity model in backend/src/models/subscription.entity.ts"

# Launch T051-T056 together (Frontend components):
Task: "Authentication provider with Auth0 integration in frontend/src/providers/AuthProvider.tsx"
Task: "QR code scanner component with html5-qrcode in frontend/src/components/QRScanner.tsx"
Task: "Equipment list and detail components in frontend/src/components/Equipment/"
Task: "Subscription management components in frontend/src/components/Subscriptions/"
```

## Notes

- [P] tasks = different files, no dependencies
- Verify all contract tests fail before implementing
- Commit after each major task completion
- Follow TDD: Red → Green → Refactor cycle
- Mobile QR scanning must achieve <2 second performance requirement
- All role-based access controls must be tested thoroughly

## Task Generation Rules Applied

1. **From Contracts**: 4 API files × 3-6 endpoints each = 14 contract test tasks [P]
2. **From Data Model**: 8 entities = 8 model creation tasks [P]
3. **From Quickstart**: 6 scenarios = 6 integration test tasks [P]
4. **Implementation**: Services → Controllers → Frontend following dependency order
5. **Parallel Marking**: Independent files marked [P], shared files sequential

## Validation Checklist

- [x] All contracts have corresponding tests (T008-T021)
- [x] All entities have model tasks (T028-T035)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks truly independent ([P] marked correctly)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD workflow enforced throughout