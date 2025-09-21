# Internal Asset & Subscription Management System

A comprehensive web application for managing company equipment, software subscriptions, and request workflows with role-based access control.

## 🚀 Features

- **Equipment Management**: Track company assets with QR code scanning
- **Subscription Tracking**: Manage software licenses and invoices
- **Request Workflow**: Two-tier approval process for equipment requests
- **Mobile-Responsive**: QR scanning optimized for mobile devices
- **Role-Based Access**: Employee, Team Lead, and Admin permissions
- **Audit Trail**: Complete change history for compliance
- **Real-time Notifications**: Email alerts for workflow updates

## 🏗️ Architecture

### Backend (NestJS + TypeScript)
- RESTful API with OpenAPI documentation
- PostgreSQL for relational data
- MongoDB for audit logs
- Auth0 JWT authentication
- AWS S3 for file storage
- Email notifications via SES

### Frontend (React 18 + TypeScript)
- Single Page Application with React Router
- Auth0 authentication integration
- Mobile-responsive QR code scanning
- Tailwind CSS for styling
- Axios for API communication

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+
- MongoDB 6+
- Auth0 account
- AWS account (for S3 and SES)

## 🛠️ Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd internal-project
```

### 2. Backend Setup
```bash
cd backend/backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run build
```

### 3. Frontend Setup
```bash
cd frontend/frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run build
```

### 4. Database Setup
```bash
# Start PostgreSQL and MongoDB
# Run migrations
npm run migration:run
```

## 🚢 Deployment

### Development
```bash
# Start backend
cd backend/backend
npm run start:dev

# Start frontend
cd frontend/frontend
npm run dev
```

### Production (Docker)
```bash
docker-compose up -d
```

### Environment Configuration

#### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=asset_management

# Auth0
AUTH0_DOMAIN=https://your-tenant.auth0.com
AUTH0_AUDIENCE=https://your-api-identifier

# AWS
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=asset-management-invoices
```

#### Frontend (.env)
```env
# Auth0
VITE_AUTH0_DOMAIN=https://your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://your-api-identifier

# API
VITE_API_BASE_URL=http://localhost:3001/api
```

## 📱 Usage

### 1. Equipment Management
- View assigned equipment
- Scan QR codes for quick access
- Update equipment condition
- Transfer equipment between users

### 2. Request Workflow
- Submit equipment requests with justification
- Team lead approval process
- Admin final approval
- Automatic equipment assignment

### 3. Subscription Management
- Track software licenses
- Upload invoices to S3
- Set renewal reminders
- Export data for accounting

### 4. Admin Functions
- User and team management
- Equipment registration
- Audit reports
- System configuration

## 🧪 Testing

### Run Backend Tests
```bash
cd backend/backend
npm run test
npm run test:e2e
```

### Run Frontend Tests
```bash
cd frontend/frontend
npm run test
```

### Validate All Scenarios
```bash
./scripts/validate-quickstart.sh
```

## 📊 Performance Targets

- **QR Scanning**: < 2 seconds
- **API Response**: < 500ms for standard queries
- **Concurrent Users**: 300+ supported
- **Page Load**: < 3 seconds

## 🔒 Security

- JWT token authentication via Auth0
- Role-based access control (RBAC)
- HTTPS in production
- Input validation and sanitization
- SQL injection prevention
- File upload security

## 📚 API Documentation

- **Swagger UI**: `http://localhost:3001/api/docs`
- **OpenAPI Spec**: Available at `/api/docs-json`

## 🗂️ Project Structure

```
├── backend/
│   └── backend/          # NestJS API
│       ├── src/
│       │   ├── auth/     # Authentication & authorization
│       │   ├── models/   # Database entities
│       │   ├── services/ # Business logic
│       │   ├── controllers/ # API endpoints
│       │   └── utils/    # Utility functions
│       └── tests/        # API tests
├── frontend/
│   └── frontend/         # React SPA
│       ├── src/
│       │   ├── components/ # Reusable components
│       │   ├── pages/    # Page components
│       │   ├── providers/ # Context providers
│       │   └── utils/    # Helper functions
│       └── tests/        # Frontend tests
├── scripts/              # Deployment scripts
└── docker-compose.yml    # Container orchestration
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

Internal use only - Company confidential

## 🆘 Support

For technical support or questions:
- Check the [API documentation](http://localhost:3001/api/docs)
- Review the validation script output
- Contact the development team