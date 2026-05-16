const { execFile } = require('child_process');
const { promisify } = require('util');
const { env } = require('../config/env');
const backupService = require('./backupService');

const execFileAsync = promisify(execFile);

async function tryBinVersion(bin) {
  try {
    const { stdout } = await execFileAsync(bin, ['--version'], {
      timeout: 8000,
      windowsHide: true,
      maxBuffer: 512 * 1024,
    });
    const line = stdout.trim().split(/\r?\n/)[0] || stdout.trim();
    return { ok: true, version: line };
  } catch (e) {
    return { ok: false, version: null, message: e.message };
  }
}

async function getPublicConfig() {
  const dumpRes = await tryBinVersion(env.mysqldumpPath);
  const mysqlRes = await tryBinVersion(env.mysqlCliPath);

  return {
    api_port: env.port,
    client_origin: env.clientOrigin,
    mysql_host: env.mysql.host,
    mysql_port: env.mysql.port,
    mysql_user: env.mysql.user,
    backup_target_database: env.backupTargetDatabase,
    metadata_database: env.metadataDatabase,
    cron_schedule: env.cronSchedule,
    retention_days: env.retentionDays,
    mysqldump_path: env.mysqldumpPath,
    mysql_cli_path: env.mysqlCliPath,
    mysql_binaries_resolution: env.mysqlBinariesResolution,
    mysqldump_available: dumpRes.ok,
    mysqldump_version: dumpRes.version,
    mysqldump_last_error: dumpRes.ok ? null : dumpRes.message,
    mysql_cli_available: mysqlRes.ok,
    mysql_cli_version: mysqlRes.version,
    mysql_cli_last_error: mysqlRes.ok ? null : mysqlRes.message,
    backup_job_running: backupService.isBackupRunning(),
    node_env: env.nodeEnv,
  };
}

module.exports = { getPublicConfig };
