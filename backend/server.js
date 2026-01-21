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

// Import routes
const routes = require("./routes");

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true, // Important: Allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(cookieParser());
app.use(express.json());

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
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
app.listen(PORT, async () => {
  try {
    console.log("═══════════════════════════════════════════════════");
    console.log("🚀 Starting Monolith E-Commerce Backend...");
    console.log("═══════════════════════════════════════════════════");
    
    // Connect to database
    console.log("📡 Connecting to database...");
    await connectDB();
    
    // Auto-initialize admin user FIRST (before Firebase)
    console.log("👤 Initializing admin user...");
    const { initializeAdmin } = require("./utils/auth/initializeAdmin");
    const initResult = await initializeAdmin();
    
    if (initResult.success) {
      console.log("✅ Admin initialization completed successfully");
    } else {
      console.error("⚠️  Admin initialization failed:", initResult.message);
      console.error("   Please check the logs above for details");
    }
    
    // Initialize Firebase Admin SDK (after admin creation)
    try {
      initializeFirebase();
      console.log("🔥 Firebase Admin SDK initialized");
    } catch (firebaseError) {
      console.error("⚠️ Firebase initialization failed:", firebaseError.message);
      console.log("📱 Push notifications will not be available");
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
