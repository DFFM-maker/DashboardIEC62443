import React from 'react'

const config = {
  critical: 'bg-red-900/60 text-red-300 border border-red-700',
  high:     'bg-orange-900/60 text-orange-300 border border-orange-700',
  medium:   'bg-yellow-900/60 text-yellow-300 border border-yellow-700',
  low:      'bg-green-900/60 text-green-300 border border-green-700',
  info:     'bg-blue-900/60 text-blue-300 border border-blue-700',
}

export default function SeverityBadge({ severity, className = '' }) {
  const s = (severity || 'info').toLowerCase()
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${config[s] || config.info} ${className}`}>
      {s}
    </span>
  )
}
