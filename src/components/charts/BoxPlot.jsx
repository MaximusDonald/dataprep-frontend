import React from 'react';

export default function BoxPlot({ stats }) {
  if (!stats) return null;
  const { min, max, q25, q75, median, outlier_lower_bound, outlier_upper_bound } = stats;
  
  if (min === max) {
    return <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">Valeur constante</div>;
  }

  const range = max - min;
  const getPercent = (val) => Math.max(0, Math.min(100, ((val - min) / range) * 100));

  const pMin = getPercent(Math.max(min, outlier_lower_bound || min));
  const pMax = getPercent(Math.min(max, outlier_upper_bound || max));
  const pQ25 = getPercent(q25);
  const pQ75 = getPercent(q75);
  const pMed = getPercent(median);

  return (
    <div className="w-full h-24 relative py-8 px-4">
      <svg width="100%" height="100%" className="overflow-visible">
        {/* Whisker line */}
        <line x1={`${pMin}%`} y1="50%" x2={`${pMax}%`} y2="50%" stroke="currentColor" strokeWidth="2" className="text-primary-mid/40" />
        {/* Whiskers ends */}
        <line x1={`${pMin}%`} y1="20%" x2={`${pMin}%`} y2="80%" stroke="currentColor" strokeWidth="2" className="text-primary-mid/60" />
        <line x1={`${pMax}%`} y1="20%" x2={`${pMax}%`} y2="80%" stroke="currentColor" strokeWidth="2" className="text-primary-mid/60" />
        
        {/* IQR Box */}
        <rect 
          x={`${pQ25}%`} 
          y="20%" 
          width={`${Math.max(0, pQ75 - pQ25)}%`} 
          height="60%" 
          fill="currentColor" 
          className="text-primary-mid/20"
          stroke="currentColor"
          strokeWidth="2"
        />
        
        {/* Median */}
        <line x1={`${pMed}%`} y1="20%" x2={`${pMed}%`} y2="80%" stroke="currentColor" strokeWidth="3" className="text-primary" />
      </svg>
      <div className="absolute top-0 left-0 w-full flex justify-between text-xs text-muted-foreground mt-1">
        <span>{min.toFixed(1)}</span>
        <span>{max.toFixed(1)}</span>
      </div>
    </div>
  );
}
