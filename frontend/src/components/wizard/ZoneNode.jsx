import React from 'react'
import { Handle, Position } from '@xyflow/react'
import { Shield } from 'lucide-react'

const SL_COLORS = {
  'SL-1': { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)', text: '#93c5fd' },
  'SL-2': { border: '#22c55e', bg: 'rgba(34,197,94,0.08)',  text: '#86efac' },
  'SL-3': { border: '#f59e0b', bg: 'rgba(245,158,11,0.08)', text: '#fcd34d' },
  'SL-4': { border: '#ef4444', bg: 'rgba(239,68,68,0.08)',  text: '#fca5a5' },
}

export default function ZoneNode({ data, selected }) {
  const sl = data.security_level || 'SL-2'
  const colors = SL_COLORS[sl] || SL_COLORS['SL-2']

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        border: `2px solid ${selected ? '#fff' : colors.border}`,
        borderRadius: 10,
        background: colors.bg,
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 12px',
        boxShadow: selected ? `0 0 0 2px ${colors.border}` : 'none',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: colors.border }} />
      <Handle type="source" position={Position.Right} style={{ background: colors.border }} />
      <Handle type="target" position={Position.Top} style={{ background: colors.border }} />
      <Handle type="source" position={Position.Bottom} style={{ background: colors.border }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Shield size={12} color={colors.text} />
        <span style={{ fontSize: 11, fontWeight: 600, color: colors.text }}>{sl}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#f9fafb', flex: 1, wordBreak: 'break-word' }}>
        {data.label}
      </span>
    </div>
  )
}
