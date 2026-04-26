import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/sessionStore';
import ColumnCard from '../components/eda/ColumnCard';
import { LayoutDashboard, AlertTriangle, ArrowRight, TableProperties } from 'lucide-react';
import { cn } from '../lib/utils';
import CorrelationHeatmap from '../components/charts/CorrelationHeatmap';
import TargetCorrelBar from '../components/charts/TargetCorrelBar';
import ClassDistPie from '../components/charts/ClassDistPie';
import MissingPatternTable from '../components/charts/MissingPatternTable';

export default function EDA() {
  const navigate = useNavigate();
  const { datasetId, edaResult } = useSessionStore();

  useEffect(() => {
    // If no data is loaded, go back home
    if (!datasetId || !edaResult) {
      navigate('/');
    }
  }, [datasetId, edaResult, navigate]);

  if (!edaResult) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header & Overview */}
      <div className="bg-primary text-white rounded-2xl p-8 shadow-md">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 opacity-80" />
              Analyse Exploratoire
            </h1>
            <p className="text-primary-mid/30 text-white/80 max-w-2xl">
              Aperçu statistique de votre dataset. L'IA a détecté les relations et les profils de chaque colonne.
            </p>
          </div>
          
          <button 
            onClick={() => navigate('/preprocessing')}
            className="bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            Aller au Diagnostic
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Top metrics */}
        <div className="grid grid-cols-4 gap-6 mt-8">
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="text-white/60 text-sm font-medium mb-1 flex items-center gap-2">
              <TableProperties className="w-4 h-4"/> Lignes
            </div>
            <div className="text-2xl font-bold">{edaResult.row_count.toLocaleString()}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="text-white/60 text-sm font-medium mb-1">Colonnes</div>
            <div className="text-2xl font-bold">{edaResult.col_count}</div>
          </div>
          <div className={cn("rounded-xl p-4 border", edaResult.duplicates_count > 0 ? "bg-warning/20 border-warning/50 text-warning-foreground" : "bg-white/10 border-white/20")}>
            <div className="text-sm font-medium mb-1 flex items-center gap-2">
              {edaResult.duplicates_count > 0 && <AlertTriangle className="w-4 h-4" />} Doublons
            </div>
            <div className="text-2xl font-bold">{edaResult.duplicates_count}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <div className="text-white/60 text-sm font-medium mb-1">Cible</div>
            <div className="text-2xl font-bold truncate">
              {edaResult.target_profile?.column || "Non définie"}
            </div>
          </div>
        </div>
      </div>

      {/* Target & Correlation Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {edaResult.target_profile && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="font-bold text-lg text-primary mb-4">Profil de la Cible ({edaResult.target_profile.column})</h3>
            {edaResult.target_profile.task_type === 'classification' ? (
              <ClassDistPie classPct={edaResult.target_profile.class_pct} />
            ) : (
              <div className="text-sm text-muted-foreground">La cible est numérique (Régression). Voir ses statistiques dans les détails ci-dessous.</div>
            )}
          </div>
        )}

        {edaResult.target_correlations && Object.keys(edaResult.target_correlations).length > 0 && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="font-bold text-lg text-primary mb-4">Top Corrélations avec la Cible</h3>
            <TargetCorrelBar targetCorrelations={edaResult.target_correlations} />
          </div>
        )}
      </div>

      {edaResult.correlation_matrix && (
        <div className="mt-8">
          <CorrelationHeatmap matrix={edaResult.correlation_matrix} />
        </div>
      )}

      {edaResult.missing_combinations && edaResult.missing_combinations.length > 0 && (
        <div className="mt-8">
          <MissingPatternTable combinations={edaResult.missing_combinations} />
        </div>
      )}

      {/* Columns Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          Détails des colonnes
          <span className="text-sm font-medium bg-muted text-muted-foreground px-2 py-1 rounded-md">{edaResult.columns.length}</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {edaResult.columns.map(col => (
            <ColumnCard key={col.name} col={col} />
          ))}
        </div>
      </div>

    </div>
  );
}
