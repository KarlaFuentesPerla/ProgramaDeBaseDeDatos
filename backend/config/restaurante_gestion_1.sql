-- Base: restaurante_gestion_1 (negocio + metadatos de respaldos)
-- Ejecutar en MySQL. En .env: BACKUP_TARGET_DATABASE y METADATA_DATABASE = restaurante_gestion_1

CREATE DATABASE IF NOT EXISTS restaurante_gestion_1
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE restaurante_gestion_1;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS pagos;
DROP TABLE IF EXISTS detalle_orden;
DROP TABLE IF EXISTS ordenes;
DROP TABLE IF EXISTS platillos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS mesas;
DROP TABLE IF EXISTS clientes_lealtad;
DROP TABLE IF EXISTS empleados;
DROP TABLE IF EXISTS logs_sistema;
DROP TABLE IF EXISTS versiones_bd;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE versiones_bd (
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

CREATE TABLE logs_sistema (
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

CREATE TABLE empleados (
  empleado_id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  cargo VARCHAR(80) NOT NULL,
  telefono VARCHAR(24) NULL,
  correo VARCHAR(120) NULL,
  fecha_contratacion DATE NULL,
  salario DECIMAL(10,2) NULL,
  estado ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (empleado_id),
  UNIQUE KEY uq_empleado_correo (correo),
  KEY idx_empleado_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clientes_lealtad (
  cliente_id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  telefono VARCHAR(24) NOT NULL,
  correo VARCHAR(120) NULL,
  puntos INT NOT NULL DEFAULT 0,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nivel ENUM('Bronce', 'Plata', 'Oro') NOT NULL DEFAULT 'Bronce',
  estado ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
  PRIMARY KEY (cliente_id),
  UNIQUE KEY uq_cliente_telefono (telefono),
  UNIQUE KEY uq_cliente_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mesas (
  mesa_id INT NOT NULL AUTO_INCREMENT,
  numero_mesa INT NOT NULL,
  capacidad INT NOT NULL,
  estado ENUM('Disponible', 'Ocupada', 'Reservada') NOT NULL DEFAULT 'Disponible',
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (mesa_id),
  UNIQUE KEY uq_mesa_numero (numero_mesa),
  KEY idx_mesa_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE categorias (
  categoria_id INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT NULL,
  PRIMARY KEY (categoria_id),
  UNIQUE KEY uq_cat_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE platillos (
  platillo_id INT NOT NULL AUTO_INCREMENT,
  categoria_id INT NULL,
  nombre VARCHAR(160) NOT NULL,
  descripcion TEXT NULL,
  precio DECIMAL(10,2) NOT NULL,
  disponible TINYINT(1) NOT NULL DEFAULT 1,
  imagen_url VARCHAR(512) NULL,
  PRIMARY KEY (platillo_id),
  KEY idx_platillo_cat (categoria_id),
  CONSTRAINT fk_platillo_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias (categoria_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ordenes (
  orden_id INT NOT NULL AUTO_INCREMENT,
  mesa_id INT NOT NULL,
  empleado_id INT NOT NULL,
  cliente_id INT NULL,
  fecha_orden DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('Pendiente', 'Preparando', 'Servida', 'Pagada', 'Cancelada') NOT NULL DEFAULT 'Pendiente',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  impuesto DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (orden_id),
  KEY idx_orden_mesa (mesa_id),
  KEY idx_orden_empleado (empleado_id),
  CONSTRAINT fk_orden_mesa FOREIGN KEY (mesa_id) REFERENCES mesas (mesa_id),
  CONSTRAINT fk_orden_empleado FOREIGN KEY (empleado_id) REFERENCES empleados (empleado_id),
  CONSTRAINT fk_orden_cliente FOREIGN KEY (cliente_id) REFERENCES clientes_lealtad (cliente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE detalle_orden (
  detalle_id INT NOT NULL AUTO_INCREMENT,
  orden_id INT NOT NULL,
  platillo_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (detalle_id),
  CONSTRAINT fk_detalle_orden FOREIGN KEY (orden_id) REFERENCES ordenes (orden_id),
  CONSTRAINT fk_detalle_platillo FOREIGN KEY (platillo_id) REFERENCES platillos (platillo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pagos (
  pago_id INT NOT NULL AUTO_INCREMENT,
  orden_id INT NOT NULL,
  metodo_pago ENUM('Efectivo', 'Tarjeta', 'Transferencia', 'QR') NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (pago_id),
  CONSTRAINT fk_pago_orden FOREIGN KEY (orden_id) REFERENCES ordenes (orden_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO empleados (nombre, apellido, cargo, telefono, correo, fecha_contratacion, salario, estado) VALUES
('Ana', 'García', 'Gerente', '5551001', 'ana.garcia@rest.local', '2023-01-10', 42000.00, 'Activo'),
('Luis', 'Martínez', 'Mesero', '5551002', 'luis.m@rest.local', '2023-03-15', 18500.00, 'Activo'),
('Carmen', 'Ruiz', 'Cocinera', '5551003', 'carmen.r@rest.local', '2022-11-01', 22000.00, 'Activo'),
('Jorge', 'López', 'Mesero', '5551004', 'jorge.l@rest.local', '2021-06-20', 17500.00, 'Inactivo');

INSERT INTO clientes_lealtad (nombre, apellido, telefono, correo, puntos, nivel, estado) VALUES
('María', 'Hernández', '5552001', 'maria.h@mail.test', 120, 'Plata', 'Activo'),
('Pedro', 'Sánchez', '5552002', 'pedro.s@mail.test', 40, 'Bronce', 'Activo'),
('Laura', 'Díaz', '5552003', 'laura.d@mail.test', 300, 'Oro', 'Activo');

INSERT INTO mesas (numero_mesa, capacidad, estado) VALUES
(1, 2, 'Disponible'), (2, 4, 'Disponible'), (3, 4, 'Ocupada'), (4, 6, 'Reservada'),
(5, 2, 'Disponible'), (6, 8, 'Disponible'), (7, 4, 'Disponible'), (8, 4, 'Ocupada');

INSERT INTO categorias (nombre, descripcion) VALUES
('Entradas', 'Aperitivos y ensaladas'),
('Platos fuertes', 'Carnes, pescados y pastas'),
('Postres', 'Dulces y helados'),
('Bebidas', 'Refrescos, jugos y café');

INSERT INTO platillos (categoria_id, nombre, descripcion, precio, disponible) VALUES
(1, 'Ensalada César', 'Lechuga, pollo, parmesano', 95.00, 1),
(1, 'Crema de tomate', 'Sopa del día', 65.00, 1),
(2, 'Pasta Alfredo', 'Pasta con salsa cremosa', 145.00, 1),
(2, 'Filete a la pimienta', 'Res con guarnición', 220.00, 1),
(3, 'Flan napolitano', 'Postre tradicional', 55.00, 1),
(4, 'Agua fresca', '1 L', 35.00, 1);

INSERT INTO ordenes (mesa_id, empleado_id, cliente_id, estado, subtotal, impuesto, total) VALUES
(3, 2, 1, 'Pagada', 240.00, 38.40, 278.40),
(8, 2, 2, 'Servida', 145.00, 23.20, 168.20);

INSERT INTO detalle_orden (orden_id, platillo_id, cantidad, precio_unitario, subtotal) VALUES
(1, 1, 2, 95.00, 190.00), (1, 6, 2, 35.00, 70.00), (2, 3, 1, 145.00, 145.00);

INSERT INTO pagos (orden_id, metodo_pago, monto) VALUES (1, 'Tarjeta', 278.40);
