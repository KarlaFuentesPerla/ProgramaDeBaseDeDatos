import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { getLogs } from '../services/api.js';

export default function LogsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getLogs({ limit: 100 });
        setRows(res.data || []);
      } catch (e) {
        setError(e?.response?.data?.error || e.message || 'Error al cargar logs');
      }
    })();
  }, []);

  const columns = useMemo(
    () => [
      { key: 'fecha', label: 'Fecha', render: (r) => new Date(r.fecha).toLocaleString() },
      { key: 'tipo', label: 'Tipo', render: (r) => <StatusBadge status={r.tipo} /> },
      { key: 'mensaje', label: 'Mensaje' },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Logs" subtitle="Auditoria de respaldos, cifrado, restauracion y cron." />
      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div>
      ) : null}
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.log_id} />
    </div>
  );
}
