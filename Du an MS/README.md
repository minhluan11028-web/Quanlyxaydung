# Task Management Monorepo

Production-ready Task/Project Management web application built with modern technologies.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose

### Setup Instructions

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Setup environment variables**
   ```bash
   # Copy example env files
   cp apps/web/.env.example apps/web/.env
   cp apps/api/.env.example apps/api/.env
   ```

3. **Start database**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations and seed data**
   ```bash
   pnpm --filter api prisma migrate dev
   pnpm --filter api db:seed
   ```

5. **Start development servers**
   ```bash
   pnpm dev
   ```

6. **Access the application**
   - Web App: http://localhost:5173
   - API: http://localhost:3000
   - API Docs: http://localhost:3000/docs

## 📁 Project Structure

```
├── apps/
│   ├── web/          # React + Vite frontend
│   └── api/          # Node.js + Express backend
├── packages/
│   ├── ui/           # Shared UI components
│   └── types/        # Shared TypeScript types & Zod schemas
├── docker-compose.yml
└── package.json
```

## 🔐 Default Credentials

After seeding the database, you can login with:

- **Admin**: admin@example.com / password123
- **Manager**: manager@example.com / password123
- **Member**: member@example.com / password123

## 🛠️ Available Scripts

### Root Level
- `pnpm dev` - Start both web and API in development mode
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm test` - Run tests across all packages
- `pnpm format` - Format code with Prettier

### API (apps/api)
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests
- `pnpm prisma migrate dev` - Run database migrations
- `pnpm db:seed` - Seed database with sample data

### Web (apps/web)
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm test` - Run tests

## 🏗️ Tech Stack

### Frontend
- React 18 + TypeScript
- Vite for build tooling
- TailwindCSS for styling
- React Router for routing
- React Query for server state
- React Hook Form for forms

### Backend
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT authentication
- Role-based access control
- File uploads with Multer
- OpenAPI/Swagger documentation

### Shared
- Zod for validation
- TypeScript for type safety
- ESLint + Prettier for code quality

## 🔧 Development

### Code Quality
- ESLint configured across all packages
- Prettier for consistent formatting
- Husky + lint-staged for pre-commit hooks
- TypeScript strict mode enabled

### Testing
- Vitest for frontend unit tests
- Jest for API unit/integration tests
- Test database seeding

### Database
- Prisma migrations for schema changes
- Seed script for development data
- Docker Compose for local PostgreSQL

## 📚 API Documentation

Once the API is running, visit http://localhost:3000/docs for interactive API documentation powered by Swagger UI.

## 🚀 Deployment

### Production Build
```bash
pnpm build
```

### Environment Variables
Make sure to set appropriate environment variables for production:
- Database connection string
- JWT secrets
- File upload paths
- CORS origins

## 🤝 Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Use conventional commits

## 📄 License

MIT License - see LICENSE file for details
