const express = require('express');
const cors = require('cors');
const { env } = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { startCron } = require('./services/cronService');
const { logSistema } = require('./utils/logger');

const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'backup-versioning-api' });
});

app.use('/api/backups', require('./routes/backups'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/config', require('./routes/config'));
app.use('/api/gestion', require('./routes/gestion'));

app.use(notFoundHandler);
app.use(errorHandler);

startCron();

const server = app.listen(env.port, async () => {
  console.log(`API en http://localhost:${env.port}`);
  console.log(
    `[gestión] MySQL ${env.mysql.host}:${env.mysql.port} · BACKUP_TARGET_DATABASE=${env.backupTargetDatabase}`
  );
  console.log(`[backup] mysqldump: ${env.mysqldumpPath}`);
  try {
    const { reconcileStuckBackups } = require('./services/backupService');
    const n = await reconcileStuckBackups();
    if (n > 0) console.warn(`[backup] ${n} versión(es) pendiente(s) marcada(s) como error`);
    await logSistema({
      tipo: 'SYSTEM_START',
      mensaje: 'Servidor de versionado y respaldo iniciado',
    });
  } catch (e) {
    console.warn('[startup] No se pudo escribir en logs_sistema:', e.message);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[error] Puerto ${env.port} en uso. Cierra el otro "npm run dev" del backend y reinicia.`);
  } else {
    console.error('[error] No se pudo iniciar el servidor:', err.message);
  }
  process.exit(1);
});

function shutdown(signal) {
  console.log(`[shutdown] ${signal} — liberando puerto ${env.port}`);
  server.close((err) => {
    if (err) console.error('[shutdown]', err.message);
    process.exit(err ? 1 : 0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
