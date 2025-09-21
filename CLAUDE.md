# internal-project Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-09-20

## Active Technologies
- Node.js 18+ with NestJS (TypeScript) (001-internal-asset-subscription)
- React 18 with TypeScript frontend (001-internal-asset-subscription)
- PostgreSQL with MongoDB for audit logs (001-internal-asset-subscription)
- html5-qrcode for QR scanning (001-internal-asset-subscription)
- Auth0 for authentication (001-internal-asset-subscription)
- AWS S3 for file storage (001-internal-asset-subscription)

## Project Structure
```
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/
```

## Commands
# NestJS Development
npm run start:dev
npm run test
npm run test:e2e

# React Development
npm run dev
npm run build
npm run preview

## Code Style
TypeScript: Follow standard conventions with strict mode
Testing: Vitest (unit), Playwright (E2E), React Testing Library (components)
API: OpenAPI/Swagger documentation required

## Recent Changes
- 001-internal-asset-subscription: Added comprehensive asset management system with NestJS backend + React frontend

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->