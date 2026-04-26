import { AlertTriangle } from 'lucide-react';

export default function MissingPatternTable({ combinations }) {
  if (!combinations || combinations.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm">
      <h3 className="font-bold text-lg text-primary mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-warning" />
        Patterns de Valeurs Manquantes
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        L'IA a détecté des lignes où plusieurs colonnes sont manquantes simultanément. Cela peut indiquer un problème structurel dans la collecte des données.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-muted-foreground">
              <th className="px-4 py-3 font-medium rounded-tl-lg">Colonnes simultanément manquantes</th>
              <th className="px-4 py-3 font-medium">Nombre de lignes</th>
              <th className="px-4 py-3 font-medium rounded-tr-lg">% du dataset</th>
            </tr>
          </thead>
          <tbody>
            {combinations.map((comb, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {comb.columns.map(c => (
                      <span key={c} className="bg-warning/10 text-warning-foreground border border-warning/20 px-2 py-0.5 rounded-md text-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold">{comb.count}</td>
                <td className="px-4 py-3 text-warning font-medium">{comb.pct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
