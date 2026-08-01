import * as AdminReportModel from '../models/adminReportModel.js';

// ============================================================================
// ADMIN CONTROLLER - Operational Reports & Analytics
// ============================================================================

/**
 * GET /management/admin/reports
 * Displays aggregate operational metrics and rating summaries.
 */
export async function showAdminReport(req, res) {
  try {
    const metrics = await AdminReportModel.getOperationalReportData();
    const appointmentsByType = await AdminReportModel.getAppointmentsByType();
    const ratings = await AdminReportModel.getAllRatings();
    const periodMap = { '7d': 7, '1m': 30, '2m': 60, '6m': 180, '1y': 365 };
    const period = req.query.period || '1m';
    const days = periodMap[period] || 30;
    const dailyAppointments = await AdminReportModel.getDailyAppointmentCounts(days);

    res.render('admin/reports', {
      user: req.session.user,
      metrics,
      appointmentsByType,
      ratings,
      dailyAppointments: JSON.stringify(dailyAppointments),
      period,
      error: null
    });
  } catch (error) {
    console.error('Admin report error:', error);
    res.status(500).render('admin/reports', {
      user: req.session.user,
      metrics: null,
      appointmentsByType: [],
      ratings: [],
      dailyAppointments: '[]',
      period: req.query.period || '1m',
      error: 'Unable to generate reports. Please try again.'
    });
  }
}
