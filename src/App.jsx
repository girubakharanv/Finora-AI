import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
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

function Dashboard() {
  const [showExpense, setShowExpense] = useState(false)

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Header />
        <div className="content-area">
          <div className="dashboard-v2">
            <HeroCards />
            <StatsCards />
            <div className="charts-row">
              <PieChart />
              <LineGraph />
            </div>
            <AIInsights />
            <Transactions />
          </div>
        </div>
      </div>

      {/* FAB: Add Expense */}
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

      {/* Add Expense Modal */}
      <AddExpense isOpen={showExpense} onClose={() => setShowExpense(false)} />
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
