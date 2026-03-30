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

function Dashboard() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Header />
        <div className="content-area">
          <div className="dashboard-v2">
            {/* Hero Cards: Total Balance, Monthly Expense, Savings */}
            <HeroCards />

            {/* Small Stats Row */}
            <StatsCards />

            {/* Charts: Pie + Line */}
            <div className="charts-row">
              <PieChart />
              <LineGraph />
            </div>

            {/* AI Insights + Quick Stats */}
            <AIInsights />

            {/* Recent Activity */}
            <Transactions />
          </div>
        </div>
      </div>
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
