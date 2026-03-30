import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './App.css'
import AuthPage from './components/AuthPage'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import HeroCards from './components/HeroCards'
import StatsCards from './components/StatsCards'
import PieChart from './components/PieChart'
import LineGraph from './components/LineGraph'
import AIInsights from './components/AIInsights'
import Transactions from './components/Transactions'
import AddExpense from './components/AddExpense'
import SpendingAnalysis from './components/SpendingAnalysis'
import SavingsQuest from './components/SavingsQuest'
import AIForecast from './components/AIForecast'
import SmartAlerts from './components/SmartAlerts'
import FloatChat from './components/FloatChat'

function AppShell({ children }) {
  const [showExpense, setShowExpense] = useState(false)

  return (
    <div className="app-layout">
      <Sidebar onAddClick={() => setShowExpense(true)} />
      <div className="main-area">
        <Header />
        <div className="content-area">
          {children}
        </div>
      </div>

      <button
        className="fab-add-expense"
        onClick={() => setShowExpense(true)}
        title="Add Expense"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <AddExpense isOpen={showExpense} onClose={() => setShowExpense(false)} />
      <FloatChat />
    </div>
  )
}

function DashboardPage() {
  return (
    <div className="dashboard-v2">
      <HeroCards />
      <StatsCards />
      <div className="charts-row">
        <PieChart />
        <LineGraph />
      </div>
      <AIInsights />
      <SmartAlerts />
      <Transactions />
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
      <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/dashboard" element={<ProtectedRoute session={session}><AppShell><DashboardPage /></AppShell></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute session={session}><AppShell><AnalyticsPage /></AppShell></ProtectedRoute>} />
      <Route path="/savings" element={<ProtectedRoute session={session}><AppShell><SavingsQuest /></AppShell></ProtectedRoute>} />
      <Route path="/forecast" element={<ProtectedRoute session={session}><AppShell><AIForecast /></AppShell></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
