# 🚀 Monolith E-Commerce - Quick Start Guide

## Architecture
This is a **monolithic** application with:
- **Backend**: Unified Node.js/Express monolith (Port 5000)
- **Frontend**: Next.js 15 with React 19 (Port 3000)

---

## 🎯 Quick Start

### Option 1: VS Code Tasks (Recommended)
1. Press `Ctrl + Shift + P`
2. Type `Tasks: Run Task`
3. Select `Start Monolith Application`

### Option 2: PowerShell Script
```powershell
.\start-all.ps1
```

### Option 3: Manual Start
```bash
# Terminal 1 - Backend
cd backend
npm install
npx prisma generate
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

---

## 🌐 Application URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js Application |
| Backend API | http://localhost:5000 | Monolith REST API |
| API Health | http://localhost:5000/api/health | Health Check |

---

## 📝 Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Backend (.env)
# Server Configuration
PORT=5000
NODE_ENV=development
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Database Configuration - MongoDB (Single Database for Monolith)
MONGO_URL="mongodb+srv://your-username:your-password@cluster.mongodb.net/monolith-ecommerce"

# Authentication & Security
JWT_SECRET=your-jwt-secret-key-here
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="Admin@123"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-google-client-secret"

# Email Configuration (SMTP)
SMTP_FROM_EMAIL="noreply@example.com"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASS="your-app-password"

# AWS Configuration
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_REGION=eu-north-1
AWS_S3_BUCKET_NAME=your-s3-bucket-name

# AI/ML Services
GROQ_API_KEY=gsk_YOUR_GROQ_API_KEY


---

## 🗄️ Database Setup

### Generate Prisma Client
```bash
cd backend
npx prisma generate
```

### Push Schema to Database
```bash
npx prisma db push
```

### Open Prisma Studio
```bash
npx prisma studio
```

---

## 🛠️ Development Commands

### Backend
```bash
cd backend
npm run dev          # Start development server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
```

### Frontend
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

---

## 📦 Project Structure

```
monolith-ecommerce/
├── backend/                 # Monolith Backend
│   ├── config/             # Configuration files
│   ├── controllers/        # Route controllers
│   │   ├── auth/          # Authentication
│   │   ├── inventory/     # Inventory management
│   │   ├── order/         # Order management
│   │   ├── finance/       # Financial operations
│   │   ├── purchase/      # Purchase orders
│   │   ├── customer/      # Customer management
│   │   ├── delivery/      # Delivery partners
│   │   ├── email/         # Email configuration
│   │   ├── online/        # Online store
│   │   ├── pos/           # POS operations
│   │   └── web/           # Web settings
│   ├── middleware/         # Express middleware
│   ├── prisma/            # Database schema
│   ├── routes/            # API routes
│   ├── utils/             # Utility functions
│   └── server.js          # Entry point
│
├── frontend/               # Next.js Frontend
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/               # Utilities
│   ├── services/          # API services
│   └── types/             # TypeScript types
│
└── .vscode/               # VS Code configuration
    └── tasks.json         # VS Code tasks
```

---

## 🔍 API Endpoints

All APIs are available at `http://localhost:5000/api`

### Main Routes:
- `/api/auth/*` - Authentication
- `/api/inventory/*` - Inventory management
- `/api/order/*` - Order management
- `/api/finance/*` - Financial operations
- `/api/purchase/*` - Purchase orders
- `/api/customer/*` - Customer management
- `/api/delivery-partners/*` - Delivery management
- `/api/online/*` - Online store
- `/api/pos/*` - POS operations
- `/api/web/*` - Web settings
- `/api/payment-gateway/*` - Payment processing

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Prisma Client Not Generated
```bash
cd backend
npx prisma generate
```

### Dependencies Not Installed
```bash
# Backend
cd backend
npm install

# Frontend
cd frontend
npm install
```

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

## 🎉 Success!

Your monolithic e-commerce application is now running!

- Frontend: http://localhost:3000
- Backend: http://localhost:5000
