import { Router } from 'express';
import { requireStudent } from '../middlewares/authMiddleware.js';
import { renderSymptomForm, processSymptomCheck, showSymptomHistory } from '../controllers/symptomController.js';

const router = Router();

// GET /symptoms - Display symptom selection form (students only)
router.get('/', requireStudent, renderSymptomForm);

// POST /symptoms/evaluate - Process symptom and return OTC recommendations
router.post('/evaluate', requireStudent, processSymptomCheck);

// GET /symptoms/history - View personal symptom check history
router.get('/history', requireStudent, showSymptomHistory);

export default router;
