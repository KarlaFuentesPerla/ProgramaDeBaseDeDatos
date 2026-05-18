import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

/** Mensaje legible desde errores de axios (JSON, blob o red). */
export async function getApiErrorMessage(error, fallback = 'Error en la solicitud') {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (data instanceof Blob) {
    try {
      const json = JSON.parse(await data.text());
      return json.error || json.message || fallback;
    } catch {
      return fallback;
    }
  }
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
    return 'No se pudo conectar al backend. Inicia el servidor en la carpeta backend (puerto 4000).';
  }
  if (error?.response?.status === 409) {
    return data?.error || 'Ya hay un respaldo en curso. Espera unos segundos e intenta de nuevo.';
  }
  return error?.message || fallback;
}

export async function getDashboard() {
  const { data } = await api.get('/api/dashboard');
  return data.data;
}

export async function getBackups(params) {
  const { data } = await api.get('/api/backups', { params });
  return data.data;
}

export async function getRestorableBackups() {
  const { data } = await api.get('/api/backups', { params: { restorable: true } });
  return { versions: data.data || [], retentionDays: data.retention_days ?? 0 };
}

export async function createBackup(payload) {
  const { data } = await api.post('/api/backups/create', payload || {});
  return data.data;
}

export async function restoreBackup(versionId) {
  const { data } = await api.post(`/api/backups/restore/${versionId}`);
  return data.data;
}

function parseFilenameFromDisposition(header) {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) return decodeURIComponent(utf8[1]);
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : null;
}

/** Descarga un respaldo (.enc por defecto, o .sql con format=sql). */
export async function downloadBackup(versionId, format = 'enc') {
  const response = await api.get(`/api/backups/${versionId}/download`, {
    params: { format },
    responseType: 'blob',
  });
  const name =
    parseFilenameFromDisposition(response.headers['content-disposition']) ||
    `backup_v${versionId}.${format === 'sql' ? 'sql' : 'enc'}`;
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function getLogs(params) {
  const { data } = await api.get('/api/logs', { params });
  return data;
}

export async function getConfig() {
  const { data } = await api.get('/api/config');
  return data.data;
}

export async function getMesas() {
  const { data } = await api.get('/api/gestion/mesas');
  return data.data;
}

export async function patchMesaEstado(mesaId, estado) {
  const { data } = await api.patch(`/api/gestion/mesas/${mesaId}`, { estado });
  return data.data;
}

export async function getEmpleados() {
  const { data } = await api.get('/api/gestion/empleados');
  return data.data;
}

export async function patchEmpleadoEstado(empleadoId, estado) {
  const { data } = await api.patch(`/api/gestion/empleados/${empleadoId}`, { estado });
  return data.data;
}

export async function getCategoriasGestion() {
  const { data } = await api.get('/api/gestion/categorias');
  return data.data;
}

export async function getPlatillosGestion() {
  const { data } = await api.get('/api/gestion/platillos');
  return data.data;
}

export async function postPlatillo(payload) {
  const { data } = await api.post('/api/gestion/platillos', payload);
  return data.data;
}

export async function patchPlatillo(platilloId, payload) {
  const { data } = await api.patch(`/api/gestion/platillos/${platilloId}`, payload);
  return data.data;
}

export async function getClientesGestion() {
  const { data } = await api.get('/api/gestion/clientes');
  return data.data;
}

export async function getOrdenes() {
  const { data } = await api.get('/api/gestion/ordenes');
  return data.data;
}

export async function getOrdenDetalle(ordenId) {
  const { data } = await api.get(`/api/gestion/ordenes/${ordenId}`);
  return data.data;
}

export async function postOrden(payload) {
  const { data } = await api.post('/api/gestion/ordenes', payload);
  return data.data;
}

export async function patchOrdenEstado(ordenId, estado) {
  const { data } = await api.patch(`/api/gestion/ordenes/${ordenId}/estado`, { estado });
  return data.data;
}

export async function postOrdenPago(ordenId, payload) {
  const { data } = await api.post(`/api/gestion/ordenes/${ordenId}/pagos`, payload);
  return data.data;
}
