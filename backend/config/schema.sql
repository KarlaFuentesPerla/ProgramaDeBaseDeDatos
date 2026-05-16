-- Tablas de metadatos (si ya usas restaurante_gestion_1.sql completo, no hace falta ejecutar esto por separado)

CREATE TABLE IF NOT EXISTS versiones_bd (
  version_id INT NOT NULL AUTO_INCREMENT,
  version_nombre VARCHAR(32) NOT NULL,
  fecha_backup DATETIME NOT NULL,
  descripcion TEXT NULL,
  archivo_backup VARCHAR(512) NOT NULL,
  archivo_encriptado VARCHAR(512) NULL,
  tamano_archivo_mb DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado ENUM('completado', 'error', 'pendiente') NOT NULL DEFAULT 'pendiente',
  PRIMARY KEY (version_id),
  UNIQUE KEY uq_version_nombre (version_nombre),
  KEY idx_fecha_backup (fecha_backup)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS logs_sistema (
  log_id INT NOT NULL AUTO_INCREMENT,
  tipo VARCHAR(64) NOT NULL,
  mensaje TEXT NOT NULL,
  detalle JSON NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version_id INT NULL,
  PRIMARY KEY (log_id),
  KEY idx_fecha (fecha),
  KEY idx_tipo (tipo),
  CONSTRAINT fk_logs_version
    FOREIGN KEY (version_id) REFERENCES versiones_bd (version_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
