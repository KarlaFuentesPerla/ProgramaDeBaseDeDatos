const dashboardService = require('../services/dashboardService');

async function get(req, res, next) {
  try {
    const data = await dashboardService.getDashboard();
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = { get };
