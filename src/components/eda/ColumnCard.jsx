import { cn } from '../../lib/utils';
import HistogramChart from '../charts/HistogramChart';
import CategoryBarChart from '../charts/CategoryBarChart';
import { AlertCircle, Target, Hash, Type } from 'lucide-react';
import BoxPlot from '../charts/BoxPlot';
import ClassDistPie from '../charts/ClassDistPie';

export default function ColumnCard({ col }) {
  const isNumeric = col.dtype.includes('float') || col.dtype.includes('int');
  const isTarget = col.is_target;

  // Prepare chart data
  let chartContent = null;
  let secondaryChart = null;

  if (isNumeric && col.numeric?.histogram) {
    chartContent = <HistogramChart data={col.numeric.histogram} />;
    if (col.numeric.q25 !== undefined) {
      secondaryChart = <BoxPlot stats={col.numeric} />;
    }
  } else if (!isNumeric && col.categorical?.top_values) {
    const data = Object.entries(col.categorical.top_values).map(([name, value]) => ({ name, value }));
    chartContent = <CategoryBarChart data={data} />;
    
    // If <= 6 categories, show pie chart as secondary
    if (Object.keys(col.categorical.top_values).length <= 6) {
      secondaryChart = <ClassDistPie classPct={col.categorical.top_values_pct} />;
    }
  }

  return (
    <div className={cn(
      "bg-white p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md",
      isTarget ? "border-accent ring-1 ring-accent/20" : "border-border"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-foreground truncate max-w-[200px]" title={col.name}>{col.name}</h3>
            {isTarget && <span className="bg-accent/10 text-accent px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1"><Target className="w-3 h-3"/> Cible</span>}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              {isNumeric ? <Hash className="w-3 h-3"/> : <Type className="w-3 h-3"/>}
              {col.dtype}
            </span>
            <span>•</span>
            <span className={cn(col.missing_pct > 0 ? "text-warning font-medium" : "")}>
              {col.missing_pct.toFixed(1)}% manquants
            </span>
          </div>
        </div>
        
        {/* Warning Badge (Rare categories or many missing) */}
        {col.categorical?.n_rare_categories > 0 && (
          <div className="bg-warning/10 text-warning px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Catégories rares
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 mb-4 bg-muted/30 p-3 rounded-lg border border-border/50 text-sm">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Valeurs uniques</span>
          <span className="font-semibold text-foreground">{col.unique_count} ({col.unique_pct.toFixed(1)}%)</span>
        </div>
        {isNumeric && col.numeric ? (
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Moyenne</span>
            <span className="font-semibold text-foreground">{col.numeric.mean.toFixed(2)}</span>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Mode</span>
            <span className="font-semibold text-foreground truncate">{col.categorical?.mode || '-'}</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="mt-4 space-y-4">
        {chartContent}
        {secondaryChart && (
          <div className="border-t border-border/50 pt-2">
            {secondaryChart}
          </div>
        )}
      </div>

    </div>
  );
}
