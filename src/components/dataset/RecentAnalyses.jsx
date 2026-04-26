import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Database, RotateCcw, Play, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import client from '../../api/client';
import { useSessionStore } from '../../store/sessionStore';
import { cn } from '../../lib/utils';

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function RecentAnalyses() {
  const navigate = useNavigate();
  const { sessionUUID, setDatasetId, setDatasetMeta, setAnalysisResults } = useSessionStore();

  const [datasets,    setDatasets]    = useState([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [resumingId,  setResumingId]  = useState(null);  // id en cours de chargement
  const [resumeMode,  setResumeMode]  = useState(null);  // 'current' | 'original'
  const [error,       setError]       = useState(null);

  // ── Fetch history ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionUUID) {
      setIsLoading(false);
      return;
    }
    fetchRecent();
  }, [sessionUUID]); // eslint-disable-line

  const fetchRecent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await client.get('/api/datasets/');
      setDatasets(res.data);
    } catch (err) {
      // Session inconnue ou pas encore de datasets → silencieux
      if (err.response?.status !== 404 && err.response?.status !== 422) {
        setError('Impossible de charger l\'historique.');
      }
      setDatasets([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resume analysis ──────────────────────────────────────────────────────────
  const handleResume = async (dataset, mode) => {
    // mode: 'current' → analyse sur s3_key_latest
    //       'original' → reset vers s3_key_raw puis analyse
    setResumingId(dataset.id);
    setResumeMode(mode);
    setError(null);

    try {
      // 1. Reset si besoin
      if (mode === 'original') {
        await client.post(`/api/datasets/${dataset.id}/reset`);
      }

      // 2. Mettre à jour Zustand avec les métadonnées du dataset sélectionné
      setDatasetId(dataset.id);
      setDatasetMeta({
        id:           dataset.id,
        name:         dataset.name,
        row_count:    dataset.row_count,
        columns:      Array.isArray(dataset.columns) ? dataset.columns : [],
        target_column: dataset.target_column,
        task_type:    dataset.task_type,
      });

      // 3. Relancer l'analyse complète (EDA + Diagnostic + LLM)
      const res = await client.post(`/api/analyze/${dataset.id}`);
      setAnalysisResults(res.data);

      // 4. Naviguer vers EDA
      navigate('/eda');
    } catch (err) {
      console.error(err);
      setError(
        'Erreur lors de la reprise : ' +
        (err.response?.data?.detail || err.message)
      );
    } finally {
      setResumingId(null);
      setResumeMode(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-6 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Chargement de l'historique...</span>
      </div>
    );
  }

  if (!sessionUUID || datasets.length === 0) return null;

  const isBusy = resumingId !== null;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="w-4 h-4" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          Analyses récentes
        </h2>
        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{datasets.length}</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-critical bg-critical/5 border border-critical/20 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {datasets.map((ds) => {
          const isThisLoading = resumingId === ds.id;
          const hasTransformed = ds.is_transformed;

          return (
            <div
              key={ds.id}
              className={cn(
                'bg-white border border-border rounded-xl p-4 transition-all',
                isBusy && !isThisLoading ? 'opacity-50 pointer-events-none' : '',
                isThisLoading ? 'border-accent/40 shadow-sm' : 'hover:border-primary/30 hover:shadow-sm'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                  hasTransformed ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary-mid'
                )}>
                  <Database className="w-4 h-4" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate max-w-[220px]" title={ds.name}>
                      {ds.name}
                    </h3>
                    {hasTransformed && (
                      <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full border border-accent/20 shrink-0">
                        Transformé
                      </span>
                    )}
                    {ds.task_type && (
                      <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize shrink-0">
                        {ds.task_type}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>{ds.row_count?.toLocaleString()} lignes</span>
                    <span>·</span>
                    <span>{ds.col_count} colonnes</span>
                    <span>·</span>
                    <span>{formatBytes(ds.file_size)}</span>
                    {ds.target_column && (
                      <>
                        <span>·</span>
                        <span>Cible : <strong className="text-foreground">{ds.target_column}</strong></span>
                      </>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(ds.created_at)}
                    {ds.expires_at && (
                      <span className="ml-2 text-warning/80">
                        · expire le {formatDate(ds.expires_at)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  {/* Continuer (version actuelle / transformée) */}
                  <button
                    id={`resume-current-${ds.id}`}
                    onClick={() => handleResume(ds, 'current')}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-mid transition-colors disabled:opacity-50"
                    title={hasTransformed ? 'Reprendre depuis la version transformée' : 'Relancer l\'analyse'}
                  >
                    {isThisLoading && resumeMode === 'current'
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Play className="w-3.5 h-3.5" />}
                    <span>{hasTransformed ? 'Continuer' : 'Analyser'}</span>
                    <ChevronRight className="w-3 h-3 opacity-60" />
                  </button>

                  {/* Reprendre depuis l'original (seulement si transformé) */}
                  {hasTransformed && (
                    <button
                      id={`resume-raw-${ds.id}`}
                      onClick={() => handleResume(ds, 'original')}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                      title="Réinitialiser et analyser depuis le fichier original"
                    >
                      {isThisLoading && resumeMode === 'original'
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RotateCcw className="w-3.5 h-3.5" />}
                      <span>Depuis l'original</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Loading progress indicator */}
              {isThisLoading && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-accent">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>
                      {resumeMode === 'original'
                        ? 'Réinitialisation puis analyse en cours...'
                        : 'Relance de l\'analyse IA (EDA + Diagnostic)...'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
