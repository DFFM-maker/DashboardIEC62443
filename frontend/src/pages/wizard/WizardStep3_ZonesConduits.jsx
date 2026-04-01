import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  useNodesState, useEdgesState, addEdge,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ChevronLeft, ChevronRight, Plus, Trash2, Shield, Monitor } from 'lucide-react'
import { api } from '../../lib/api'
import WizardStepper from '../../components/wizard/WizardStepper'
import ZoneNode from '../../components/wizard/ZoneNode'

const NODE_TYPES = { zone: ZoneNode }

const SL_COLORS = {
  'SL-1': '#3b82f6',
  'SL-2': '#22c55e',
  'SL-3': '#f59e0b',
  'SL-4': '#ef4444',
}

function zoneToNode(zone) {
  return {
    id: zone.id,
    type: 'zone',
    position: { x: zone.x ?? 50, y: zone.y ?? 50 },
    style: {
      width: zone.width ?? 200,
      height: zone.height ?? 150,
      borderColor: zone.color || undefined,
      borderStyle: zone.inventory_only ? 'dashed' : 'solid',
    },
    data: {
      label: zone.name,
      security_level: zone.security_level,
      zoneId: zone.id,
      color: zone.color,
      inventory_only: zone.inventory_only,
    },
  }
}

function conduitToEdge(conduit) {
  return {
    id: conduit.id,
    source: conduit.zone_from_id,
    target: conduit.zone_to_id,
    label: conduit.label || conduit.type || '',
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#6b7280' },
    data: { conduitId: conduit.id },
  }
}

const EMPTY_ZONE_FORM = { name: '', security_level: 'SL-2' }

export default function WizardStep3_ZonesConduits() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [assessment, setAssessment] = useState(null)
  const [zones, setZones] = useState([])
  const [assets, setAssets] = useState([])
  // assetZoneMap: { assetId -> zoneId | '' }
  const [assetZoneMap, setAssetZoneMap] = useState({})
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showZoneForm, setShowZoneForm] = useState(false)
  const [zoneForm, setZoneForm] = useState(EMPTY_ZONE_FORM)
  const [sidebarTab, setSidebarTab] = useState('zones') // 'zones' | 'assets'

  const loadAll = useCallback(() => {
    return api.initZones(id)
      .catch(() => {})
      .then(() => Promise.all([
        api.getAssessment(id),
        api.getZones(id),
        api.getConduits(id),
        api.getAssets(id),
      ]))
      .then(([a, z, c, ass]) => {
        setAssessment(a)
        setZones(z)
        setNodes(z.map(zoneToNode))
        setEdges(c.map(conduitToEdge))
        setAssets(ass)
        // Build assetZoneMap from zone.assets
        const map = {}
        for (const zone of z) {
          for (const za of (zone.assets || [])) {
            map[za.id] = zone.id
          }
        }
        setAssetZoneMap(map)
      })
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  // Persist node position when dragged
  const onNodeDragStop = useCallback(async (_event, node) => {
    await api.updateZone(node.id, { x: node.position.x, y: node.position.y })
  }, [])

  // Create conduit when edge is connected
  const onConnect = useCallback(async (params) => {
    const conduit = await api.createConduit({
      assessment_id: id,
      zone_from_id: params.source,
      zone_to_id: params.target,
      type: 'wired',
    })
    setEdges(eds => addEdge({ ...params, id: conduit.id, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, style: { stroke: '#6b7280' } }, eds))
  }, [id])

  const handleAddZone = async () => {
    if (!zoneForm.name.trim()) return
    const nextX = 50 + (zones.length % 3) * 250
    const nextY = 50 + Math.floor(zones.length / 3) * 200
    const created = await api.createZone({
      assessment_id: id,
      name: zoneForm.name.trim(),
      security_level: zoneForm.security_level,
      x: nextX,
      y: nextY,
      width: 200,
      height: 150,
    })
    setZones(prev => [...prev, created])
    setNodes(prev => [...prev, zoneToNode(created)])
    setZoneForm(EMPTY_ZONE_FORM)
    setShowZoneForm(false)
  }

  const handleDeleteZone = async (zoneId) => {
    await api.deleteZone(zoneId)
    setZones(prev => prev.filter(z => z.id !== zoneId))
    setNodes(prev => prev.filter(n => n.id !== zoneId))
    setEdges(prev => prev.filter(e => e.source !== zoneId && e.target !== zoneId))
    setAssetZoneMap(prev => {
      const next = { ...prev }
      for (const [aid, zid] of Object.entries(next)) {
        if (zid === zoneId) delete next[aid]
      }
      return next
    })
  }

  const handleAssetZoneChange = async (assetId, newZoneId) => {
    const oldZoneId = assetZoneMap[assetId]
    if (oldZoneId) await api.removeAssetFromZone(oldZoneId, assetId)
    if (newZoneId) await api.addAssetToZone(newZoneId, assetId)
    setAssetZoneMap(prev => ({ ...prev, [assetId]: newZoneId || '' }))
  }

  if (!assessment) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Top bar */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white">IEC 62443 Risk Assessment</h1>
          <p className="text-sm text-gray-400 mt-1">{assessment.name}</p>
        </div>
        <WizardStepper currentStep={3} />
      </div>

      {/* Main area: canvas + sidebar */}
      <div className="flex flex-1 min-h-0 px-6 pb-0 gap-4">

        {/* Sidebar */}
        <aside className="w-72 shrink-0 flex flex-col gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col flex-1 overflow-hidden">

            {/* Tab bar */}
            <div className="flex border-b border-gray-800 shrink-0">
              <button
                onClick={() => setSidebarTab('zones')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${sidebarTab === 'zones' ? 'text-brand-green border-b-2 border-brand-green' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Shield className="w-3.5 h-3.5" /> Zone ({zones.length})
              </button>
              <button
                onClick={() => setSidebarTab('assets')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${sidebarTab === 'assets' ? 'text-brand-green border-b-2 border-brand-green' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Monitor className="w-3.5 h-3.5" /> Asset ({assets.length})
              </button>
            </div>

            {/* Tab: Zone */}
            {sidebarTab === 'zones' && (
              <div className="flex flex-col gap-3 p-4 overflow-y-auto flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Definisci le zone di sicurezza</span>
                  <button
                    onClick={() => setShowZoneForm(v => !v)}
                    className="flex items-center gap-1 px-2 py-1 bg-brand-green hover:opacity-90 text-white rounded text-xs font-medium"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>

                {showZoneForm && (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2">
                    <input
                      autoFocus
                      placeholder="Zone name (es. PLC Zone)"
                      value={zoneForm.name}
                      onChange={e => setZoneForm(f => ({ ...f, name: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleAddZone()}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-green"
                    />
                    <select
                      value={zoneForm.security_level}
                      onChange={e => setZoneForm(f => ({ ...f, security_level: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-green"
                    >
                      <option>SL-1</option>
                      <option>SL-2</option>
                      <option>SL-3</option>
                      <option>SL-4</option>
                    </select>
                    <div className="flex gap-2">
                      <button onClick={handleAddZone} className="flex-1 py-1 bg-brand-green hover:opacity-90 text-white rounded text-xs font-medium">Add</button>
                      <button onClick={() => { setShowZoneForm(false); setZoneForm(EMPTY_ZONE_FORM) }} className="flex-1 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs">Cancel</button>
                    </div>
                  </div>
                )}

                {zones.length === 0 && !showZoneForm ? (
                  <p className="text-xs text-gray-500 text-center py-4">Nessuna zona.<br />Clicca "Add" per iniziare.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {zones.map(zone => (
                      <li key={zone.id} className="flex flex-col gap-1 p-2 bg-gray-800 border border-gray-700 rounded-lg group"
                        style={{ borderLeftWidth: 3, borderLeftColor: zone.color || SL_COLORS[zone.security_level] || '#6b7280' }}>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-xs text-white truncate font-medium">{zone.name}</span>
                          <span className="text-xs text-gray-500 shrink-0">{zone.security_level}</span>
                          <button onClick={() => handleDeleteZone(zone.id)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {zone.inventory_only ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 border border-gray-600">Solo inventario</span>
                          ) : zone.zone_template ? (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 border border-gray-600">{zone.zone_template}</span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto pt-3 border-t border-gray-800">
                  <p className="text-xs text-gray-600">Trascina le zone sul canvas.<br />Collega due zone per creare un condotto.</p>
                </div>
              </div>
            )}

            {/* Tab: Asset */}
            {sidebarTab === 'assets' && (
              <div className="flex flex-col gap-2 p-4 overflow-y-auto flex-1">
                {zones.length === 0 ? (
                  <p className="text-xs text-yellow-500 text-center py-4">Crea prima le zone,<br />poi assegna gli asset.</p>
                ) : assets.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">Nessun asset trovato<br />per questo assessment.</p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-1">Assegna ogni asset alla zona di appartenenza.</p>
                    <ul className="space-y-1.5">
                      {assets.map(asset => (
                        <li key={asset.id} className="bg-gray-800 border border-gray-700 rounded-lg p-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-green-400">{asset.ip}</span>
                            <span className="text-xs text-gray-500 truncate">{asset.device_type || '—'}</span>
                          </div>
                          <select
                            value={assetZoneMap[asset.id] || ''}
                            onChange={e => handleAssetZoneChange(asset.id, e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-green"
                          >
                            <option value="">— Nessuna zona —</option>
                            {zones.map(z => (
                              <option key={z.id} value={z.id}>{z.name} ({z.security_level})</option>
                            ))}
                          </select>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={NODE_TYPES}
            fitView
            deleteKeyCode="Delete"
            style={{ background: '#111827' }}
          >
            <Background color="#374151" gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeColor={n => SL_COLORS[n.data?.security_level] || '#6b7280'}
              style={{ background: '#1f2937' }}
            />
            <Panel position="top-right">
              <div className="text-xs text-gray-500 bg-gray-900/80 px-2 py-1 rounded border border-gray-700">
                {zones.length} zone · {edges.length} condotti
              </div>
            </Panel>
          </ReactFlow>
        </div>
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <button
          onClick={() => navigate(`/assessments/${id}/step/2`)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => navigate(`/assessments/${id}/step/4`)}
          className="flex items-center gap-2 px-5 py-2 bg-brand-green hover:opacity-90 text-white rounded-lg text-sm font-medium transition-opacity"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
