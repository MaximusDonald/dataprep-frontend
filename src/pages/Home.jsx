import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileType, Target, FilePlus, Loader2, Database, CheckCircle2 } from 'lucide-react';
import client from '../api/client';
import { useSessionStore } from '../store/sessionStore';
import { cn } from '../lib/utils';
import RecentAnalyses from '../components/dataset/RecentAnalyses';







export default function Home() {
  const navigate = useNavigate();
  const { datasetId, setDatasetId, datasetMeta, setDatasetMeta, setAnalysisResults, setSessionUUID, sessionUUID } = useSessionStore();
  
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [targetColumn, setTargetColumn] = useState('');
  const [taskType, setTaskType] = useState('exploration');
  const [objective, setObjective] = useState('');
  const [successMetrics, setSuccessMetrics] = useState('');
  const [modelType, setModelType] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const ensureSession = async () => {
    if (!sessionUUID) {
      const res = await client.post('/api/sessions');
      setSessionUUID(res.data.uuid);
    }
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileDrop(e.dataTransfer.files[0]);
  };

  const handleFileDrop = async (selectedFile) => {
    setError(null);
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError("Format de fichier non supporté. Veuillez utiliser CSV ou Excel.");
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("Le fichier dépasse la limite de 50 MB.");
      return;
    }
    setFile(selectedFile);
    
    try {
      setIsUploading(true);
      await ensureSession();
      const formData = new FormData();
      
      // Force MIME type for strict backend validation
      let mimeType = selectedFile.type;
      if (selectedFile.name.endsWith('.csv')) mimeType = 'text/csv';
      else if (selectedFile.name.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (selectedFile.name.endsWith('.xls')) mimeType = 'application/vnd.ms-excel';

      const safeFile = new File([selectedFile], selectedFile.name, { type: mimeType });
      formData.append('file', safeFile);
      
      const uploadRes = await client.post('/api/datasets/upload', formData);
      
      setDatasetId(uploadRes.data.id);
      setDatasetMeta(uploadRes.data);
      if (uploadRes.data.columns?.length > 0) {
        setTargetColumn(uploadRes.data.columns[0]);
      }
    } catch (err) {
      let errMsg = "Erreur lors du chargement du fichier. Vérifiez le format.";
      if (err.response?.data?.detail) {
        errMsg = typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail);
      }
      setError(errMsg);
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!datasetId) return;

    try {
      setIsAnalyzing(true);
      setError(null);

      const formData = new FormData();
      // Backend requires target_column and validates its existence in df.columns
      formData.append('target_column', targetColumn || datasetMeta.columns[0]);
      
      if (taskType) formData.append('task_type', taskType);
      if (objective) formData.append('objective', objective);
      if (successMetrics) formData.append('success_metrics', successMetrics);
      if (modelType) formData.append('model_type', modelType);

      await client.patch(`/api/datasets/${datasetId}/target`, formData);

      // Analyze
      const analyzeRes = await client.post(`/api/analyze/${datasetId}`);
      setAnalysisResults(analyzeRes.data);

      navigate('/eda');
    } catch (err) {
      console.error(err);
      let errMsg = "Erreur lors de l'analyse.";
      if (err.response?.data?.detail) {
        errMsg = typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail);
      }
      setError(errMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setDatasetId(null);
    setDatasetMeta(null);
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">
          Préparez vos données pour le <span className="text-accent">Machine Learning</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Uploadez votre dataset et laissez l'IA analyser, diagnostiquer et proposer des transformations adaptées à votre objectif.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white p-8 rounded-2xl border border-border shadow-sm">
        
        {/* Left Col: Upload Zone */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-mid" />
            Source des données
          </h3>
          
          <div 
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all min-h-[320px]",
              isDragging ? "border-primary-mid bg-primary/5" : "border-border hover:border-primary-mid/50 hover:bg-muted/50",
              datasetId ? "bg-success/5 border-success/50" : ""
            )}
          >
            {isUploading ? (
              <div className="flex flex-col items-center space-y-4 text-primary-mid">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="font-medium">Chargement du dataset...</p>
              </div>
            ) : datasetId ? (
              <div className="space-y-3 flex flex-col items-center">
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center text-success">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-semibold text-foreground truncate max-w-[250px]">{file?.name}</p>
                  <p className="text-sm text-muted-foreground">{datasetMeta?.row_count} lignes • {datasetMeta?.columns?.length} colonnes</p>
                </div>
                <button type="button" onClick={resetUpload} className="text-xs font-medium text-critical hover:underline mt-2">
                  Changer de fichier
                </button>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col items-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary-mid">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Glissez-déposez votre fichier ici</p>
                  <p className="text-sm text-muted-foreground mt-1">CSV ou Excel jusqu'à 50 MB</p>
                </div>
                <label className="cursor-pointer bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-mid transition-colors">
                  Parcourir
                  <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={(e) => e.target.files && handleFileDrop(e.target.files[0])} />
                </label>
              </div>
            )}
          </div>
          {error && <p className="text-sm text-critical bg-critical/10 p-3 rounded-md border border-critical/20">{error}</p>}
        </div>

        {/* Right Col: Configuration Form */}
        <form onSubmit={handleSubmit} className={cn("space-y-6 flex flex-col justify-between transition-opacity duration-300", !datasetId ? "opacity-40 pointer-events-none" : "opacity-100")}>
          <div className="space-y-5">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-mid" />
              Configuration du Projet
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Type de tâche</label>
              <div className="grid grid-cols-3 gap-2">
                {['exploration', 'classification', 'regression'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTaskType(type)}
                    className={cn(
                      "px-2 py-2 text-xs font-medium rounded-md border transition-all capitalize",
                      taskType === type 
                        ? "bg-primary text-white border-primary" 
                        : "bg-white text-muted-foreground border-border hover:border-primary-mid"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Colonne cible</label>
              <select 
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                disabled={taskType === 'exploration'}
                className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-mid/50 disabled:opacity-50 disabled:bg-muted bg-white"
              >
                {taskType === 'exploration' ? (
                  <option value="">Non requise pour l'exploration</option>
                ) : (
                  datasetMeta?.columns?.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Type de modèle visé</label>
                <input 
                  type="text" 
                  placeholder="Ex: XGBoost, Random Forest"
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-mid/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Métriques de succès</label>
                <input 
                  type="text" 
                  placeholder="Ex: F1-score > 0.8, RMSE < 10"
                  value={successMetrics}
                  onChange={(e) => setSuccessMetrics(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-mid/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contexte métier (Optionnel)</label>
              <textarea 
                placeholder="Ex: Prédiction du taux de désabonnement pour mieux cibler les campagnes..."
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-primary-mid/50"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isAnalyzing || !datasetId}
            className="w-full flex items-center justify-center gap-2 bg-accent text-white font-semibold py-3 px-4 rounded-xl hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
          >
            {isAnalyzing ? (
              <span key="analyzing" className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyse IA en cours (peut prendre ~30s)...</span>
              </span>
            ) : (
              <span key="idle" className="flex items-center gap-2">
                <FilePlus className="w-5 h-5" />
                <span>Lancer l'analyse complète</span>
              </span>
            )}
          </button>
        </form>

      </div>

      {/* Historique des analyses récentes */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <RecentAnalyses />
      </div>

    </div>
  );
}
