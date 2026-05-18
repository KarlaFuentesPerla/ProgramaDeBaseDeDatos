const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { env } = require('../config/env');
const { decryptFile } = require('../utils/encryption');
const { logSistema } = require('../utils/logger');
const { queryMetadata, qualifiedMetadata } = require('../config/db');
const backupService = require('./backupService');

const execFileAsync = promisify(execFile);
const backupsDir = path.join(__dirname, '..', 'backups');
const encryptedDir = path.join(__dirname, '..', 'encrypted');
const tempDir = path.join(__dirname, '..', 'temp');

async function runMysqlImport(sqlPath) {
  const { spawn } = require('child_process');
  const args = [
    '-h',
    env.mysql.host,
    '-P',
    String(env.mysql.port),
    '-u',
    env.mysql.user,
    `--password=${env.mysql.password}`,
    env.backupTargetDatabase,
  ];
  await new Promise((resolve, reject) => {
    const proc = spawn(env.mysqlCliPath, args, { windowsHide: true });
    fs.createReadStream(sqlPath).pipe(proc.stdin);
    let err = '';
    proc.stderr.on('data', (d) => {
      err += d.toString();
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(err || `mysql salió con código ${code}`));
    });
    proc.on('error', reject);
  });
}

async function restoreVersion(versionId) {
  const row = await backupService.assertVersionRestorable(versionId);
  const t = qualifiedMetadata('versiones_bd');
  const preservedCatalog = await queryMetadata(`SELECT * FROM ${t} WHERE version_id != ?`, [versionId]);

  const encPath = backupService.resolveStoredFile(encryptedDir, row.archivo_encriptado);
  const sqlPath = backupService.resolveStoredFile(backupsDir, row.archivo_backup);

  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const decPath = path.join(tempDir, `restore_${versionId}_${Date.now()}.sql`);

  try {
    await logSistema({
      tipo: 'RESTORE',
      mensaje: `Inicio de restauración desde ${row.version_nombre}`,
      detalle: { versionId, targetDb: env.backupTargetDatabase },
      version_id: versionId,
    });

    if (fs.existsSync(encPath)) {
      decryptFile(encPath, decPath, env.encryptionKey);
      await runMysqlImport(decPath);
    } else {
      await runMysqlImport(sqlPath);
    }

    await backupService.finalizeRestoreCatalog(versionId, preservedCatalog, row);

    await logSistema({
      tipo: 'RESTORE',
      mensaje: `Restauración completada para ${row.version_nombre}`,
      detalle: { versionId, preservedVersions: preservedCatalog.length },
      version_id: null,
    });

    return { version_id: versionId, version_nombre: row.version_nombre, target_database: env.backupTargetDatabase };
  } finally {
    if (fs.existsSync(decPath)) fs.unlinkSync(decPath);
  }
}

module.exports = { restoreVersion };
