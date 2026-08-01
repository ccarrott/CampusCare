import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { renderTrendsDashboard, getMapDataAPI } from '../controllers/trendController.js';
import { exportTrendsCSV } from '../controllers/exportController.js';

const router = Router();

// GET /trends - Campus health trend dashboard (any authenticated user)
router.get('/', requireAuth, renderTrendsDashboard);

// GET /trends/api/map-data - JSON zone data for Leaflet map
router.get('/api/map-data', requireAuth, getMapDataAPI);

// GET /trends/export-csv - CSV download (nurse + admin only)
router.get('/export-csv', requireAuth, exportTrendsCSV);

export default router;
