// ======================================================================================
// CAMPUSCARE HUB - CENTRAL APPLICATION ENTRY POINT (src/app.js)
// ======================================================================================
import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import { requireAuth } from './middlewares/authMiddleware.js';

// Setup cross-platform directory paths for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Core Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Secure Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Strictly bound to .env for security
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 3600000, // 1 hour session duration
      httpOnly: true   // Protects against cross-site scripting (XSS) attacks
    }
  })
);

// Serve Static Assets & View Engine
app.use(express.static(path.join(__dirname, '../public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// ======================================================================================
// ROUTES
// ======================================================================================

// Root Dashboard Route (Protected by Auth Middleware)
app.get('/', requireAuth, (req, res) => {
  res.render('index', { user: req.session.user });
});

// Mount modular Auth routes
app.use('/auth', authRoutes);

// ======================================================================================
// STARTUP VERIFICATION & SERVER BOOT
// ======================================================================================
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Ping MySQL to verify active connection pool before opening HTTP ports
    await query('SELECT 1');
    console.log('[Database] MySQL connection pool verified successfully.');

    app.listen(PORT, () => {
      console.log(`[Server] CampusCare Hub running live at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('[Server Fatal Error] Unable to establish database connection:', error.message);
    process.exit(1); // Terminate process to prevent half-baked app states
  }
}

startServer();