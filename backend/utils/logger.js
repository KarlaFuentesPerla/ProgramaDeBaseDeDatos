const fs = require('fs');
const path = require('path');
const { queryMetadata, runMetadata, qualifiedMetadata } = require('../config/db');

const logsDir = path.join(__dirname, '..', 'logs');

function todayLogFile() {
  const d = new Date().toISOString().slice(0, 10);
  return path.join(logsDir, `app-${d}.log`);
}

function appendFileLine(line) {
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  fs.appendFileSync(todayLogFile(), line + '\n', 'utf8');
}

async function logSistema({ tipo, mensaje, detalle = null, version_id = null }) {
  const ts = new Date().toISOString();
  const det = detalle != null ? ` ${JSON.stringify(detalle)}` : '';
  appendFileLine(`${ts} [${tipo}] ${mensaje}${det}`);

  try {
    const t = qualifiedMetadata('logs_sistema');
    await runMetadata(
      `INSERT INTO ${t} (tipo, mensaje, detalle, version_id) VALUES (?, ?, ?, ?)`,
      [tipo, mensaje, detalle != null ? JSON.stringify(detalle) : null, version_id]
    );
  } catch (_) {
    /* tabla puede no existir aún */
  }
}

module.exports = { logSistema };
