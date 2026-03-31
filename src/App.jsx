import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './App.css'
import LandingPage from './components/LandingPage'
import AuthPage from './components/AuthPage'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import HeroCards from './components/HeroCards'
import StatsCards from './components/StatsCards'
import CategoryHub from './components/PieChart'
import SummaryPie from './components/SummaryPie'
import LineGraph from './components/LineGraph'
import AIInsights from './components/AIInsights'
import Transactions from './components/Transactions'
import PayScreen from './components/PayScreen'
import AddExpense from './components/AddExpense'
import SpendingAnalysis from './components/SpendingAnalysis'
import SavingsQuest from './components/SavingsQuest'
import BudgetPage from './components/BudgetPage'
import AIForecast from './components/AIForecast'
import SmartAlerts from './components/SmartAlerts'
import FloatChat from './components/FloatChat'
import InvestmentsPage from './components/investments/InvestmentsPage'
import InsurancePage from './components/InsurancePage'

function AppShell({ children }) {
  const navigate = useNavigate()

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Header />
        <div className="content-area">
          {children}
        </div>
      </div>

      <button
        className="fab-add-expense"
        onClick={() => navigate('/pay')}
        title="Send Payment"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>

      <FloatChat />
    </div>
  )
}

import SetSalaryModal from './components/SetSalaryModal'

function DashboardPage({ user }) {
  const [showSetup, setShowSetup] = useState(false);

  return (
    <div className="dashboard-v2">
      <SetSalaryModal user={user} forceOpen={showSetup} onClose={() => setShowSetup(false)} />
      
      {/* Financial Overview Section */}
      <section className="dashboard-section fade-in-up">
        <div className="section-header-top">
          <h2 className="section-title-top">
            <span style={{ fontSize: '1.2rem' }}>💰</span> Financial Overview
          </h2>
          <button 
            className="qa-btn" 
            onClick={() => setShowSetup(true)} 
            style={{ padding: '8px 16px', flexDirection: 'row', gap: '8px', width: 'auto', height: 'auto', background: 'white' }}
          >
              <div className="qa-icon" style={{ width: '22px', height: '22px', fontSize: '0.9rem', background: '#F3F4F6', color: '#6B7280' }}>⚙️</div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4B5563' }}>Wallet Settings</span>
          </button>
        </div>
        
        <HeroCards />
        <StatsCards />
      </section>

      {/* Analytics & Analysis */}
      <section className="dashboard-section fade-in-up stagger-2">
        <h2 className="section-title-top">
          <span style={{ fontSize: '1.2rem' }}>📈</span> Analytics & Insights
        </h2>
        <div className="analytics-section">
          <CategoryHub user={user} />
          <div className="charts-summary-row" style={{ display: 'flex', gap: '22px', alignItems: 'stretch' }}>
            <SummaryPie user={user} />
            <LineGraph user={user} />
          </div>
        </div>
        <AIInsights user={user} />
      </section>

      {/* Security & Activity */}
      <section className="dashboard-section fade-in-up stagger-3">
        <h2 className="section-title-top">
          <span style={{ fontSize: '1.2rem' }}>🛡️</span> Activity & Protection
        </h2>
        <Transactions />
      </section>
    </div>
  )
}

function AnalyticsPage() {
  return <SpendingAnalysis />
}

function ProtectedRoute({ session, children }) {
  if (!session) {
    return <Navigate to="/" replace />
  }
  return children
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <p style={{ fontWeight: 600, color: 'var(--primary)' }}>Loading securely...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage session={session} />} />
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage defaultMode="login" />} />
      <Route path="/signup" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage defaultMode="signup" />} />
      <Route path="/dashboard" element={<ProtectedRoute session={session}><AppShell><DashboardPage user={session?.user} /></AppShell></ProtectedRoute>} />
      <Route path="/pay" element={<ProtectedRoute session={session}><AppShell><PayScreen user={session?.user} /></AppShell></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute session={session}><AppShell><AnalyticsPage /></AppShell></ProtectedRoute>} />
      <Route path="/savings" element={<ProtectedRoute session={session}><AppShell><SavingsQuest /></AppShell></ProtectedRoute>} />
      <Route path="/investments" element={<ProtectedRoute session={session}><AppShell><InvestmentsPage user={session?.user} /></AppShell></ProtectedRoute>} />
      <Route path="/insurance" element={<ProtectedRoute session={session}><AppShell><InsurancePage /></AppShell></ProtectedRoute>} />
      <Route path="/budget" element={<ProtectedRoute session={session}><AppShell><BudgetPage user={session?.user} /></AppShell></ProtectedRoute>} />
      <Route path="/forecast" element={<ProtectedRoute session={session}><AppShell><AIForecast /></AppShell></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
