// src/modules/trends/trends.routes.js
// Health trends and map route definitions.

import { Router } from 'express';
import { requireAuth } from '../../middleware/authenticate.js';
import * as TrendsController from './trends.controller.js';

const router = Router();

// Trends dashboard (any authenticated user)
router.get('/', requireAuth, TrendsController.renderTrendsDashboard);

// Map data API (JSON)
router.get('/api/map-data', requireAuth, TrendsController.getMapDataAPI);

export default router;
