import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';
import client from '../api/client';
import {
  Download, FileText, RotateCcw, Loader2,
  TableProperties, CheckCircle2, ArrowLeft, AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

// ── Preview Table ─────────────────────────────────────────────────────────────
function PreviewTable({ columns, rows, dtypes }) {
  return (
    <div className="overflow-x-auto custom-scrollbar rounded-xl border border-border">
      <table className="min-w-full text-sm text-left">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 font-semibold text-foreground whitespace-nowrap"
                title={dtypes?.[col]}
              >
                <div className="flex flex-col gap-0.5">
                  <span>{col}</span>
                  <span className="font-mono text-[10px] text-muted-foreground font-normal">
                    {dtypes?.[col]}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                'border-b border-border/50 transition-colors',
                i % 2 === 0 ? 'bg-white' : 'bg-muted/20',
                'hover:bg-primary/5'
              )}
            >
              {columns.map((col) => (
                <td key={col} className="px-4 py-2.5 whitespace-nowrap text-foreground">
                  {row[col] === null || row[col] === undefined ? (
                    <span className="text-muted-foreground italic text-xs">null</span>
                  ) : (
                    String(row[col])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div className={cn(
      'bg-white rounded-xl border p-4 shadow-sm',
      accent ? 'border-accent/30 bg-accent/5' : 'border-border'
    )}>
      <div className="text-xs text-muted-foreground font-medium mb-1">{label}</div>
      <div className={cn('text-2xl font-bold', accent ? 'text-accent' : 'text-foreground')}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Export() {
  const navigate  = useNavigate();
  const { datasetId, datasetMeta, edaResult, problemStatuses, orderedProblems } = useSessionStore();

  const [preview,     setPreview]     = useState(null);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState(null);
  const [downloading, setDownloading] = useState(null); // 'latest' | 'raw'

  // Redirect if no session
  useEffect(() => {
    if (!datasetId) {
      navigate('/');
      return;
    }
    fetchPreview();
  }, [datasetId]); // eslint-disable-line

  const fetchPreview = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await client.get(`/api/datasets/${datasetId}/preview`, { params: { n: 15 } });
      setPreview(res.data);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger l'aperçu : " + (err.response?.data?.detail || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (version) => {
    setDownloading(version);
    try {
      const res = await client.get(`/api/datasets/${datasetId}/download`, {
        params:       { version },
        responseType: 'blob',
      });

      // Extract filename from Content-Disposition header
      const disposition = res.headers['content-disposition'] || '';
      const match        = disposition.match(/filename=(.+)/);
      const filename     = match ? match[1].replace(/"/g, '') : `dataset_${version}.csv`;

      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Erreur lors du téléchargement : ' + (err.response?.data?.detail || err.message));
    } finally {
      setDownloading(null);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const resolvedCount = Object.values(problemStatuses).filter(s => s === 'resolved').length;
  const skippedCount  = Object.values(problemStatuses).filter(s => s === 'skipped').length;
  const totalCount    = orderedProblems?.length || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">

      {/* Header */}
      <div className="bg-primary text-white rounded-2xl p-8 shadow-md">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Download className="w-8 h-8 opacity-80" />
              Export du Dataset
            </h1>
            <p className="text-white/80 max-w-2xl">
              Votre dataset a été nettoyé et transformé. Téléchargez-le pour commencer l'entraînement de votre modèle.
            </p>
          </div>
          <button
            onClick={() => navigate('/preprocessing')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="text-white/60 text-xs font-medium mb-1">Lignes (nettoyées)</div>
            <div className="text-2xl font-bold">
              {preview?.total_rows?.toLocaleString() ?? edaResult?.row_count?.toLocaleString() ?? '—'}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="text-white/60 text-xs font-medium mb-1">Colonnes</div>
            <div className="text-2xl font-bold">
              {preview?.columns?.length ?? edaResult?.col_count ?? '—'}
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="text-white/60 text-xs font-medium mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Problèmes résolus
            </div>
            <div className="text-2xl font-bold">{resolvedCount} / {totalCount}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="text-white/60 text-xs font-medium mb-1">Ignorés</div>
            <div className="text-2xl font-bold">{skippedCount}</div>
          </div>
        </div>
      </div>

      {/* Download section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Cleaned version */}
        <div className="bg-white rounded-2xl border border-accent/30 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Download className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Dataset nettoyé</h3>
              <p className="text-xs text-muted-foreground">Version avec toutes les transformations appliquées</p>
            </div>
          </div>
          <button
            id="btn-download-clean"
            onClick={() => handleDownload('latest')}
            disabled={downloading !== null}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 shadow-sm"
          >
            {downloading === 'latest'
              ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Téléchargement...</span></>
              : <><Download className="w-5 h-5" /><span>Télécharger (nettoyé)</span></>}
          </button>
        </div>

        {/* Raw version */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Dataset brut</h3>
              <p className="text-xs text-muted-foreground">Version originale avant toute transformation</p>
            </div>
          </div>
          <button
            id="btn-download-raw"
            onClick={() => handleDownload('raw')}
            disabled={downloading !== null}
            className="w-full flex items-center justify-center gap-2 bg-muted hover:bg-muted/80 text-foreground font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50"
          >
            {downloading === 'raw'
              ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Téléchargement...</span></>
              : <><FileText className="w-5 h-5" /><span>Télécharger (brut)</span></>}
          </button>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-lg text-primary flex items-center gap-2">
            <TableProperties className="w-5 h-5" />
            Aperçu des données nettoyées
            {preview && (
              <span className="text-sm font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                {preview.total_rows.toLocaleString()} lignes × {preview.columns.length} colonnes
              </span>
            )}
          </h2>
          <button
            onClick={fetchPreview}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <p className="text-sm">Chargement de l'aperçu...</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 bg-critical/5 border border-critical/20 rounded-xl text-critical">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          ) : preview ? (
            <>
              <PreviewTable
                columns={preview.columns}
                rows={preview.rows}
                dtypes={preview.dtypes}
              />
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Affichage des 15 premières lignes sur {preview.total_rows.toLocaleString()} au total.
              </p>
            </>
          ) : null}
        </div>
      </div>

      {/* Applied transformations summary */}
      {orderedProblems && orderedProblems.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <h2 className="font-bold text-lg text-primary mb-4">Récapitulatif du preprocessing</h2>
          <div className="space-y-2">
            {orderedProblems.map((prob, idx) => {
              const status = problemStatuses[idx];
              return (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border text-sm',
                    status === 'resolved' ? 'border-success/20 bg-success/5'   : '',
                    status === 'skipped'  ? 'border-muted bg-muted/30 opacity-60' : '',
                    status === 'pending'  ? 'border-warning/20 bg-warning/5'   : '',
                  )}
                >
                  {status === 'resolved' && <CheckCircle2 className="w-4 h-4 text-success shrink-0" />}
                  {status === 'skipped'  && <RotateCcw    className="w-4 h-4 text-muted-foreground shrink-0" />}
                  {status === 'pending'  && <AlertCircle  className="w-4 h-4 text-warning shrink-0" />}
                  <span className="font-medium text-foreground">
                    {prob.column ? `[${prob.column}] ` : '[Global] '}
                    {prob.category}
                  </span>
                  <span className="text-muted-foreground text-xs ml-auto capitalize">{status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
