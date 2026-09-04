// src/modules/trends/trends.routes.js
// Health trends and map route definitions.

import { Router } from 'express';
import { requireAuth } from '../../middleware/authenticate.js';
import * as TrendsController from './trends.controller.js';

const router = Router();

// Trends dashboard (any authenticated user)
router.get('/', requireAuth, TrendsController.renderTrendsDashboard);

// Heatmap density points (GeoJSON, weighted by severity)
router.get('/api/heatmap', requireAuth, TrendsController.getHeatmapAPI);

// Zone polygons + rollup (GeoJSON — outbreak outlines + click detail)
router.get('/api/zones', requireAuth, TrendsController.getZonesAPI);

export default router;
