const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("./config/passport");
const { connectDB, disconnectDB } = require("./config/database");
const { initializeFirebase } = require("./utils/firebase/firebaseAdmin");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize database and admin BEFORE setting up middleware (for Vercel)
let initializationPromise = null;
let isInitialized = false;

async function initializeApp() {
  // If already initialized, return immediately
  if (isInitialized) {
    return true;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      console.log("═══════════════════════════════════════════════════");
      console.log("🚀 Initializing Monolith E-Commerce Backend...");
      console.log("═══════════════════════════════════════════════════");
      
      // Connect to database
      console.log("📡 Connecting to database...");
      await connectDB();
      console.log("✅ Database connected successfully");
      
      // Auto-initialize admin user
      console.log("\n👤 Initializing admin user...");
      try {
        const { initializeAdmin } = require("./utils/auth/initializeAdmin");
        const initResult = await initializeAdmin();
        
        if (initResult.success) {
          console.log("✅ Admin initialization completed successfully");
          if (initResult.admin) {
            console.log(`   📧 Admin Email: ${initResult.admin.email}`);
            console.log(`   🆔 Admin ID: ${initResult.admin.id}`);
          }
        } else {
          console.error("⚠️  Admin initialization failed:", initResult.message);
          if (initResult.error) {
            console.error("   Error details:", initResult.error.message);
          }
          console.error("   You can manually initialize admin by visiting: /api/init/admin");
        }
      } catch (initError) {
        console.error("❌ Critical error during admin initialization:");
        console.error("   Error:", initError.message);
        console.error("   You can manually initialize admin by visiting: /api/init/admin");
      }
      
      // Initialize Firebase Admin SDK
      console.log("\n🔥 Initializing Firebase Admin SDK...");
      try {
        initializeFirebase();
        console.log("✅ Firebase Admin SDK initialized");
      } catch (firebaseError) {
        console.error("⚠️ Firebase initialization failed:", firebaseError.message);
        console.log("📱 Push notifications will not be available");
      }
      
      console.log("═══════════════════════════════════════════════════");
      console.log("✅ Initialization Complete");
      console.log("═══════════════════════════════════════════════════\n");
      
      // Mark as initialized
      isInitialized = true;
      return true;
    } catch (error) {
      console.error("❌ Initialization failed:");
      console.error("   Error details:", error.message);
      console.error("   Stack:", error.stack);
      
      // Reset promise so it can be retried
      initializationPromise = null;
      return false;
    }
  })();

  return initializationPromise;
}

// Run initialization immediately (for Vercel serverless)
// Use IIFE to properly await the initialization
(async () => {
  await initializeApp();
})();

// Import routes
const routes = require("./routes");

// Allowed origins for CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.BACKEND_URL,
  "http://localhost:3000",
  "http://localhost:5000",
  "https://monolith-ecommerce.vercel.app",
  "https://monolith-ecommerce-3pwa.vercel.app",
].filter(Boolean).map(origin => origin.replace(/\/$/, "")); // Normalize by removing trailing slashes

console.log("🔒 CORS Configuration:");
console.log("   Allowed Origins:", allowedOrigins);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      // Normalize origin for comparison
      const normalizedOrigin = origin.replace(/\/$/, "");
      
      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️ CORS: Blocked request from origin: ${origin}`);
        // Instead of erroring, we allow the request but won't set CORS headers
        // This helps in debugging and prevents the middleware from crashing the request
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
  })
);

app.use(cookieParser());
app.use(express.json());

// Ensure initialization completes before handling requests (for Vercel)
app.use(async (req, res, next) => {
  await initializeApp();
  next();
});

// Serve static files for uploaded images
app.use('/public', express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Monolith] ${req.method} ${req.path}`);
  next();
});

// Root route - Backend status
app.get('/', (req, res) => {
  res.json({
    message: 'Monolith E-Commerce Backend is running',
    version: '1.0.0',
    architecture: 'monolith',
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      api: '/api',
      health: '/api/health',
      docs: 'All API routes are prefixed with /api'
    }
  });
});

// Mount routes with /api prefix
app.use('/api', routes);

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.originalUrl,
    message: "API endpoint not found. Please check the route and try again.",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("[Monolith Error]", err);
  
  // Ensure CORS headers are present even on errors
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin.replace(/\/$/, ""))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.name || "Internal server error",
    message: err.message,
  });
});

// Start server
app.listen(PORT, async () => {
  try {
    // Initialize Cron Jobs for automated notifications
    try {
      const { initializeCronJobs } = require("./utils/notification/cronJobs");
      initializeCronJobs();
      console.log("⏰ Cron jobs initialized for automated stock alerts");
    } catch (cronError) {
      console.error("⚠️ Cron jobs initialization failed:", cronError.message);
      console.log("📅 Scheduled notifications will not be available");
    }
    
    console.log("═══════════════════════════════════════════════════");
    console.log("✅ Monolith E-Commerce Backend Started Successfully");
    console.log("═══════════════════════════════════════════════════");
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 Frontend: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
    console.log(`🗄️  Database: ${process.env.MONGO_URL?.split('/').pop()?.split('?')[0] || "monolith-ecommerce"}`);
    console.log("═══════════════════════════════════════════════════");
    console.log("📡 API Routes:");
    console.log("   /api/auth/* - Authentication endpoints");
    console.log("   /health - Health check");
    console.log("═══════════════════════════════════════════════════");
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    console.error("   Error details:", error.message);
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  await disconnectDB();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("\nSIGINT signal received: closing HTTP server");
  await disconnectDB();
  process.exit(0);
});

// Export app for Vercel
module.exports = app;
