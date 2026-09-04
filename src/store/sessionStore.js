import { create } from 'zustand'

const getInitialSessionUUID = () => {
  const uuid = localStorage.getItem('session_uuid');
  if (!uuid || uuid === 'undefined' || uuid === 'null') return null;
  return uuid;
};

export const useSessionStore = create((set) => ({
  sessionUUID: getInitialSessionUUID(),
  datasetId: null,
  datasetMeta: null,
  edaResult: null,
  diagnosticResult: null,
  orderedProblems: [],
  problemStatuses: {}, // { problemIndex: 'pending'|'resolved'|'auto-resolved'|'skipped' }
  currentProblem: null,
  appliedTransformations: [], // historique textuel des transformations exécutées
  history: [],

  setSessionUUID: (uuid) => {
    if (!uuid || uuid === 'undefined' || uuid === 'null') {
      localStorage.removeItem('session_uuid')
      set({ sessionUUID: null })
    } else {
      localStorage.setItem('session_uuid', uuid)
      set({ sessionUUID: uuid })
    }
  },
  
  clearSession: () => {
    localStorage.removeItem('session_uuid')
    set({ sessionUUID: null, datasetId: null, datasetMeta: null, edaResult: null, diagnosticResult: null, orderedProblems: [], problemStatuses: {}, currentProblem: null, appliedTransformations: [], history: [] })
  },

  setDatasetId: (id) => set({ datasetId: id }),
  setDatasetMeta: (meta) => set({ datasetMeta: meta }),
  
  setAnalysisResults: ({ eda, diagnostic, ordered_problems }) => set({
    edaResult: eda,
    diagnosticResult: diagnostic,
    orderedProblems: ordered_problems,
    appliedTransformations: [], // reset l'historique à chaque nouvelle analyse
    problemStatuses: ordered_problems?.reduce((acc, _, idx) => {
      acc[idx] = 'pending'
      return acc
    }, {}) || {}
  }),

  /**
   * Appelé après chaque exécution réussie.
   * Compare le nouveau diagnostic avec la liste des problèmes ordonnés et :
   *   - marque 'auto-resolved' les problèmes qui ont disparu du diagnostic (résolus en cascade)
   *   - conserve 'resolved' et 'skipped' inchangés
   */
  updateAfterExecution: ({ eda, diagnostic }) => set((state) => {
    const problemKey = (p) => `${p.column ?? ''}|${p.category}|${p.description}`;

    const freshKeys = new Set(
      (diagnostic?.problems ?? []).map(problemKey)
    );

    const newStatuses = { ...state.problemStatuses };
    let autoResolvedCount = 0;

    state.orderedProblems.forEach((prob, idx) => {
      if (!freshKeys.has(problemKey(prob)) && newStatuses[idx] === 'pending') {
        // Ce problème a disparu du diagnostic sans action manuelle => auto-résolu
        newStatuses[idx] = 'auto-resolved';
        autoResolvedCount++;
      }
    });

    return {
      edaResult:        eda,
      diagnosticResult: diagnostic,
      problemStatuses:  newStatuses,
      _lastAutoResolved: autoResolvedCount, // pour éventuellement afficher un toast
    };
  }),

  addTransformationToHistory: (description) => set((state) => ({
    appliedTransformations: [...state.appliedTransformations, description]
  })),

  updateProblemStatus: (index, status) => set((state) => ({
    problemStatuses: { ...state.problemStatuses, [index]: status }
  })),

  setCurrentProblem: (problem) => set({ currentProblem: problem }),
  
  addHistoryAction: (action) => set((state) => ({
    history: [...state.history, action]
  }))
}))
