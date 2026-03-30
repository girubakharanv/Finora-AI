import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import AuthPage from './components/AuthPage'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import BalanceCard from './components/BalanceCard'
import Mascot from './components/Mascot'
import StatsCards from './components/StatsCards'
import ChartWidget from './components/ChartWidget'
import Transactions from './components/Transactions'

function Dashboard() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Header />
        <div className="content-area">
          <div className="dashboard-grid">
            <BalanceCard />
            <Mascot />
            <StatsCards />
            <ChartWidget />
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
