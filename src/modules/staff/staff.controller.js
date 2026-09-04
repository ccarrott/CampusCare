// src/modules/staff/staff.controller.js
// Handles the "Meet Our Staff" public page showing nurse profiles and verified reviews.

import * as StaffModel from './staff.model.js';
import * as ReviewsModel from '../reviews/reviews.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { AppError } from '../../utils/AppError.js';

export const showStaffPage = catchAsync(async (req, res) => {
  const nurses = await StaffModel.getAllNursesWithProfiles();
  const averages = await StaffModel.getVerifiedAveragesForAllNurses();
  const allReviews = await StaffModel.getAllVerifiedRatings();

  // Build lookup maps
  const averageMap = {};
  averages.forEach(a => { averageMap[a.StaffNumber] = { average: parseFloat(Number(a.Average).toFixed(1)), count: a.Count }; });

  // Group reviews by nurse
  const reviewMap = {};
  allReviews.forEach(r => {
    if (!reviewMap[r.StaffNumber]) reviewMap[r.StaffNumber] = [];
    reviewMap[r.StaffNumber].push(r);
  });

  // Build nurse data for the view
  const staffData = nurses.map(nurse => ({
    staffNumber: nurse.StaffNumber,
    firstName: nurse.FirstName,
    lastName: nurse.LastName,
    campus: nurse.Campus || null,
    bio: nurse.Bio || null,
    yearsExperience: nurse.YearsExperience || 0,
    averageRating: averageMap[nurse.StaffNumber]?.average || null,
    ratingCount: averageMap[nurse.StaffNumber]?.count || 0,
    // Directory shows only the 2 most recent reviews per nurse (full list is on the profile).
    reviews: (reviewMap[nurse.StaffNumber] || []).slice(0, 2).map((r, i) => ({
      patient: `Patient ${i + 1}`,
      score: r.Score,
      comment: r.RatingDescription,
      date: r.CreatedAt
    }))
  }));

  // Distinct campuses present (for the filter pills)
  const campuses = [...new Set(staffData.map(n => n.campus).filter(Boolean))].sort();

  res.render('staff/index', { user: req.session.user, staffData, campuses });
});

/**
 * GET /staff/:staffNumber — student-facing nurse profile (public info only) with
 * all approved reviews (client-side filter/sort applied in the view).
 */
export const showNurseProfile = catchAsync(async (req, res) => {
  const nurse = await StaffModel.getNursePublicProfile(req.params.staffNumber);
  if (!nurse) throw new AppError('Nurse not found', 404);

  const { average, count } = await ReviewsModel.getVerifiedAverageForNurse(nurse.StaffNumber);
  const rows = await ReviewsModel.getVerifiedRatingsForNurse(nurse.StaffNumber, 200);
  const reviews = rows.map((r, i) => ({
    patient: `Patient ${i + 1}`,
    score: r.Score,
    comment: r.RatingDescription,
    date: r.CreatedAt
  }));

  // Review-from-profile (Fixup 3): if a student has a completed, unreviewed
  // consultation with this nurse, offer a CTA into the existing review flow.
  let reviewAppointmentId = null;
  if (req.session.user && req.session.user.role === 'student') {
    const studentNumber = req.session.user.id;
    const alreadyReviewed = await ReviewsModel.hasReviewedNurse(studentNumber, nurse.StaffNumber);
    if (!alreadyReviewed) {
      const apt = await ReviewsModel.getMostRecentCompletedAppointment(studentNumber, nurse.StaffNumber);
      if (apt) reviewAppointmentId = apt.AppointmentID;
    }
  }

  res.render('staff/nurse-profile', {
    user: req.session.user,
    reviewAppointmentId,
    nurse: {
      staffNumber: nurse.StaffNumber,
      firstName: nurse.FirstName,
      lastName: nurse.LastName,
      campus: nurse.Campus || null,
      bio: nurse.Bio || null,
      yearsExperience: nurse.YearsExperience || 0,
      averageRating: average ? parseFloat(Number(average).toFixed(1)) : null,
      ratingCount: count || 0
    },
    reviews
  });
});
