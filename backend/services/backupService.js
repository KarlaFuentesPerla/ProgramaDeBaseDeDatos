const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');
const { queryMetadata, runMetadata, qualifiedMetadata } = require('../config/db');
const { encryptFile, decryptFile } = require('../utils/encryption');
const { logSistema } = require('../utils/logger');

const backupsDir = path.join(__dirname, '..', 'backups');
const encryptedDir = path.join(__dirname, '..', 'encrypted');
const tempDir = path.join(__dirname, '..', 'temp');

let backupRunning = false;

function isBackupRunning() {
  return backupRunning;
}

function ensureDirs() {
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  if (!fs.existsSync(encryptedDir)) fs.mkdirSync(encryptedDir, { recursive: true });
}

async function nextVersionName() {
  const t = qualifiedMetadata('versiones_bd');
  const rows = await queryMetadata(
    `SELECT version_nombre FROM ${t} ORDER BY version_id DESC LIMIT 1`,
    []
  );
  if (!rows[0]) return 'v1.0';
  const m = String(rows[0].version_nombre).match(/^v(\d+)\.(\d+)$/);
  if (!m) return 'v1.0';
  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2], 10) + 1;
  return `v${major}.${minor}`;
}

function fileSizeMb(filePath) {
  const bytes = fs.statSync(filePath).size;
  return bytes / (1024 * 1024);
}

async function runMysqldump(sqlPath) {
  const { spawn } = require('child_process');
  const args = [
    '-h',
    env.mysql.host,
    '-P',
    String(env.mysql.port),
    '-u',
    env.mysql.user,
    `--password=${env.mysql.password}`,
    '--single-transaction',
    '--routines',
    '--triggers',
    '--databases',
    env.backupTargetDatabase,
  ];

  await new Promise((resolve, reject) => {
    const proc = spawn(env.mysqldumpPath, args, { windowsHide: true });
    const out = fs.createWriteStream(sqlPath);
    let stderr = '';
    proc.stdout.pipe(out);
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(
          new Error(
            `No se encontró mysqldump. Define MYSQLDUMP_PATH en backend/.env (actual: ${env.mysqldumpPath})`
          )
        );
      } else {
        reject(err);
      }
    });
    out.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        const msg = stderr.trim() || `mysqldump terminó con código ${code}`;
        reject(new Error(msg));
        return;
      }
      resolve();
    });
  });

  if (!fs.existsSync(sqlPath) || fs.statSync(sqlPath).size < 50) {
    throw new Error('El respaldo SQL quedó vacío. Revisa usuario, contraseña y que exista la base en .env');
  }
}

async function createBackup({ descripcion = '', triggeredBy = 'api' } = {}) {
  if (backupRunning) {
    const e = new Error('Ya hay un respaldo en curso');
    e.status = 409;
    throw e;
  }
  backupRunning = true;
  ensureDirs();

  const versionNombre = await nextVersionName();
  const dateStr = new Date().toISOString().slice(0, 10);
  const sqlFile = `backup_${versionNombre.replace('.', '_')}_${dateStr}.sql`;
  const encFile = `${sqlFile}.enc`;
  const sqlPath = path.join(backupsDir, sqlFile);
  const encPath = path.join(encryptedDir, encFile);

  const t = qualifiedMetadata('versiones_bd');
  let versionId = null;

  try {
    const ins = await runMetadata(
      `INSERT INTO ${t} (version_nombre, fecha_backup, descripcion, archivo_backup, archivo_encriptado, tamano_archivo_mb, estado)
       VALUES (?, NOW(), ?, ?, ?, 0, 'pendiente')`,
      [versionNombre, descripcion || null, sqlFile, encFile]
    );
    versionId = ins.insertId;

    await logSistema({
      tipo: 'BACKUP',
      mensaje: `Inicio de respaldo (${triggeredBy}) versión ${versionNombre}`,
      detalle: { versionNombre, triggeredBy },
      version_id: versionId,
    });

    await runMysqldump(sqlPath);
    const sqlMb = fileSizeMb(sqlPath);
    encryptFile(sqlPath, encPath, env.encryptionKey);
    const encMb = fileSizeMb(encPath);
    const totalMb = sqlMb + encMb;

    await runMetadata(
      `UPDATE ${t} SET tamano_archivo_mb = ?, estado = 'completado', archivo_backup = ?, archivo_encriptado = ? WHERE version_id = ?`,
      [totalMb, sqlFile, encFile, versionId]
    );

    await logSistema({
      tipo: 'ENCRYPT',
      mensaje: `Cifrado completado para ${versionNombre}`,
      detalle: { sqlFile, encFile, totalMb },
      version_id: versionId,
    });
    await logSistema({
      tipo: 'BACKUP',
      mensaje: `Respaldo completado (${triggeredBy}) ${versionNombre}`,
      detalle: { sqlMb, encMb },
      version_id: versionId,
    });

    const rows = await queryMetadata(`SELECT * FROM ${t} WHERE version_id = ? LIMIT 1`, [versionId]);
    return rows[0];
  } catch (err) {
    await logSistema({
      tipo: 'ERROR',
      mensaje: err.message || 'Error en respaldo',
      detalle: { phase: 'backup', triggeredBy, versionNombre, versionId },
      version_id: versionId,
    });
    if (versionId) {
      await runMetadata(`UPDATE ${t} SET estado = 'error' WHERE version_id = ?`, [versionId]);
    }
    if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
    if (fs.existsSync(encPath)) fs.unlinkSync(encPath);
    throw err;
  } finally {
    backupRunning = false;
  }
}

async function purgeVersionsWithoutFiles() {
  const t = qualifiedMetadata('versiones_bd');
  const rows = await queryMetadata(`SELECT * FROM ${t} ORDER BY version_id`, []);
  let removed = 0;
  for (const row of rows) {
    if (row.estado === 'pendiente') continue;
    if (versionFilesExist(row)) continue;
    deleteVersionFiles(row);
    await runMetadata(`DELETE FROM ${t} WHERE version_id = ?`, [row.version_id]);
    await logSistema({
      tipo: 'CLEANUP',
      mensaje: `Versión ${row.version_nombre} eliminada del catálogo (sin archivos en disco)`,
      detalle: {
        archivo_backup: row.archivo_backup,
        archivo_encriptado: row.archivo_encriptado,
      },
      version_id: row.version_id,
    });
    removed += 1;
  }
  return removed;
}

async function reconcileVersionsWithValidFiles() {
  const t = qualifiedMetadata('versiones_bd');
  const rows = await queryMetadata(
    `SELECT * FROM ${t} WHERE estado IN ('error', 'pendiente') ORDER BY version_id`,
    []
  );
  let fixed = 0;
  for (const row of rows) {
    const filePath = versionFilePath(row);
    if (!filePath || fs.statSync(filePath).size < MIN_BACKUP_BYTES) continue;
    const mb = fileSizeMb(filePath);
    await runMetadata(
      `UPDATE ${t} SET estado = 'completado', tamano_archivo_mb = ? WHERE version_id = ?`,
      [mb.toFixed(2), row.version_id]
    );
    await logSistema({
      tipo: 'CLEANUP',
      mensaje: `Versión ${row.version_nombre} marcada como completada (archivos válidos en disco)`,
      version_id: row.version_id,
    });
    fixed += 1;
  }
  return fixed;
}

async function syncBackupCatalog() {
  await applyRetention();
  await reconcileStuckBackups();
  const reconciled = await reconcileVersionsWithValidFiles();
  const purged = await purgeVersionsWithoutFiles();
  return { purged, reconciled };
}

async function listBackups({ soloRestaurables = false } = {}) {
  await syncBackupCatalog();
  const t = qualifiedMetadata('versiones_bd');
  const rows = await queryMetadata(`SELECT * FROM ${t} ORDER BY version_id DESC`, []);
  const enriched = rows.map(enrichVersion);
  if (soloRestaurables) {
    return enriched.filter((v) => v.puede_restaurar);
  }
  return enriched;
}

async function assertVersionRestorable(versionId) {
  const row = await getBackupById(versionId);
  if (!row) {
    const e = new Error('Versión no encontrada');
    e.status = 404;
    throw e;
  }
  if (row.estado !== 'completado') {
    const e = new Error('Solo se pueden restaurar versiones completadas');
    e.status = 400;
    throw e;
  }
  if (!versionFilesExist(row)) {
    await purgeVersionsWithoutFiles();
    const e = new Error(
      `Los archivos de ${row.version_nombre} ya no están en el servidor (retención de ${env.retentionDays} días o fueron eliminados). Se quitó del listado.`
    );
    e.status = 404;
    throw e;
  }
  return row;
}

async function getBackupById(id) {
  const t = qualifiedMetadata('versiones_bd');
  const rows = await queryMetadata(`SELECT * FROM ${t} WHERE version_id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

function resolveStoredFile(baseDir, storedName) {
  if (!storedName) return null;
  const base = path.basename(String(storedName).replace(/\\/g, '/'));
  return path.join(baseDir, base);
}

const MIN_BACKUP_BYTES = 512;

function versionFilePath(row) {
  if (!row) return null;
  const encPath = resolveStoredFile(encryptedDir, row.archivo_encriptado);
  if (encPath && fs.existsSync(encPath)) return encPath;
  const sqlPath = resolveStoredFile(backupsDir, row.archivo_backup);
  if (sqlPath && fs.existsSync(sqlPath)) return sqlPath;
  return null;
}

function versionFilesExist(row) {
  const filePath = versionFilePath(row);
  if (!filePath) return false;
  return fs.statSync(filePath).size >= MIN_BACKUP_BYTES;
}

function enrichVersion(row) {
  const archivos = versionFilesExist(row);
  const puedeRestaurar = row.estado === 'completado' && archivos;
  let diasRestantes = null;
  if (env.retentionDays > 0 && row.fecha_backup) {
    const limite = new Date(row.fecha_backup);
    limite.setDate(limite.getDate() + env.retentionDays);
    diasRestantes = Math.max(0, Math.ceil((limite.getTime() - Date.now()) / 86400000));
  }
  return {
    ...row,
    archivos_en_disco: archivos,
    puede_restaurar: puedeRestaurar,
    puede_exportar: puedeRestaurar,
    dias_restantes_retencion: diasRestantes,
  };
}

function deleteVersionFiles(row) {
  const sqlPath = resolveStoredFile(backupsDir, row.archivo_backup);
  const encPath = resolveStoredFile(encryptedDir, row.archivo_encriptado);
  if (sqlPath && fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
  if (encPath && fs.existsSync(encPath)) fs.unlinkSync(encPath);
}

async function applyRetention() {
  if (!env.retentionDays || env.retentionDays <= 0) return;
  const t = qualifiedMetadata('versiones_bd');
  const rows = await queryMetadata(
    `SELECT * FROM ${t} WHERE fecha_backup < DATE_SUB(NOW(), INTERVAL ? DAY) ORDER BY version_id`,
    [env.retentionDays]
  );
  for (const row of rows) {
    await deleteVersionFiles(row);
    await runMetadata(`DELETE FROM ${t} WHERE version_id = ?`, [row.version_id]);
    await logSistema({
      tipo: 'CLEANUP',
      mensaje: `Versión ${row.version_nombre} eliminada por retención`,
      version_id: row.version_id,
    });
  }
}

async function prepareDownload(versionId, format = 'enc') {
  const row = await assertVersionRestorable(versionId);

  const encPath = resolveStoredFile(encryptedDir, row.archivo_encriptado);
  const sqlPath = resolveStoredFile(backupsDir, row.archivo_backup);
  const sqlName = path.basename(row.archivo_backup || `backup_${row.version_nombre}.sql`);
  const encName = path.basename(row.archivo_encriptado || `${sqlName}.enc`);

  if (format === 'sql') {
    if (sqlPath && fs.existsSync(sqlPath)) {
      return {
        path: sqlPath,
        filename: sqlName,
        contentType: 'application/sql',
        version_nombre: row.version_nombre,
        cleanup: null,
      };
    }
    if (encPath && fs.existsSync(encPath)) {
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const decPath = path.join(tempDir, `export_${versionId}_${Date.now()}.sql`);
      decryptFile(encPath, decPath, env.encryptionKey);
      return {
        path: decPath,
        filename: sqlName,
        contentType: 'application/sql',
        version_nombre: row.version_nombre,
        cleanup: () => {
          if (fs.existsSync(decPath)) fs.unlinkSync(decPath);
        },
      };
    }
    const e = new Error('Archivos de respaldo no encontrados en disco');
    e.status = 404;
    throw e;
  }

  if (!encPath || !fs.existsSync(encPath)) {
    const e = new Error('Archivo cifrado no encontrado en disco');
    e.status = 404;
    throw e;
  }

  return {
    path: encPath,
    filename: encName,
    contentType: 'application/octet-stream',
    version_nombre: row.version_nombre,
    cleanup: null,
  };
}

async function reconcileStuckBackups() {
  const t = qualifiedMetadata('versiones_bd');
  const stuck = await queryMetadata(
    `SELECT version_id, version_nombre FROM ${t} WHERE estado = 'pendiente' AND fecha_backup < DATE_SUB(NOW(), INTERVAL 2 MINUTE)`,
    []
  );
  for (const row of stuck) {
    await runMetadata(`UPDATE ${t} SET estado = 'error' WHERE version_id = ?`, [row.version_id]);
    await logSistema({
      tipo: 'ERROR',
      mensaje: `Respaldo ${row.version_nombre} marcado como error (quedó pendiente tras interrupción)`,
      version_id: row.version_id,
    });
  }
  return stuck.length;
}

/** Tras restaurar: conserva el catálogo de otras versiones y quita solo la consumida. */
async function finalizeRestoreCatalog(consumedVersionId, preservedRows, consumedRow) {
  const t = qualifiedMetadata('versiones_bd');
  const ids = (preservedRows || []).map((r) => r.version_id);

  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await runMetadata(`DELETE FROM ${t} WHERE version_id NOT IN (${placeholders})`, ids);
  } else {
    await runMetadata(`DELETE FROM ${t}`);
  }

  for (const row of preservedRows || []) {
    await runMetadata(
      `INSERT INTO ${t}
        (version_id, version_nombre, fecha_backup, descripcion, archivo_backup, archivo_encriptado, tamano_archivo_mb, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         version_nombre = VALUES(version_nombre),
         fecha_backup = VALUES(fecha_backup),
         descripcion = VALUES(descripcion),
         archivo_backup = VALUES(archivo_backup),
         archivo_encriptado = VALUES(archivo_encriptado),
         tamano_archivo_mb = VALUES(tamano_archivo_mb),
         estado = VALUES(estado)`,
      [
        row.version_id,
        row.version_nombre,
        row.fecha_backup,
        row.descripcion,
        row.archivo_backup,
        row.archivo_encriptado,
        row.tamano_archivo_mb,
        row.estado,
      ]
    );
  }

  const consumed = consumedRow || (await getBackupById(consumedVersionId));
  if (consumed) deleteVersionFiles(consumed);
  await runMetadata(`DELETE FROM ${t} WHERE version_id = ?`, [consumedVersionId]);

  await logSistema({
    tipo: 'RESTORE',
    mensaje: `Versión ${consumed?.version_nombre || consumedVersionId} retirada del catálogo tras restauración`,
    version_id: null,
    detalle: { consumedVersionId, preservedCount: preservedRows?.length || 0 },
  });
}

module.exports = {
  createBackup,
  listBackups,
  getBackupById,
  prepareDownload,
  assertVersionRestorable,
  isBackupRunning,
  applyRetention,
  reconcileStuckBackups,
  reconcileVersionsWithValidFiles,
  purgeVersionsWithoutFiles,
  syncBackupCatalog,
  finalizeRestoreCatalog,
  versionFilesExist,
  enrichVersion,
  resolveStoredFile,
  backupsDir,
  encryptedDir,
};
