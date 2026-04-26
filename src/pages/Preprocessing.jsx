import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';
import client from '../api/client';
import {
  LayoutDashboard, CheckCircle2, Loader2, Sparkles,
  Code, Play, SkipForward, Download, AlertCircle, X
} from 'lucide-react';
import { cn } from '../lib/utils';

// ── Inline Toast ────────────────────────────────────────────────────────────
function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300',
      type === 'error'   ? 'bg-critical/10 border-critical/30 text-critical' : '',
      type === 'success' ? 'bg-success/10 border-success/30 text-success'   : '',
    )}>
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={onClose} className="shrink-0 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ statuses, total }) {
  const resolved = Object.values(statuses).filter(s => s === 'resolved').length;
  const pct       = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-muted-foreground">
        <span>{resolved} / {total} résolus</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Preprocessing() {
  const navigate = useNavigate();
  const {
    datasetId, orderedProblems, diagnosticResult,
    problemStatuses, updateProblemStatus, updateAfterExecution
  } = useSessionStore();

  const [selectedIndex,    setSelectedIndex]    = useState(null);
  const [recommendations,  setRecommendations]  = useState(null);
  const [isLoadingRecs,    setIsLoadingRecs]    = useState(false);
  const [isExecuting,      setIsExecuting]      = useState(false);
  const [customCode,       setCustomCode]       = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeIntent,       setCodeIntent]       = useState('');
  const [toast,            setToast]            = useState(null); // { message, type }

  useEffect(() => {
    if (!datasetId || !orderedProblems) navigate('/');
  }, [datasetId, orderedProblems, navigate]);

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type });
  }, []);

  // ── Computed ──────────────────────────────────────────────────────────────
  const resolvedCount = Object.values(problemStatuses).filter(s => s === 'resolved').length;
  const allDone       = orderedProblems && resolvedCount === orderedProblems.length;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getOriginalIndex = (problem) => {
    if (!diagnosticResult?.problems) return -1;
    return diagnosticResult.problems.findIndex(p =>
      p.column   === problem.column   &&
      p.category === problem.category &&
      p.description === problem.description
    );
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectProblem = async (index) => {
    setSelectedIndex(index);
    setRecommendations(null);
    setCustomCode('');
    setCodeIntent('');

    const problem       = orderedProblems[index];
    const originalIndex = getOriginalIndex(problem);
    if (originalIndex === -1) return;

    setIsLoadingRecs(true);
    try {
      const res = await client.post(`/api/recommend/${datasetId}`, { problem_index: originalIndex });
      setRecommendations(res.data);
    } catch (err) {
      console.error(err);
      showToast("Impossible de charger les recommandations : " + (err.response?.data?.detail || err.message));
    } finally {
      setIsLoadingRecs(false);
    }
  };

  const goToNextPending = useCallback((resolvedIdx) => {
    if (!orderedProblems) return;
    const next = orderedProblems.findIndex((_, i) =>
      problemStatuses[i] === 'pending' && i !== resolvedIdx
    );
    if (next !== -1) handleSelectProblem(next);
    else             setSelectedIndex(null);
  }, [orderedProblems, problemStatuses]); // eslint-disable-line

  const handleApplySolution = async (transformations) => {
    setIsExecuting(true);
    try {
      let lastResult = null;
      for (const transformation of transformations) {
        const res = await client.post(`/api/execute/${datasetId}`, transformation);
        lastResult = res.data;
      }
      if (lastResult) {
        updateAfterExecution({ eda: lastResult.eda, diagnostic: lastResult.diagnostic });
      }
      updateProblemStatus(selectedIndex, 'resolved');
      setRecommendations(null);
      showToast('Transformation appliquée avec succès !', 'success');
      goToNextPending(selectedIndex);
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'exécution : " + (err.response?.data?.detail || err.message));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSkip = () => {
    updateProblemStatus(selectedIndex, 'skipped');
    goToNextPending(selectedIndex);
  };

  const handleGenerateCode = async () => {
    if (selectedIndex === null) return;
    const problem       = orderedProblems[selectedIndex];
    const originalIndex = getOriginalIndex(problem);

    setIsGeneratingCode(true);
    try {
      const res = await client.post(`/api/recommend/${datasetId}/generate-code`, {
        problem_index: originalIndex,
        user_intent:   codeIntent,
      });
      setCustomCode(res.data.code || '');
      if (res.data.warning) showToast(res.data.warning, 'error');
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la génération : " + (err.response?.data?.detail || err.message));
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleExecuteCode = async () => {
    if (!customCode) return;
    setIsExecuting(true);
    try {
      const res = await client.post(`/api/execute/${datasetId}/code`, { code: customCode });
      updateAfterExecution({ eda: res.data.eda, diagnostic: res.data.diagnostic });
      updateProblemStatus(selectedIndex, 'resolved');
      setCustomCode('');
      setRecommendations(null);
      showToast('Code exécuté avec succès !', 'success');
      goToNextPending(selectedIndex);
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'exécution du code : " + (err.response?.data?.detail || err.message));
    } finally {
      setIsExecuting(false);
    }
  };

  if (!orderedProblems) return null;

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="space-y-4 animate-in fade-in duration-500 pb-12 h-[calc(100vh-8rem)] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-accent" />
              Diagnostic &amp; Preprocessing
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {allDone && (
              <button
                onClick={() => navigate('/export')}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Passer à l'export
              </button>
            )}
            <button
              onClick={() => navigate('/eda')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm"
            >
              <LayoutDashboard className="w-4 h-4 text-primary-mid" />
              Aperçu EDA
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl border border-border px-5 py-3 shadow-sm">
          <ProgressBar statuses={problemStatuses} total={orderedProblems.length} />
        </div>

        {/* Split screen */}
        <div className="flex gap-6 flex-1 min-h-0">

          {/* ── Left Panel ─────────────────────────────────────────────── */}
          <div className="w-1/3 bg-white rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                Plan d'action IA
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                  {orderedProblems.length} problèmes
                </span>
              </h2>
            </div>

            <div className="overflow-y-auto p-3 space-y-2 custom-scrollbar flex-1">
              {orderedProblems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <CheckCircle2 className="w-10 h-10 text-success mb-3" />
                  <p className="font-semibold text-foreground">Aucun problème détecté</p>
                  <p className="text-xs text-muted-foreground mt-1">Votre dataset est propre !</p>
                </div>
              ) : (
                orderedProblems.map((prob, idx) => {
                  const status     = problemStatuses[idx];
                  const isSelected = selectedIndex === idx;
                  const isSkipped  = status === 'skipped';
                  const isResolved = status === 'resolved';

                  let severityColor = 'bg-success/10 text-success border-success/20';
                  if (prob.severity === 'medium')   severityColor = 'bg-warning/10 text-warning border-warning/20';
                  if (prob.severity === 'critical')  severityColor = 'bg-critical/10 text-critical border-critical/20';

                  return (
                    <div
                      key={idx}
                      onClick={() => !isResolved && handleSelectProblem(idx)}
                      className={cn(
                        'p-3 rounded-lg border cursor-pointer transition-all',
                        isSelected  ? 'border-accent ring-1 ring-accent/20 bg-accent/5' : 'border-border hover:border-primary/30',
                        isResolved  ? 'opacity-50 grayscale cursor-not-allowed' : '',
                        isSkipped   ? 'opacity-60 italic' : '',
                      )}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border', severityColor)}>
                          {prob.severity}
                        </span>
                        {isResolved && <CheckCircle2 className="w-4 h-4 text-success" />}
                        {isSkipped  && <span className="text-[10px] text-muted-foreground font-medium">ignoré</span>}
                      </div>
                      <h3 className="font-medium text-sm text-foreground line-clamp-1" title={prob.category}>
                        {prob.column ? `${prob.column} (${prob.category})` : prob.category}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2" title={prob.description}>
                        {prob.description}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Right Panel ────────────────────────────────────────────── */}
          <div className="w-2/3 bg-white rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">

            {selectedIndex === null ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                {allDone ? (
                  <>
                    <CheckCircle2 className="w-14 h-14 mb-4 text-success" />
                    <h2 className="text-xl font-bold text-foreground mb-2">Tous les problèmes sont résolus !</h2>
                    <p className="text-sm max-w-md mb-6">Votre dataset est prêt. Vous pouvez maintenant l'exporter.</p>
                    <button
                      onClick={() => navigate('/export')}
                      className="bg-accent text-white px-6 py-3 rounded-xl font-semibold hover:bg-accent/90 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <Download className="w-5 h-5" />
                      Passer à l'export
                    </button>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-12 h-12 mb-4 text-primary/20" />
                    <h2 className="text-lg font-medium text-foreground mb-2">Sélectionnez un problème à résoudre</h2>
                    <p className="text-sm max-w-md">L'IA Copilot analysera le contexte et vous proposera les transformations les plus adaptées.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">

                {/* Problem header */}
                <div className="p-5 border-b border-border bg-muted/10 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-primary">
                      {orderedProblems[selectedIndex].column
                        ? `${orderedProblems[selectedIndex].column} — ${orderedProblems[selectedIndex].category}`
                        : orderedProblems[selectedIndex].category}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">{orderedProblems[selectedIndex].description}</p>
                  </div>
                  <button
                    onClick={handleSkip}
                    disabled={isExecuting}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                    title="Ignorer ce problème pour l'instant"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    Ignorer
                  </button>
                </div>

                <div className="p-6 flex-1">
                  {isLoadingRecs ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      <p className="text-sm">L'IA analyse les solutions possibles...</p>
                    </div>
                  ) : recommendations ? (
                    <div className="space-y-6">

                      {/* Solution cards */}
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                          Solutions proposées
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                          {recommendations.solutions?.map((sol, idx) => {
                            const isRecommended = recommendations.recommandation?.id === sol.id;
                            const transformations = sol.transformations || [];
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  'border rounded-xl p-5 transition-all relative',
                                  isRecommended
                                    ? 'border-accent/50 bg-accent/5 shadow-sm'
                                    : 'border-border bg-white hover:border-primary/30'
                                )}
                              >
                                {isRecommended && (
                                  <div className="absolute -top-3 left-4 bg-accent text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                    <Sparkles className="w-3 h-3" />
                                    Recommandé
                                  </div>
                                )}

                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-foreground">{sol.nom || sol.name}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">{sol.explication || sol.explanation}</p>
                                    {sol.effets_secondaires && (
                                      <p className="text-xs text-warning mt-2 bg-warning/5 border border-warning/20 rounded-md px-2 py-1.5">
                                        ⚠️ {sol.effets_secondaires}
                                      </p>
                                    )}
                                    {/* Show function names as chips */}
                                    {transformations.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {transformations.map((t, ti) => (
                                          <span key={ti} className="font-mono text-[10px] bg-primary/5 border border-primary/15 text-primary px-2 py-0.5 rounded">
                                            {t.function}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleApplySolution(transformations)}
                                    disabled={isExecuting || transformations.length === 0}
                                    className="shrink-0 bg-primary hover:bg-primary-mid text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {isExecuting
                                      ? <Loader2 className="w-4 h-4 animate-spin" />
                                      : 'Appliquer'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom code section */}
                      <div className="pt-5 border-t border-border">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Code className="w-4 h-4" />
                          Solution sur mesure
                        </h3>
                        {!customCode ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Optionnel : précisez votre intention (ex: Remplacer par la médiane de la classe)"
                              value={codeIntent}
                              onChange={(e) => setCodeIntent(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleGenerateCode()}
                              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            <button
                              onClick={handleGenerateCode}
                              disabled={isGeneratingCode}
                              className="shrink-0 bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {isGeneratingCode
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : 'Générer du code IA'}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <textarea
                              value={customCode}
                              onChange={(e) => setCustomCode(e.target.value)}
                              className="w-full h-40 font-mono text-sm p-4 bg-gray-900 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                              spellCheck={false}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setCustomCode('')}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={handleExecuteCode}
                                disabled={isExecuting}
                                className="bg-success hover:bg-success/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                {isExecuting
                                  ? <Loader2 className="w-4 h-4 animate-spin" />
                                  : <><Play className="w-4 h-4" /><span>Exécuter</span></>}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-accent" />
                      <p className="text-sm">Chargement...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
