# Guía de archivos del proyecto

Sistema de **respaldos versionados** de MySQL y **gestión de restaurante** (mesas, órdenes, platillos, pagos). El backend expone una API REST; el frontend es un panel en React.

---

## Raíz del repositorio

| Archivo / carpeta | Qué hace |
|-------------------|----------|
| `README.md` | Descripción breve del repositorio en GitHub. |
| `.gitignore` | Indica a Git qué no versionar: `node_modules`, `.env`, respaldos `.sql`/`.enc`, logs, `dist`, caché, etc. |
| `.env` | Variables de entorno compartidas (opcional). Suele duplicar o complementar `backend/.env`. **No se sube a Git.** |
| `ARCHIVOS-DEL-PROYECTO.md` | Este documento: explicación archivo por archivo. |
| `backend/` | API Node.js + Express + MySQL. |
| `frontend/` | Interfaz web con Vite + React + Tailwind. |

---

## Backend (`backend/`)

### Configuración y arranque

| Archivo | Qué hace |
|---------|----------|
| `package.json` | Dependencias del API (`express`, `mysql2`, `cors`, `dotenv`, `node-cron`) y scripts: `npm start`, `npm run dev` (reinicio con `--watch`), `npm run dev:stable` (sin watch). |
| `package-lock.json` | Versiones exactas de dependencias instaladas por npm. |
| `.env` | Configuración real: puerto, MySQL, bases de datos, clave de cifrado, rutas de `mysqldump`/`mysql`, cron y retención. **No se sube a Git.** |
| `.env.example` | Plantilla de `.env` con todas las variables documentadas para copiar y completar. |
| `server.js` | Punto de entrada: crea Express, CORS, rutas `/api/*`, manejo de errores, inicia cron de respaldos, escucha en el puerto y al arrancar sincroniza el catálogo de versiones (limpia huérfanos). |
| `config/env.js` | Carga `.env` (raíz y `backend/`), valida variables obligatorias y expone el objeto `env` (puerto, MySQL, bases, clave AES, retención, rutas de binarios). |
| `config/db.js` | Pool de conexiones MySQL y helpers: `queryMetadata`, `runMetadata`, `queryTarget`, `qualifiedMetadata()` para tablas de metadatos. |
| `config/schema.sql` | Script mínimo solo para tablas de metadatos (`versiones_bd`, `logs_sistema`) si no usas el SQL completo del restaurante. |
| `config/restaurante_gestion_1.sql` | Script completo: crea la base, tablas de negocio (empleados, mesas, órdenes, platillos, etc.) y tablas de respaldos/logs. Es la referencia principal del esquema. |

### Rutas (`backend/routes/`)

Definen las URLs y delegan en los controladores.

| Archivo | Qué hace |
|---------|----------|
| `routes/backups.js` | `GET /` listar versiones · `POST /create` crear respaldo · `POST /restore/:id` restaurar · `GET /:id/download` exportar · `POST /sync-catalog` sincronizar catálogo. |
| `routes/logs.js` | `GET /` listar logs del sistema con paginación/filtros. |
| `routes/dashboard.js` | `GET /` métricas agregadas para el panel principal. |
| `routes/config.js` | `GET /` configuración visible para la pantalla de ajustes (sin secretos). |
| `routes/gestion.js` | CRUD y consultas de restaurante: categorías, platillos, mesas, empleados, clientes, órdenes, pagos. |

### Controladores (`backend/controllers/`)

Reciben `req`/`res`, validan parámetros y llaman a los servicios.

| Archivo | Qué hace |
|---------|----------|
| `controllers/backupController.js` | Lista respaldos, crea, restaura, descarga archivos (stream) y sincroniza catálogo. |
| `controllers/logsController.js` | Devuelve entradas de `logs_sistema` para la UI de logs. |
| `controllers/dashboardController.js` | Responde con KPIs y actividad reciente del dashboard. |
| `controllers/configController.js` | Expone datos de configuración seguros para el frontend. |
| `controllers/gestionController.js` | Puente HTTP hacia `gestionService` (órdenes, mesas, platillos, etc.). |

### Servicios (`backend/services/`)

Lógica de negocio principal.

| Archivo | Qué hace |
|---------|----------|
| `services/backupService.js` | Crea respaldos con `mysqldump`, cifra a `.enc`, registra en `versiones_bd`, retención por días, limpieza de versiones sin archivo, reconciliación de estados, listado enriquecido (`puede_restaurar`, días restantes) y `finalizeRestoreCatalog` (tras restaurar conserva otras versiones y quita solo la consumida). |
| `services/restoreService.js` | Descifra el respaldo, importa SQL a la base objetivo, preserva el catálogo de versiones más nuevas y elimina la versión restaurada del listado y del disco. |
| `services/cronService.js` | Programa respaldos automáticos con `node-cron` según `CRON_SCHEDULE` en `.env`. |
| `services/dashboardService.js` | Calcula totales: respaldos, restauraciones, almacenamiento, propinas, actividad reciente, etc. |
| `services/configService.js` | Arma el objeto de configuración para mostrar en ajustes. |
| `services/gestionService.js` | Reglas del restaurante: órdenes, estados, propina 10%, liberar mesas, sincronizar mesas sin orden activa, CRUD de platillos. |

### Utilidades (`backend/utils/`)

| Archivo | Qué hace |
|---------|----------|
| `utils/encryption.js` | Cifrado y descifrado AES-256-GCM de archivos de respaldo (`.sql` → `.enc`). |
| `utils/logger.js` | Escribe en `logs_sistema` (MySQL) y en archivos diarios bajo `backend/logs/`. |
| `utils/resolveMysqlBinaries.js` | Resuelve rutas de `mysqldump` y `mysql` en Windows/Linux si no están en `.env`. |

### Middleware

| Archivo | Qué hace |
|---------|----------|
| `middleware/errorHandler.js` | `notFoundHandler` para rutas inexistentes y `errorHandler` centralizado (códigos HTTP y mensajes JSON). |

### Carpetas de datos en tiempo de ejecución (backend)

| Carpeta / archivo | Qué hace |
|-------------------|----------|
| `backups/` | Archivos `.sql` en claro generados por `mysqldump` (ignorados por Git salvo que existan localmente). |
| `encrypted/` | Copias cifradas `.enc` de cada respaldo. |
| `temp/` | SQL temporal al descifrar durante restauración o descarga; se borra al terminar. |
| `logs/` | Archivos de log por fecha (`app-YYYY-MM-DD.log`). `.gitkeep` mantiene la carpeta en el repo vacía. |

---

## Frontend (`frontend/`)

### Configuración y build

| Archivo | Qué hace |
|---------|----------|
| `package.json` | Dependencias React, React Router, Axios, Vite, Tailwind; scripts `dev`, `build`, `preview`. |
| `package-lock.json` | Versiones fijas de dependencias del frontend. |
| `index.html` | HTML base con `<div id="root">` donde React monta la app. |
| `vite.config.js` | Configuración de Vite: plugin React, proxy opcional al backend, puerto de desarrollo. |
| `tailwind.config.js` | Tema y rutas de contenido para clases de Tailwind. |
| `postcss.config.js` | Pipeline PostCSS (Tailwind + Autoprefixer). |
| `.env` (opcional) | Por ejemplo `VITE_API_URL` si el API no está en el mismo origen. **No se sube a Git.** |

### Código fuente (`frontend/src/`)

| Archivo | Qué hace |
|---------|----------|
| `main.jsx` | Arranque de React: `BrowserRouter`, import de estilos globales y montaje en `#root`. |
| `App.jsx` | Definición de rutas: dashboard, versiones, logs, restauración, ajustes, gestión. |
| `index.css` | Estilos globales y directivas `@tailwind` (base, components, utilities). |
| `services/api.js` | Cliente Axios hacia el backend: dashboard, respaldos, restaurar, descargar, logs, gestión, helpers de errores. |
| `layouts/AdminLayout.jsx` | Marco de la app: barra lateral, cabecera y `<Outlet />` para las páginas hijas. |
| `components/SidebarNav.jsx` | Menú lateral con enlaces a cada sección. |
| `components/PageHeader.jsx` | Título y subtítulo reutilizable en páginas. |
| `components/DataTable.jsx` | Tabla genérica con columnas configurables y render personalizado. |
| `components/KpiCard.jsx` | Tarjeta de indicador (número + etiqueta + hint) en el dashboard. |
| `components/StatusBadge.jsx` | Badge de color según estado (`completado`, `error`, `pendiente`, tipos de log, etc.). |
| `components/PlatillosCatalog.jsx` | UI para listar, crear y editar platillos del catálogo. |
| `pages/DashboardPage.jsx` | Panel principal: KPIs, última versión, actividad reciente, acceso rápido a crear respaldo. |
| `pages/VersionsPage.jsx` | Lista de versiones, crear respaldo manual y exportar `.enc` / `.sql`. |
| `pages/RestorePage.jsx` | Selector de versiones restaurables y botón para restaurar (con confirmación). |
| `pages/LogsPage.jsx` | Tabla paginada de logs del sistema. |
| `pages/SettingsPage.jsx` | Muestra configuración del servidor (bases, retención, cron, etc.). |
| `pages/GestionPage.jsx` | Módulo de operación del restaurante: mesas, órdenes, platillos, empleados, pagos. |

### Salida de build

| Carpeta | Qué hace |
|---------|----------|
| `frontend/dist/` | Sitio estático generado por `npm run build` (ignorado por Git). |

---

## Archivos que no están en Git pero son importantes

| Elemento | Qué hace |
|----------|----------|
| `node_modules/` (raíz, `backend/`, `frontend/`) | Dependencias instaladas por `npm install`. |
| `backend/.env` | Credenciales y configuración real del servidor. |
| Respaldos en `backups/` y `encrypted/` | Copias de la base; viven en disco hasta retención o consumo al restaurar. |
| Logs `backend/logs/*.log` | Traza de operaciones en archivo. |

---

## Flujo resumido entre piezas clave

1. **Crear respaldo:** `VersionsPage` → `api.js` → `backupController` → `backupService` → `mysqldump` + cifrado → fila en `versiones_bd`.
2. **Restaurar:** `RestorePage` → `restoreService` → import MySQL → `finalizeRestoreCatalog` (mantener v21, v22; quitar v20).
3. **Gestión restaurante:** `GestionPage` → rutas `/api/gestion/*` → `gestionService` → tablas de negocio en MySQL.
4. **Automático:** `cronService` dispara `createBackup` según horario en `.env`.

---

## Cómo arrancar (referencia rápida)

```bash
# Terminal 1 — API (puerto 4000)
cd backend
npm install
# Copiar .env.example → .env y completar
npm run dev:stable

# Terminal 2 — UI (puerto 5173)
cd frontend
npm install
npm run dev
```

Ejecutar en MySQL el script `backend/config/restaurante_gestion_1.sql` antes de usar la app si la base aún no existe.
