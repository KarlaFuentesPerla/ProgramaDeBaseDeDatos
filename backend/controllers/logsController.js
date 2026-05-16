const { queryMetadata, qualifiedMetadata } = require('../config/db');

async function list(req, res, next) {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10) || 50));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10) || 0);
    const tipo = req.query.tipo ? String(req.query.tipo).trim() : '';

    const t = qualifiedMetadata('logs_sistema');
    let sql = `SELECT * FROM ${t}`;
    const params = [];
    if (tipo) {
      sql += ' WHERE tipo = ?';
      params.push(tipo);
    }
    // LIMIT/OFFSET no pueden ir como ? en prepared statements (MySQL: ER_WRONG_ARGUMENTS)
    sql += ` ORDER BY log_id DESC LIMIT ${limit} OFFSET ${offset}`;

    const rows = await queryMetadata(sql, params);
    let countSql = `SELECT COUNT(*) AS total FROM ${t}`;
    const countParams = [];
    if (tipo) {
      countSql += ' WHERE tipo = ?';
      countParams.push(tipo);
    }
    const [countRow] = await queryMetadata(countSql, countParams);

    res.json({
      ok: true,
      data: rows,
      pagination: { limit, offset, total: Number(countRow?.total || 0) },
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { list };
