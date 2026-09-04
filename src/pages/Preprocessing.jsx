import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';
import client from '../api/client';
import {
  LayoutDashboard, CheckCircle2, Loader2, Sparkles,
  Code, Play, SkipForward, Download, AlertCircle, X,
  MessageSquare, RefreshCw, HelpCircle, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type = 'error', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300',
      type === 'error'   ? 'bg-critical/10 border-critical/30 text-critical' : 'bg-success/10 border-success/30 text-success',
    )}>
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={onClose}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ statuses, total }) {
  const done    = Object.values(statuses).filter(s => s !== 'pending').length;
  const resolved = Object.values(statuses).filter(s => s === 'resolved' || s === 'auto-resolved').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium text-muted-foreground">
        <span>{resolved} résolu(s) · {Object.values(statuses).filter(s => s === 'skipped').length} ignoré(s) — {done} / {total} traités</span><span>{pct}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Refinement Panel ──────────────────────────────────────────────────────────
function RefinementPanel({ onRefine, isLoading }) {
  const [feedback, setFeedback] = useState('');
  const [type, setType] = useState('affiner');

  const types = [
    { id: 'affiner',      label: 'Affiner',     icon: RefreshCw,      hint: 'Ajouter une contrainte' },
    { id: 'expliquer',    label: 'Expliquer',   icon: HelpCircle,     hint: 'Demander plus de détails' },
    { id: 'questionner',  label: 'Questionner', icon: MessageSquare,  hint: 'Remettre en question' },
  ];

  const submit = () => {
    if (!feedback.trim()) return;
    onRefine(feedback.trim(), type);
    setFeedback('');
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Affiner avec l'IA</p>
      <div className="flex gap-1.5 mb-2">
        {types.map(t => (
          <button key={t.id} onClick={() => setType(t.id)}
            className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
              type === t.id ? 'bg-primary text-white border-primary' : 'border-border text-muted-foreground hover:bg-muted')}
            title={t.hint}>
            <t.icon className="w-3 h-3" />{t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={feedback} onChange={e => setFeedback(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={type === 'affiner' ? 'Ex: Je veux conserver les valeurs extrêmes' : type === 'expliquer' ? 'Ex: Explique l\'impact sur la variance' : 'Ex: Pourquoi pas une imputation KNN ?'}
          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" />
        <button onClick={submit} disabled={isLoading || !feedback.trim()}
          className="shrink-0 bg-primary hover:bg-primary-mid text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Preprocessing() {
  const navigate = useNavigate();
  const {
    datasetId, orderedProblems, diagnosticResult,
    problemStatuses, appliedTransformations,
    updateProblemStatus, updateAfterExecution, addTransformationToHistory
  } = useSessionStore();

  const [selectedIndex,    setSelectedIndex]    = useState(null);
  const [recommendations,  setRecommendations]  = useState(null);
  const [isLoadingRecs,    setIsLoadingRecs]    = useState(false);
  const [isExecuting,      setIsExecuting]      = useState(false);
  const [isRefining,       setIsRefining]       = useState(false);
  const [customCode,       setCustomCode]       = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [codeIntent,       setCodeIntent]       = useState('');
  const [toast,            setToast]            = useState(null);

  useEffect(() => { if (!datasetId || !orderedProblems) navigate('/'); }, [datasetId, orderedProblems, navigate]);

  const showToast = useCallback((message, type = 'error') => setToast({ message, type }), []);

  const resolvedCount = Object.values(problemStatuses).filter(s => s === 'resolved' || s === 'auto-resolved').length;
  const allDone = orderedProblems && Object.values(problemStatuses).filter(s => s === 'pending').length === 0 && orderedProblems.length > 0;

  const getOriginalIndex = (problem, freshDiagnostic = null) => {
    const diag = freshDiagnostic || diagnosticResult;
    if (!diag?.problems) return -1;
    return diag.problems.findIndex(p =>
      p.column === problem.column && p.category === problem.category && p.description === problem.description
    );
  };

  // ── Select problem → fetch recommendations ──────────────────────────────────
  const handleSelectProblem = async (index, freshStatuses = null, freshDiagnostic = null) => {
    const statuses = freshStatuses || problemStatuses;
    const status = statuses[index];
    // Ne pas charger les recommandations si le problème est déjà traité
    if (status && status !== 'pending') {
      setSelectedIndex(null);
      return;
    }
    setSelectedIndex(index);
    setRecommendations(null);
    setCustomCode('');
    setCodeIntent('');

    const problem = orderedProblems[index];
    const originalIndex = getOriginalIndex(problem, freshDiagnostic);
    if (originalIndex === -1) return;

    setIsLoadingRecs(true);
    try {
      const res = await client.post(`/api/recommend/${datasetId}`, {
        problem_index: originalIndex,
        applied_transformations: appliedTransformations,
      });
      setRecommendations(res.data);
    } catch (err) {
      showToast("Impossible de charger les recommandations : " + (err.response?.data?.detail || err.message));
    } finally {
      setIsLoadingRecs(false);
    }
  };

  // goToNextPending reçoit les statuts frais pour éviter la stale closure
  const goToNextPending = useCallback((resolvedIdx, freshStatuses, freshDiagnostic = null) => {
    if (!orderedProblems) return;
    const statuses = freshStatuses || problemStatuses;
    const next = orderedProblems.findIndex((_, i) => statuses[i] === 'pending' && i !== resolvedIdx);
    if (next !== -1) handleSelectProblem(next, freshStatuses, freshDiagnostic);
    else setSelectedIndex(null);
  }, [orderedProblems, problemStatuses, diagnosticResult]); // eslint-disable-line

  // ── Apply solution — Axe 1 : always uses code endpoint ─────────────────────
  const handleApplySolution = async (sol) => {
    const code = sol.code;
    if (!code) { showToast("Cette solution n'a pas de code généré."); return; }
    setIsExecuting(true);
    try {
      const res = await client.post(`/api/execute/${datasetId}/code`, { code });
      const { eda, diagnostic } = res.data;

      // Calculer les nouveaux statuts AVANT les appels de state pour goToNextPending
      const problemKey = (p) => `${p.column ?? ''}|${p.category}|${p.description}`;
      const freshKeys = new Set((diagnostic?.problems ?? []).map(problemKey));
      const newStatuses = { ...problemStatuses, [selectedIndex]: 'resolved' };
      orderedProblems.forEach((prob, idx) => {
        if (!freshKeys.has(problemKey(prob)) && newStatuses[idx] === 'pending') {
          newStatuses[idx] = 'auto-resolved';
        }
      });

      const autoCount = Object.values(newStatuses).filter(s => s === 'auto-resolved').length
        - Object.values(problemStatuses).filter(s => s === 'auto-resolved').length;

      updateAfterExecution({ eda, diagnostic });
      updateProblemStatus(selectedIndex, 'resolved');
      addTransformationToHistory(
        `[${orderedProblems[selectedIndex].column || 'Global'}] ${sol.nom || sol.name} : ${sol.explication || sol.explanation || ''}`.slice(0, 120)
      );
      setRecommendations(null);

      if (autoCount > 0) {
        showToast(`✅ Transformation appliquée ! ${autoCount} problème(s) supplémentaire(s) auto-résolu(s) en cascade.`, 'success');
      } else {
        showToast('Transformation appliquée avec succès !', 'success');
      }
      goToNextPending(selectedIndex, newStatuses, diagnostic);
    } catch (err) {
      showToast("Erreur lors de l'exécution : " + (err.response?.data?.detail || err.message));
    } finally {
      setIsExecuting(false);
    }
  };

  // ── Refine — Axe 4 ─────────────────────────────────────────────────────────
  const handleRefine = async (userFeedback, feedbackType) => {
    if (selectedIndex === null || !recommendations) return;
    const problem = orderedProblems[selectedIndex];
    const originalIndex = getOriginalIndex(problem);
    setIsRefining(true);
    try {
      const res = await client.post(`/api/recommend/${datasetId}/refine`, {
        problem_index: originalIndex,
        previous_solutions: recommendations.solutions || [],
        user_feedback: userFeedback,
        feedback_type: feedbackType,
        applied_transformations: appliedTransformations,
      });
      setRecommendations(res.data);
    } catch (err) {
      showToast("Erreur lors du raffinement : " + (err.response?.data?.detail || err.message));
    } finally {
      setIsRefining(false);
    }
  };

  const handleSkip = () => {
    updateProblemStatus(selectedIndex, 'skipped');
    goToNextPending(selectedIndex);
  };

  const handleGenerateCode = async () => {
    if (selectedIndex === null) return;
    const problem = orderedProblems[selectedIndex];
    const originalIndex = getOriginalIndex(problem);
    setIsGeneratingCode(true);
    try {
      const res = await client.post(`/api/recommend/${datasetId}/generate-code`, {
        problem_index: originalIndex, user_intent: codeIntent,
      });
      setCustomCode(res.data.code || '');
      if (res.data.warning) showToast(res.data.warning);
    } catch (err) {
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
      const { eda, diagnostic } = res.data;

      const problemKey = (p) => `${p.column ?? ''}|${p.category}|${p.description}`;
      const freshKeys = new Set((diagnostic?.problems ?? []).map(problemKey));
      const newStatuses = { ...problemStatuses, [selectedIndex]: 'resolved' };
      orderedProblems.forEach((prob, idx) => {
        if (!freshKeys.has(problemKey(prob)) && newStatuses[idx] === 'pending') {
          newStatuses[idx] = 'auto-resolved';
        }
      });
      const autoCount = Object.values(newStatuses).filter(s => s === 'auto-resolved').length
        - Object.values(problemStatuses).filter(s => s === 'auto-resolved').length;

      updateAfterExecution({ eda, diagnostic });
      updateProblemStatus(selectedIndex, 'resolved');
      addTransformationToHistory(`[${orderedProblems[selectedIndex]?.column || 'Global'}] Code personnalisé`);
      setCustomCode(''); setRecommendations(null);
      if (autoCount > 0) {
        showToast(`✅ Code exécuté ! ${autoCount} problème(s) supplémentaire(s) auto-résolu(s).`, 'success');
      } else {
        showToast('Code exécuté avec succès !', 'success');
      }
      goToNextPending(selectedIndex, newStatuses, diagnostic);
    } catch (err) {
      showToast("Erreur lors de l'exécution du code : " + (err.response?.data?.detail || err.message));
    } finally {
      setIsExecuting(false);
    }
  };

  if (!orderedProblems) return null;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="space-y-4 animate-in fade-in duration-500 pb-12 h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-accent" /> Diagnostic &amp; Preprocessing
          </h1>
          <div className="flex items-center gap-3">
            {allDone && (
              <button onClick={() => navigate('/export')}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm">
                <Download className="w-4 h-4" /> Passer à l'export
              </button>
            )}
            <button onClick={() => navigate('/eda')}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-sm">
              <LayoutDashboard className="w-4 h-4 text-primary-mid" /> Aperçu EDA
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl border border-border px-5 py-3 shadow-sm">
          <ProgressBar statuses={problemStatuses} total={orderedProblems.length} />
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          {/* ── Left Panel ─────────────────────────────────────────────────── */}
          <div className="w-1/3 bg-white rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                Plan d'action IA
                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{orderedProblems.length} problèmes</span>
              </h2>
            </div>
            <div className="overflow-y-auto p-3 space-y-2 custom-scrollbar flex-1">
              {orderedProblems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <CheckCircle2 className="w-10 h-10 text-success mb-3" />
                  <p className="font-semibold">Aucun problème détecté</p>
                </div>
              ) : orderedProblems.map((prob, idx) => {
                const status = problemStatuses[idx];
                const isSelected = selectedIndex === idx;
                const isDone = status === 'resolved' || status === 'auto-resolved';
                let sev = 'bg-success/10 text-success border-success/20';
                if (prob.severity === 'medium')   sev = 'bg-warning/10 text-warning border-warning/20';
                if (prob.severity === 'critical')  sev = 'bg-critical/10 text-critical border-critical/20';
                return (
                  <div key={idx} onClick={() => !isDone && handleSelectProblem(idx)}
                    className={cn('p-3 rounded-lg border cursor-pointer transition-all',
                      isSelected ? 'border-accent ring-1 ring-accent/20 bg-accent/5' : 'border-border hover:border-primary/30',
                      isDone ? 'opacity-50 grayscale cursor-not-allowed' : '',
                      status === 'skipped' ? 'opacity-60 italic' : '',
                    )}>
                    <div className="flex items-start justify-between mb-1.5">
                      <span className={cn('text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm border', sev)}>{prob.severity}</span>
                      {status === 'resolved'      && <CheckCircle2 className="w-4 h-4 text-success" />}
                      {status === 'auto-resolved' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded-full">
                          <Zap className="w-3 h-3" /> Auto
                        </span>
                      )}
                      {status === 'skipped'  && <span className="text-[10px] text-muted-foreground font-medium">ignoré</span>}
                    </div>
                    <h3 className="font-medium text-sm line-clamp-1">{prob.column ? `${prob.column} (${prob.category})` : prob.category}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{prob.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right Panel ────────────────────────────────────────────────── */}
          <div className="w-2/3 bg-white rounded-xl border border-border shadow-sm flex flex-col overflow-hidden">
            {selectedIndex === null ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                {allDone ? (
                  <>
                    <CheckCircle2 className="w-14 h-14 mb-4 text-success" />
                    <h2 className="text-xl font-bold text-foreground mb-2">Tous les problèmes sont résolus !</h2>
                    <p className="text-sm max-w-md mb-6">Votre dataset est prêt pour l'export.</p>
                    <button onClick={() => navigate('/export')}
                      className="bg-accent text-white px-6 py-3 rounded-xl font-semibold hover:bg-accent/90 flex items-center gap-2 shadow-sm">
                      <Download className="w-5 h-5" /> Passer à l'export
                    </button>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-12 h-12 mb-4 text-primary/20" />
                    <h2 className="text-lg font-medium text-foreground mb-2">Sélectionnez un problème</h2>
                    <p className="text-sm max-w-md">L'IA analysera le contexte et proposera du code adapté.</p>
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
                  <button onClick={handleSkip} disabled={isExecuting}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
                    <SkipForward className="w-3.5 h-3.5" /> Ignorer
                  </button>
                </div>

                <div className="p-6 flex-1">
                  {isLoadingRecs ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin text-accent" />
                      <p className="text-sm">L'IA analyse et génère des solutions...</p>
                    </div>
                  ) : recommendations ? (
                    <div className="space-y-6">
                      {/* Analyse chain-of-thought (Axe 2) */}
                      {recommendations.analyse && (
                        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Analyse IA
                          </p>
                          <p className="text-sm text-foreground/80 leading-relaxed">{recommendations.analyse}</p>
                        </div>
                      )}

                      {/* Solution cards */}
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Solutions proposées</h3>
                        <div className="grid grid-cols-1 gap-4">
                          {recommendations.solutions?.map((sol, idx) => {
                            const isRec = recommendations.recommandation?.id === sol.id;
                            return (
                              <div key={idx} className={cn('border rounded-xl p-5 transition-all relative',
                                isRec ? 'border-accent/50 bg-accent/5 shadow-sm' : 'border-border bg-white hover:border-primary/30')}>
                                {isRec && (
                                  <div className="absolute -top-3 left-4 bg-accent text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                    <Sparkles className="w-3 h-3" /> Recommandé
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
                                    {/* Code preview */}
                                    {sol.code && (
                                      <pre className="mt-2 text-[10px] font-mono bg-gray-900 text-gray-300 rounded-lg px-3 py-2 overflow-x-auto max-h-20 leading-relaxed">
                                        {sol.code.slice(0, 200)}{sol.code.length > 200 ? '…' : ''}
                                      </pre>
                                    )}
                                  </div>
                                  <button onClick={() => handleApplySolution(sol)}
                                    disabled={isExecuting || !sol.code}
                                    className="shrink-0 bg-primary hover:bg-primary-mid text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                                    {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Appliquer'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Refinement panel — Axe 4 */}
                      <RefinementPanel onRefine={handleRefine} isLoading={isRefining} />

                      {/* Custom code */}
                      <div className="pt-5 border-t border-border">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Code className="w-4 h-4" /> Code personnalisé
                        </h3>
                        {!customCode ? (
                          <div className="flex gap-2">
                            <input type="text" placeholder="Optionnel : précisez votre intention"
                              value={codeIntent} onChange={e => setCodeIntent(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleGenerateCode()}
                              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
                            <button onClick={handleGenerateCode} disabled={isGeneratingCode}
                              className="shrink-0 bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                              {isGeneratingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Générer du code IA'}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <textarea value={customCode} onChange={e => setCustomCode(e.target.value)} spellCheck={false}
                              className="w-full h-40 font-mono text-sm p-4 bg-gray-900 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none" />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setCustomCode('')}
                                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-lg transition-colors">Annuler</button>
                              <button onClick={handleExecuteCode} disabled={isExecuting}
                                className="bg-success hover:bg-success/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                                {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4" /><span>Exécuter</span></>}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin text-accent" />
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
