const cron = require('node-cron');
const { env } = require('../config/env');
const backupService = require('./backupService');
const { logSistema } = require('../utils/logger');

let task = null;

function startCron() {
  if (task) return;
  if (!cron.validate(env.cronSchedule)) {
    console.warn('[cron] Expresión inválida:', env.cronSchedule);
    return;
  }
  task = cron.schedule(env.cronSchedule, async () => {
    try {
      await logSistema({ tipo: 'CRON', mensaje: 'Respaldo programado iniciado' });
      await backupService.createBackup({ descripcion: 'Respaldo automático (cron)', triggeredBy: 'cron' });
      await backupService.applyRetention();
    } catch (e) {
      await logSistema({ tipo: 'ERROR', mensaje: e.message || 'Error en cron', detalle: { phase: 'cron' } });
    }
  });
  console.log(`[cron] Programado: ${env.cronSchedule}`);
}

module.exports = { startCron };
