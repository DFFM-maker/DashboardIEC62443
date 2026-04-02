import React from 'react'

const LIKELIHOOD_LABELS = ['Remote', 'Unlikely', 'Possible', 'Likely', 'Certain']
const IMPACT_LABELS = ['Trivial', 'Minor', 'Moderate', 'Major', 'Critical']

const RISK_LEVELS = [
  { label: 'LOW',          min: 1,  max: 4,  color: '#22c55e', bg: 'bg-green-500' },
  { label: 'MEDIUM',       min: 5,  max: 9,  color: '#eab308', bg: 'bg-yellow-500' },
  { label: 'HIGH',         min: 10, max: 14, color: '#f97316', bg: 'bg-orange-500' },
  { label: 'CRITICAL',     min: 15, max: 19, color: '#ef4444', bg: 'bg-red-500' },
  { label: 'CATASTROPHIC', min: 20, max: 25, color: '#991b1b', bg: 'bg-red-900' },
]

function getRiskLevel(score) {
  return RISK_LEVELS.find(r => score >= r.min && score <= r.max) || RISK_LEVELS[0]
}

export default function RiskMatrix5x5({
  likelihood = 1,
  impact = 1,
  interactive = false,
  showLegend = false,
  onRiskChange,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {/* Y-axis label */}
        <div className="flex flex-col justify-between items-center py-6" style={{ width: 60 }}>
          <span className="text-xs text-gray-400 -rotate-90 whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            Impact ↑
          </span>
        </div>

        <div className="flex flex-col gap-1">
          {/* Y axis labels + rows (impact 5→1, top to bottom) */}
          {[5, 4, 3, 2, 1].map(i => (
            <div key={i} className="flex gap-1 items-center">
              {/* Impact label */}
              <div className="w-16 text-right pr-2">
                <span className="text-xs text-gray-400">{IMPACT_LABELS[i - 1]}</span>
              </div>
              {/* Cells for this impact row */}
              {[1, 2, 3, 4, 5].map(l => {
                const score = l * i
                const level = getRiskLevel(score)
                const isActive = l === likelihood && i === impact

                return (
                  <div
                    key={l}
                    data-cell={`${l}-${i}`}
                    data-active={isActive ? 'true' : 'false'}
                    data-score={String(score)}
                    data-label={level.label}
                    onClick={() => {
                      if (interactive && onRiskChange) {
                        onRiskChange(l, i, score, level.label)
                      }
                    }}
                    className={`
                      w-12 h-12 flex items-center justify-center rounded text-xs font-bold
                      transition-all select-none
                      ${interactive ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                      ${isActive ? 'scale-110' : ''}
                    `}
                    style={{
                      backgroundColor: level.color,
                      opacity: isActive ? 1 : 0.5,
                      ...(isActive ? { outline: '3px solid white', outlineOffset: '2px' } : {}),
                    }}
                    title={`L${l} × I${i} = ${score} (${level.label})`}
                  >
                    {score}
                  </div>
                )
              })}
            </div>
          ))}

          {/* X axis labels */}
          <div className="flex gap-1 mt-1">
            <div className="w-16" />
            {LIKELIHOOD_LABELS.map((label, idx) => (
              <div key={idx} className="w-12 text-center">
                <span className="text-xs text-gray-400">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-1 ml-16">
            <span className="text-xs text-gray-500">Likelihood →</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div data-testid="risk-legend" className="flex flex-wrap gap-2 mt-2">
          {RISK_LEVELS.map(r => (
            <div key={r.label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: r.color }} />
              <span className="text-xs text-gray-400">{r.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
