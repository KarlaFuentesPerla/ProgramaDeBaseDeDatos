const { queryMetadata, qualifiedMetadata } = require('../config/db');



async function getDashboard() {

  const tV = qualifiedMetadata('versiones_bd');

  const tL = qualifiedMetadata('logs_sistema');



  const countRows = await queryMetadata(

    `SELECT

       (SELECT COUNT(*) FROM ${tV}) AS total_versiones,

       (SELECT COUNT(*) FROM ${tV} WHERE estado = 'completado') AS completados,

       (SELECT COUNT(*) FROM ${tV} WHERE estado = 'error') AS errores,

       (SELECT COUNT(*) FROM ${tL}) AS total_logs`,

    []

  );



  const summaryRows = await queryMetadata(

    `SELECT

       (SELECT COUNT(*) FROM ${tV}) AS total_backups,

       (SELECT MAX(fecha_backup) FROM ${tV} WHERE estado = 'completado') AS ultima_fecha_respaldo,

       (SELECT COALESCE(SUM(tamano_archivo_mb), 0) FROM ${tV} WHERE estado = 'completado') AS almacenamiento_mb,

       (SELECT COUNT(*) FROM ${tL}

         WHERE UPPER(tipo) = 'RESTORE' AND mensaje LIKE '%completad%') AS restauraciones`,

    []

  );



  const lastErrorRows = await queryMetadata(

    `SELECT mensaje FROM ${tL} WHERE UPPER(tipo) = 'ERROR' ORDER BY log_id DESC LIMIT 1`,

    []

  );



  const last = await queryMetadata(`SELECT * FROM ${tV} ORDER BY version_id DESC LIMIT 1`, []);

  const recentLogs = await queryMetadata(

    `SELECT log_id, tipo, mensaje, fecha FROM ${tL} ORDER BY log_id DESC LIMIT 10`,

    []

  );



  const summary = summaryRows[0] || {};



  return {

    stats: countRows[0] || {},

    total_backups: summary.total_backups ?? 0,

    ultima_fecha_respaldo: summary.ultima_fecha_respaldo || null,

    almacenamiento_mb: Number(summary.almacenamiento_mb ?? 0),

    restauraciones: summary.restauraciones ?? 0,

    estado_sistema: 'Operativo',

    ultimo_error: lastErrorRows[0]?.mensaje || null,

    ultima_version: last[0] || null,

    logs_recientes: recentLogs,

  };

}



module.exports = { getDashboard };

