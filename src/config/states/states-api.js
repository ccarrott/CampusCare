// src/config/states/states-api.js
// Admin-only API endpoints for triggering database state changes from browser console.

import { Router } from 'express';
import { requireRole } from '../../middleware/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();

router.post('/naked', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { loadNakedState } = await import('./state-naked.js');
    const result = await loadNakedState();
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/showcase', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { loadShowcaseState } = await import('./state-showcase.js');
    const result = await loadShowcaseState();
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/outbreak', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { loadOutbreakState } = await import('./state-outbreak.js');
    const result = await loadOutbreakState();
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/clear-outbreak', requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { clearOutbreak } = await import('./state-clear-outbreak.js');
    const result = await clearOutbreak();
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
