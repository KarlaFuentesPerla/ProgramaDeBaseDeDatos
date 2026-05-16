const mysql = require('mysql2/promise');
const { env } = require('./env');

const pool = mysql.createPool({
  host: env.mysql.host,
  port: env.mysql.port,
  user: env.mysql.user,
  password: env.mysql.password,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: false,
});

function qualifiedMetadata(table) {
  const db = env.metadataDatabase.replace(/`/g, '``');
  return `\`${db}\`.\`${table}\``;
}

function qualifiedTarget(table) {
  const db = env.backupTargetDatabase.replace(/`/g, '``');
  return `\`${db}\`.\`${table}\``;
}

function normalizeParams(params) {
  if (params === undefined || params === null) return [];
  if (Array.isArray(params)) return params;
  return [];
}

async function queryMetadata(sql, params) {
  const [rows] = await pool.execute(sql, normalizeParams(params));
  return rows;
}

async function runMetadata(sql, params) {
  const [result] = await pool.execute(sql, normalizeParams(params));
  return result;
}

async function queryTarget(sql, params) {
  const [rows] = await pool.execute(sql, normalizeParams(params));
  return rows;
}

async function runTarget(sql, params) {
  const [result] = await pool.execute(sql, normalizeParams(params));
  return result;
}

module.exports = {
  pool,
  queryMetadata,
  runMetadata,
  queryTarget,
  runTarget,
  qualifiedMetadata,
  qualifiedTarget,
};
