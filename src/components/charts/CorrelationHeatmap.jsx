import { cn } from '../../lib/utils';

export default function CorrelationHeatmap({ matrix }) {
  if (!matrix) return null;
  
  const cols = Object.keys(matrix);
  if (cols.length === 0) return null;

  const getColor = (val) => {
    if (val === null || val === undefined) return 'bg-gray-100';
    if (val > 0) return `rgba(22, 163, 74, ${Math.max(0.05, val)})`; 
    return `rgba(220, 38, 38, ${Math.max(0.05, Math.abs(val))})`; 
  };

  return (
    <div className="overflow-x-auto pb-4 custom-scrollbar">
      <div className="inline-block min-w-max bg-white p-4 rounded-xl border shadow-sm">
        <h3 className="font-semibold text-lg mb-6 text-primary">Matrice de corrélation (Numérique)</h3>
        <div className="flex">
          <div className="w-32 shrink-0"></div> 
          {cols.map(col => (
            <div key={col} className="w-12 h-24 shrink-0 -rotate-45 origin-bottom-left text-xs font-medium text-muted-foreground truncate" title={col}>
              {col}
            </div>
          ))}
        </div>
        {cols.map(row => (
          <div key={row} className="flex items-center">
            <div className="w-32 shrink-0 text-xs font-semibold text-right pr-4 text-foreground truncate" title={row}>
              {row}
            </div>
            {cols.map(col => {
              const val = matrix[row][col];
              const isSelf = row === col;
              return (
                <div 
                  key={`${row}-${col}`} 
                  className={cn(
                    "w-12 h-12 shrink-0 border border-white flex items-center justify-center text-[10px] transition-colors hover:border-accent hover:z-10 relative",
                    isSelf ? "bg-gray-50 text-gray-300" : "text-gray-800 font-medium"
                  )}
                  style={{ backgroundColor: !isSelf ? getColor(val) : undefined }}
                  title={`${row} vs ${col}\nCorrélation: ${val !== null ? val.toFixed(3) : 'N/A'}`}
                >
                  {!isSelf && val !== null ? Math.abs(val).toFixed(2) : ''}
                </div>
              );
            })}
          </div>
        ))}
        <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-success rounded-full"></div> Corrélation Positive</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-critical rounded-full"></div> Corrélation Négative</div>
        </div>
      </div>
    </div>
  );
}
