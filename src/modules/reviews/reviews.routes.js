// src/modules/reviews/reviews.routes.js
// Rating and review route definitions.

import { Router } from 'express';
import { requireRole } from '../../middleware/authorize.js';
import { ROLES } from '../../constants.js';
import * as ReviewsController from './reviews.controller.js';

const router = Router();

// Submit appointment rating (from history page)
router.post('/rate', requireRole(ROLES.STUDENT), ReviewsController.handleRatingSubmission);

// Post-booking review page
router.get('/review/:id', requireRole(ROLES.STUDENT), ReviewsController.showReviewPage);
router.post('/review', requireRole(ROLES.STUDENT), ReviewsController.handleReviewSubmission);

// View all student's nurse reviews
router.get('/nurse-reviews', requireRole(ROLES.STUDENT), ReviewsController.showStudentReviews);

export default router;
