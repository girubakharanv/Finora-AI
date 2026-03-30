import './App.css'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import BalanceCard from './components/BalanceCard'
import Mascot from './components/Mascot'
import StatsCards from './components/StatsCards'
import ChartWidget from './components/ChartWidget'
import Transactions from './components/Transactions'

function App() {
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

export default App
