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
  problemStatuses: {}, // { problemIndex: 'pending'|'resolved'|'skipped' }
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

  updateAfterExecution: ({ eda, diagnostic }) => set((state) => {
    // Le backend renvoie le nouveau diagnostic avec seulement les problèmes restants.
    // On identifie un problème par (column, category, description).
    const problemKey = (p) => `${p.column ?? ''}|${p.category}|${p.description}`;

    const freshKeys = new Set(
      (diagnostic?.problems ?? []).map(problemKey)
    );

    // Recalcule les statuts : les problèmes qui ont disparu du diagnostic
    // sont automatiquement marqués 'resolved' (ex: colonne supprimée).
    const newStatuses = { ...state.problemStatuses };
    state.orderedProblems.forEach((prob, idx) => {
      if (!freshKeys.has(problemKey(prob)) && newStatuses[idx] === 'pending') {
        newStatuses[idx] = 'resolved';
      }
    });

    return {
      edaResult:        eda,
      diagnosticResult: diagnostic,
      problemStatuses:  newStatuses,
      // orderedProblems garde son ordre initial (LLM) ; seuls les statuts changent.
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
