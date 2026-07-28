// ======================================================================================
// CAMPUSCARE HUB - CENTRAL APPLICATION ENTRY POINT (src/app.js)
// --------------------------------------------------------------------------------------
// BIGGER PICTURE:
// This file serves as the main orchestrator of the entire Node.js/Express web server.
// It initializes the web framework, configures global middlewares (parsing, sessions,
// and static file delivery), sets up the view engine for HTML rendering, and binds
// the HTTP server to a designated port. Downstream feature routes (auth, symptoms,
// appointments) will be mounted onto this file as they are built.
// ======================================================================================

// Import Express framework to manage HTTP routing, requests, and responses.
import express from 'express';

// Import express-session middleware to store user state across HTTP requests (used for user logins).
import session from 'express-session';

// Import dotenv to automatically load environment variables defined in the root .env file.
import dotenv from 'dotenv/config';

// Import path utility to build cross-platform file and directory paths (resolves Windows vs Linux slash differences).
import path from 'path';

// Import fileURLToPath helper to convert ES Module URL paths into standard file system paths.
import { fileURLToPath } from 'url';

// File imports
import authRoutes from './routes/authRoutes.js';
import { requireAuth } from './middlewares/authMiddleware.js';

// Convert the current module URL (import.meta.url) into a standard directory path string.
// BIGGER PICTURE: Required because standard ES Modules (`import`) do not provide Node's legacy `__dirname` globally.
const __filename = fileURLToPath(import.meta.url);

// Extract the parent directory path of the current file (src folder).
const __dirname = path.dirname(__filename);

// Instantiate the core Express application server instance.
// BIGGER PICTURE: `app` is the central web application instance where all middleware and routes are attached.
const app = express();

// Middleware: Enable parsing of incoming requests with JSON payloads (e.g., API requests).
app.use(express.json());

// Middleware: Enable parsing of standard form submissions sent via HTML POST requests.
// `extended: true` allows nested objects and complex data formatting within submitted form data.
app.use(express.urlencoded({ extended: true }));

// Middleware: Configure user session tracking across HTTP requests.
// BIGGER PICTURE: HTTP is stateless. Sessions keep users logged in by assigning them a cookie identifier.
app.use(
  session({
    // Use the SESSION_KEY from .env.
    secret: process.env.SESSION_SEED,

    // Prevents saving unchanged sessions back to the store on every request (optimizes session storage performance).
    resave: false,

    // Prevents uninitialized/empty sessions from being stored until data (like user ID) is attached.
    saveUninitialized: false,

    // Set cookie parameters for modern security and session expiration.
    cookie: {
      // Max session duration set to 3,600,000 milliseconds (1 hour) before re-authentication is required.
      maxAge: 3600000
    }
  })
);

// Middleware: Serve static frontend files (CSS stylesheets, images, browser-side JS) directly from the /public folder.
// BIGGER PICTURE: Any file inside /public (like public/css/style.css) can be directly fetched by the browser.
app.use(express.static(path.join(__dirname, '../public')));

// Configure EJS (Embedded JavaScript) as the view template engine for rendering server-side pages.
app.set('view engine', 'ejs');

// Specify the directory path where Express should look for EJS layout templates and views.
app.set('views', path.join(__dirname, '../views'));

// Mount authentication routes under /auth
app.use('/auth', authRoutes);

// Define the root health-check route handler for GET requests made to "http://localhost:3000/".
// BIGGER PICTURE: Serves as a baseline test route to verify that the HTTP server is running and responding.
// Root Dashboard Route (Protected)
app.get('/', requireAuth, (req, res) => {
    res.render('index', { user: req.session.user });
});

// Set the application listening port from environment variables (.env), or default to port 3000.
const PORT = process.env.APP_PORT;

// Start the HTTP server listening for incoming client requests on the specified port.
app.listen(PORT, () => {
  // Output server connection details to the PowerShell console upon successful startup.
  console.log(`Server listening on http://localhost:${PORT}`);
});