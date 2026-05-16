const fs = require('fs');
const path = require('path');

function existsFile(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function findInWindowsCommon() {
  const bases = [
    'C:\\Program Files\\MySQL',
    'C:\\Program Files (x86)\\MySQL',
    'C:\\xampp\\mysql',
    'C:\\laragon\\bin\\mysql',
    'C:\\wamp64\\bin\\mysql',
  ];
  for (const base of bases) {
    if (!fs.existsSync(base)) continue;
    let dirs = [];
    try {
      dirs = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(base, d.name));
    } catch {
      dirs = [base];
    }
    for (const dir of dirs) {
      const dump = path.join(dir, 'bin', 'mysqldump.exe');
      const mysql = path.join(dir, 'bin', 'mysql.exe');
      if (existsFile(dump) && existsFile(mysql)) {
        return { mysqldump: dump, mysql, source: 'windows_auto' };
      }
    }
    const dump = path.join(base, 'bin', 'mysqldump.exe');
    const mysql = path.join(base, 'bin', 'mysql.exe');
    if (existsFile(dump) && existsFile(mysql)) {
      return { mysqldump: dump, mysql, source: 'windows_auto' };
    }
  }
  return null;
}

function resolveMysqlPaths(processEnv) {
  const dumpEnv = processEnv.MYSQLDUMP_PATH && String(processEnv.MYSQLDUMP_PATH).trim();
  const mysqlEnv = processEnv.MYSQL_CLI_PATH && String(processEnv.MYSQL_CLI_PATH).trim();

  if (dumpEnv && mysqlEnv && existsFile(dumpEnv) && existsFile(mysqlEnv)) {
    return { mysqldump: dumpEnv, mysql: mysqlEnv, source: 'env' };
  }

  if (dumpEnv && existsFile(dumpEnv)) {
    const dir = path.dirname(dumpEnv);
    const mysql = path.join(dir, 'mysql.exe');
    if (existsFile(mysql)) {
      return { mysqldump: dumpEnv, mysql, source: 'env_mysqldump_dir' };
    }
  }

  if (mysqlEnv && existsFile(mysqlEnv)) {
    const dir = path.dirname(mysqlEnv);
    const dump = path.join(dir, 'mysqldump.exe');
    if (existsFile(dump)) {
      return { mysqldump: dump, mysql: mysqlEnv, source: 'env_mysql_dir' };
    }
  }

  if (process.platform === 'win32') {
    const found = findInWindowsCommon();
    if (found) return found;
  }

  return { mysqldump: 'mysqldump', mysql: 'mysql', source: 'path_fallback' };
}

module.exports = { resolveMysqlPaths };
