const path = require('path');
const dotenv = require('dotenv');
const { resolveMysqlPaths } = require('../utils/resolveMysqlBinaries');

const envRepoRoot = path.join(__dirname, '..', '..', '.env');
const envBackend = path.join(__dirname, '..', '.env');

dotenv.config({ path: envRepoRoot, override: true });
dotenv.config({ path: envBackend, override: true });

function requireEnv(name) {
  const v = process.env[name];
  if (v === undefined || v === null || String(v).trim() === '') {
    throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  }
  return String(v).trim();
}

function parseEncryptionKey(raw) {
  const s = String(raw).trim();
  if (/^[0-9a-fA-F]{64}$/.test(s)) {
    return Buffer.from(s, 'hex');
  }
  try {
    const b = Buffer.from(s, 'base64');
    if (b.length === 32) return b;
  } catch (_) {
    /* ignore */
  }
  throw new Error('ENCRYPTION_KEY debe ser 32 bytes en hex (64 chars) o base64 válido de 32 bytes');
}

const _mysqlBins = resolveMysqlPaths(process.env);

const env = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mysqldumpPath: _mysqlBins.mysqldump,
  mysqlCliPath: _mysqlBins.mysql,
  mysqlBinariesResolution: _mysqlBins.source,
  mysql: {
    host: requireEnv('MYSQL_HOST'),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: requireEnv('MYSQL_USER'),
    password: process.env.MYSQL_PASSWORD != null ? String(process.env.MYSQL_PASSWORD) : '',
  },
  backupTargetDatabase: requireEnv('BACKUP_TARGET_DATABASE'),
  metadataDatabase: requireEnv('METADATA_DATABASE'),
  cronSchedule: process.env.CRON_SCHEDULE || '30 2 * * *',
  retentionDays: Math.max(0, parseInt(process.env.RETENTION_DAYS || '0', 10) || 0),
  encryptionKey: parseEncryptionKey(requireEnv('ENCRYPTION_KEY')),
  nodeEnv: process.env.NODE_ENV || 'development',
};

module.exports = { env, parseEncryptionKey };
