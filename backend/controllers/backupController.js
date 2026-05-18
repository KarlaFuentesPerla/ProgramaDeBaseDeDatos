const fs = require('fs');
const { env } = require('../config/env');
const backupService = require('../services/backupService');
const restoreService = require('../services/restoreService');
const { logSistema } = require('../utils/logger');

async function list(req, res, next) {
  try {
    const soloRestaurables =
      req.query.restorable === '1' || req.query.restorable === 'true';
    const data = await backupService.listBackups({ soloRestaurables });
    res.json({
      ok: true,
      data,
      retention_days: env.retentionDays || 0,
    });
  } catch (e) {
    next(e);
  }
}

async function syncCatalog(req, res, next) {
  try {
    const result = await backupService.syncBackupCatalog();
    const data = await backupService.listBackups();
    res.json({ ok: true, data, ...result });
  } catch (e) {
    next(e);
  }
}

async function create(req, res, next) {
  try {
    const descripcion = req.body && req.body.descripcion != null ? String(req.body.descripcion) : '';
    const data = await backupService.createBackup({ descripcion, triggeredBy: 'api' });
    res.status(201).json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

async function restore(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      const e = new Error('ID de versión inválido');
      e.status = 400;
      throw e;
    }
    const data = await restoreService.restoreVersion(id);
    res.json({ ok: true, data });
  } catch (e) {
    next(e);
  }
}

async function download(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      const e = new Error('ID de versión inválido');
      e.status = 400;
      throw e;
    }
    const format = String(req.query.format || 'enc').toLowerCase() === 'sql' ? 'sql' : 'enc';
    const info = await backupService.prepareDownload(id, format);

    res.setHeader('Content-Type', info.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${info.filename}"`);

    const stream = fs.createReadStream(info.path);
    let cleaned = false;
    const runCleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (info.cleanup) info.cleanup();
    };
    stream.on('error', (err) => {
      runCleanup();
      next(err);
    });
    res.on('finish', runCleanup);
    res.on('close', runCleanup);
    stream.on('end', async () => {
      try {
        await logSistema({
          tipo: 'EXPORT',
          mensaje: `Exportación ${format === 'sql' ? 'SQL' : 'cifrada'} de ${info.version_nombre}`,
          detalle: { format, filename: info.filename },
          version_id: id,
        });
      } catch (_) {
        /* no bloquear descarga */
      }
    });
    stream.pipe(res);
  } catch (e) {
    next(e);
  }
}

module.exports = { list, syncCatalog, create, restore, download };
