# Research: Internal Asset & Subscription Management System

## Technology Stack Decisions

### Backend Framework & Language
**Decision**: Node.js with NestJS
**Rationale**: TypeScript-first enterprise framework with built-in support for dependency injection, guards, and role-based access control. Proven scalability for 300+ concurrent users.
**Alternatives considered**: Django (Python), Spring Boot (Java)

### Frontend Framework
**Decision**: React 18 with TypeScript
**Rationale**: Largest ecosystem, React 18 concurrent rendering for QR scanning performance, excellent mobile responsiveness, strong component libraries.
**Alternatives considered**: Vue.js (superior QR libraries), Angular (enterprise structure)

### Database Solution
**Decision**: PostgreSQL with MongoDB for audit logs
**Rationale**: PostgreSQL for ACID compliance, row-level security, and JSONB flexibility. MongoDB for audit trails and real-time change tracking.
**Alternatives considered**: Pure PostgreSQL, MySQL with separate audit system

### QR Code Library
**Decision**: html5-qrcode
**Rationale**: Cross-platform compatibility, <2 seconds performance requirement, camera and file upload support, flash/torch support for mobile.
**Alternatives considered**: qr-scanner (Nimiq) for higher performance scenarios

### Testing Framework
**Decision**: Vitest + Playwright + React Testing Library
**Rationale**: Fast unit testing with Vitest, cross-browser E2E with Playwright, comprehensive component testing coverage.
**Alternatives considered**: Jest + Cypress combination

### File Storage
**Decision**: AWS S3 with CloudFront CDN
**Rationale**: Enterprise security, lifecycle management for invoices, compliance certifications, cost-effective scaling.
**Alternatives considered**: Azure Blob Storage

### Email Service
**Decision**: Amazon SES with SendGrid backup
**Rationale**: Cost-effective primary service ($0.10/1000 emails), enterprise-grade backup for critical notifications.
**Alternatives considered**: Pure SendGrid, Mailgun

### Authentication
**Decision**: Auth0 for role-based access control
**Rationale**: Enterprise-grade RBAC, JWT tokens, potential SSO integration.
**Alternatives considered**: AWS Cognito, custom authentication

## Architecture Summary

**Project Structure**: Web application (frontend + backend)
- Backend: NestJS API with PostgreSQL
- Frontend: React SPA with mobile-responsive QR scanning
- Storage: AWS S3 for invoices, PostgreSQL for entities
- Auth: Auth0 with JWT tokens
- Testing: Multi-framework approach for comprehensive coverage

**Performance**:
- QR scanning: <2 seconds with html5-qrcode optimization
- Concurrent users: 300+ supported with NestJS scalability
- File uploads: CDN-backed for responsive invoice management

**Compliance**:
- Audit logging: MongoDB change streams
- Data security: PostgreSQL row-level security
- File encryption: AWS S3 encryption at rest and transit

All NEEDS CLARIFICATION items resolved with enterprise-grade solutions suitable for internal business application with growth potential.