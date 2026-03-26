import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Assessments from './pages/Assessments'
import AssessmentDetail from './pages/AssessmentDetail'
import Assets from './pages/Assets'
import Findings from './pages/Findings'
import Clients from './pages/Clients'
import Advisories from './pages/Advisories'
import Templates from './pages/Templates'
import ImportPage from './pages/Import'
import Settings from './pages/Settings'
import WizardStep1_SUC from './pages/wizard/WizardStep1_SUC'
import WizardStep2_RiskAssessment from './pages/wizard/WizardStep2_RiskAssessment'
import WizardStep3_ZonesConduits from './pages/wizard/WizardStep3_ZonesConduits'
import WizardStep4_TolerableRisk from './pages/wizard/WizardStep4_TolerableRisk'
import WizardStep5_GapAnalysis from './pages/wizard/WizardStep5_GapAnalysis'
import WizardStep6_Policies from './pages/wizard/WizardStep6_Policies'
import WizardStep7_Report from './pages/wizard/WizardStep7_Report'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex h-screen overflow-hidden bg-gray-950">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/assessments/:id" element={<AssessmentDetail />} />
            <Route path="/assessments/:id/step/1" element={<WizardStep1_SUC />} />
            <Route path="/assessments/:id/step/2" element={<WizardStep2_RiskAssessment />} />
            <Route path="/assessments/:id/step/3" element={<WizardStep3_ZonesConduits />} />
            <Route path="/assessments/:id/step/4" element={<WizardStep4_TolerableRisk />} />
            <Route path="/assessments/:id/step/5" element={<WizardStep5_GapAnalysis />} />
            <Route path="/assessments/:id/step/6" element={<WizardStep6_Policies />} />
            <Route path="/assessments/:id/step/7" element={<WizardStep7_Report />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/findings" element={<Findings />} />
            <Route path="/advisories" element={<Advisories />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
