const configService = require('../services/configService');

async function get(req, res, next) {
  try {
    const data = await configService.getPublicConfig();
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

module.exports = { get };
