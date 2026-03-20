import React from 'react'

const config = {
  completed: 'bg-green-900/50 text-green-400 border border-green-800',
  scanning:  'bg-blue-900/50 text-blue-400 border border-blue-800 animate-pulse',
  pending:   'bg-gray-800 text-gray-400 border border-gray-700',
  error:     'bg-red-900/50 text-red-400 border border-red-800',
  open:      'bg-red-900/50 text-red-400 border border-red-800',
  resolved:  'bg-green-900/50 text-green-400 border border-green-800',
  'in-progress': 'bg-yellow-900/50 text-yellow-400 border border-yellow-800',
}

export default function StatusBadge({ status, className = '' }) {
  const s = (status || 'pending').toLowerCase()
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${config[s] || config.pending} ${className}`}>
      {status}
    </span>
  )
}
