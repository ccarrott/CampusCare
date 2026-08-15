// src/modules/staff/staff.controller.js
// Handles the "Meet Our Staff" public page showing nurse profiles and verified reviews.

import * as StaffModel from './staff.model.js';
import { catchAsync } from '../../utils/catchAsync.js';

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
    bio: nurse.Bio || null,
    yearsExperience: nurse.YearsExperience || 0,
    averageRating: averageMap[nurse.StaffNumber]?.average || null,
    ratingCount: averageMap[nurse.StaffNumber]?.count || 0,
    reviews: (reviewMap[nurse.StaffNumber] || []).map((r, i) => ({
      patient: `Patient ${i + 1}`,
      score: r.Score,
      comment: r.RatingDescription,
      date: r.CreatedAt
    }))
  }));

  res.render('staff/index', { user: req.session.user, staffData });
});
