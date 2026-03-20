import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Building2, ClipboardList, Monitor,
  AlertTriangle, Newspaper, LayoutTemplate, Upload,
  Settings, Shield, ChevronLeft, ChevronRight
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/clients',     label: 'Impianti/Clienti', icon: Building2 },
  { to: '/assessments', label: 'Assessment',       icon: ClipboardList },
  { to: '/assets',      label: 'Asset Inventory',  icon: Monitor },
  { to: '/findings',    label: 'Finding',          icon: AlertTriangle },
  { to: '/advisories',  label: 'Advisory',         icon: Newspaper },
  { to: '/templates',   label: 'Template Zone',    icon: LayoutTemplate },
  { to: '/import',      label: 'Import .otsa',     icon: Upload },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside className={`flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} shrink-0`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <img
          src="/assets/logo-tecnopack-dark.svg"
          alt="Tecnopack"
          className={`h-8 transition-all ${collapsed ? 'w-8 object-contain object-left' : 'w-auto'}`}
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-xs font-bold text-brand-green uppercase tracking-widest leading-none">OT Security</p>
            <p className="text-[10px] text-gray-500 mt-0.5">IEC 62443 Dashboard</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-all text-sm font-medium ${
                isActive
                  ? 'bg-brand-green/20 text-brand-green border border-brand-green/30'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-800 py-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg mb-1 transition-all text-sm font-medium ${
              isActive ? 'bg-gray-700 text-gray-100' : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
            }`
          }
          title={collapsed ? 'Impostazioni' : undefined}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Impostazioni</span>}
        </NavLink>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 w-full transition-all text-sm"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Comprimi</span>}
        </button>
      </div>
    </aside>
  )
}
