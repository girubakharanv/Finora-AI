import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { STOCKS } from './investmentsData'
import './Investments.css'

export default function InvestmentsPage({ user }) {
    const [view, setView] = useState('overview')
    const [walletBalance, setWalletBalance] = useState(0)
    const [savingsBalance, setSavingsBalance] = useState(0)
    const [salary, setSalary] = useState(0)
    const [expenses, setExpenses] = useState(0)
    const [portfolio, setPortfolio] = useState([])
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    // Profile & Risk States
    const [riskProfile, setRiskProfile] = useState('All')

    // Modal States
    const [selectedStock, setSelectedStock] = useState(null)
    const [investShares, setInvestShares] = useState('')
    const [processing, setProcessing] = useState(false)

    // Simulator State
    const [simAmount, setSimAmount] = useState(10000)
    const [simYears, setSimYears] = useState(5)
    
    // SIP State
    const [sipAmount, setSipAmount] = useState(5000)

    useEffect(() => {
        if (user) {
            fetchUserData()
            fetchPortfolio()
        }
    }, [user])

    const fetchUserData = async () => {
        // Fetch profile
        const { data: prof } = await supabase
            .from('profiles')
            .select('balance, salary')
            .eq('id', user.id)
            .single()

        if (prof) {
            setWalletBalance(Number(prof.balance) || 0)
            setSalary(Number(prof.salary) || 0)
        }

        // Fetch current month expenses for AI calculation
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        const { data: txs } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('type', 'expense')
            .gte('created_at', start)
            .lte('created_at', end)

        if (txs) {
            const totalExp = txs.reduce((acc, curr) => acc + Number(curr.amount), 0)
            setExpenses(totalExp)
        }

        const { data: svData } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('type', 'transfer')
            .eq('category', 'Savings')

        if (svData) {
            const totalSave = svData.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
            setSavingsBalance(totalSave)
        }
    }

    const fetchPortfolio = async () => {
        const { data } = await supabase
            .from('investments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })

        if (data) {
            setPortfolio(data)
        }
    }

    const handleInvest = async (e) => {
        e.preventDefault()
        setErrorMsg('')
        const shares = Number(investShares)

        if (!shares || shares <= 0 || !Number.isInteger(shares)) {
            setErrorMsg('Enter a valid whole number of shares')
            return
        }

        const amt = shares * selectedStock.price

        if (amt > savingsBalance) {
            setErrorMsg(`Insufficient Savings balance. You need ${formatINR(amt)}!`)
            return
        }

        setProcessing(true)
        try {
            const expectReturn = selectedStock ? amt + (amt * selectedStock.dailyChange / 100) : null
            const invType = selectedStock ? selectedStock.type : view === 'sip' ? 'sip' : 'ai'
            const stockName = selectedStock ? `${selectedStock.name} (${shares} shares)` : 'Custom Plan'

            // 1. Deduct from Savings Ledger
            const { error: txErr } = await supabase
                .from('transactions')
                .insert({
                    user_id: user.id,
                    amount: -amt, // Negative to decrease the sum
                    type: 'transfer',
                    category: 'Savings',
                    description: `Invested in ${stockName}`,
                    status: 'completed'
                })

            if (txErr) throw txErr

            // 2. Insert Investment
            const { error: invErr } = await supabase
                .from('investments')
                .insert({
                    user_id: user.id,
                    stock_name: stockName,
                    amount: amt,
                    type: invType,
                    expected_return: expectReturn
                })

            if (invErr) throw invErr

            // Success
            setSavingsBalance(prev => prev - amt)
            setInvestShares('')
            setSelectedStock(null)
            fetchPortfolio()
            setView('portfolio')

        } catch (err) {
            setErrorMsg(err.message || 'Investment failed')
        }
        setProcessing(false)
    }

    // View Components

    const formatINR = (n) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

    const filteredStocks = useMemo(() => {
        let base = STOCKS
        if (view === 'short') base = STOCKS.filter(s => s.type === 'short')
        if (view === 'long') base = STOCKS.filter(s => s.type === 'long')
        
        if (riskProfile !== 'All') {
            base = base.filter(s => s.risk.toLowerCase() === riskProfile.toLowerCase())
        }
        return base
    }, [view, riskProfile])

    const renderStockCard = (stock) => (
        <div key={stock.id} className="stock-card" onClick={() => setSelectedStock(stock)}>
            <div className="stock-header">
                <span className="stock-name">{stock.name}</span>
                <span className="stock-price">{formatINR(stock.price)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`stock-change ${stock.dailyChange >= 0 ? 'positive' : 'negative'}`}>
                    {stock.dailyChange >= 0 ? '▲' : '▼'} {Math.abs(stock.dailyChange)}%
                </span>
                {stock.type === 'long' && (
                    <div style={{color: '#F59E0B', fontSize: '1.1rem'}}>{'⭐'.repeat(stock.rating || 0)}</div>
                )}
                <div className="stock-tags">
                    <span className={`stock-tag tag-risk-${stock.risk.toLowerCase()}`}>{stock.risk}</span>
                    <span className={`stock-tag tag-rec-${stock.recommendation.toLowerCase()}`}>{stock.recommendation}</span>
                </div>
            </div>
        </div>
    )

    const renderTopBar = (title) => (
        <div className="inv-header">
            <h1>
                <button className="inv-back-btn" onClick={() => { setView('overview'); setRiskProfile('All') }}>←</button>
                {title}
            </h1>
            <div style={{ fontWeight: 600, color: '#4B5563', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🐷</span>
                Savings: {formatINR(savingsBalance)}
            </div>
        </div>
    )

    const renderRiskFilter = () => (
        <div className="inv-filters">
            {['All', 'Safe', 'Moderate', 'Aggressive'].map(r => (
                <button
                    key={r}
                    className={`inv-filter-btn ${riskProfile === r ? 'active' : ''}`}
                    onClick={() => setRiskProfile(r)}
                >
                    {r}
                </button>
            ))}
        </div>
    )

    const renderOverview = () => (
        <>
            <div className="inv-header">
                <h1><div className="inv-header-icon">📈</div> Investment Hub</h1>
                <div style={{ fontWeight: 600, color: '#4B5563', display: 'flex', alignItems: 'center', gap: '8px', background: '#F3F4F6', padding: '8px 16px', borderRadius: '12px' }}>
                    <span>Savings Balance:</span>
                    <span style={{ color: '#111827' }}>{formatINR(savingsBalance)}</span>
                </div>
            </div>

            {/* Portfolio Snapshot */}
            <div className="portfolio-card" onClick={() => setView('portfolio')} style={{ cursor: 'pointer' }}>
                <div className="portfolio-stat">
                    <p>Total Invested</p>
                    <h2>{formatINR(portfolio.reduce((acc, curr) => acc + Number(curr.amount), 0))}</h2>
                </div>
                <div className="portfolio-stat">
                    <p>Estimated Growth</p>
                    <h2 className="portfolio-profit">
                        {portfolio.length > 0 ? '+12.4%' : '0.0%'}
                    </h2>
                </div>
                <button className="inv-filter-btn" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}>
                    View Portfolio →
                </button>
            </div>

            <h3 style={{ margin: '0 0 20px 0', color: '#1F2937' }}>Explore Categories</h3>
            <div className="inv-grid">
                <div className="inv-card" onClick={() => setView('short')}>
                    <div className="inv-card-icon" style={{ background: '#FEF2F2', color: '#EF4444' }}>⚡</div>
                    <h3>Short-Term Plays</h3>
                    <p>High liquidity, quick momentum stocks for faster returns.</p>
                </div>
                <div className="inv-card" onClick={() => setView('long')}>
                    <div className="inv-card-icon" style={{ background: '#ECFCCB', color: '#65A30D' }}>🌱</div>
                    <h3>Long-Term Wealth</h3>
                    <p>Stable, blue-chip stocks designed for compounding over years.</p>
                </div>
                <div className="inv-card" onClick={() => setView('sip')}>
                    <div className="inv-card-icon" style={{ background: '#E0E7FF', color: '#4F46E5' }}>🔄</div>
                    <h3>SIP / Monthly</h3>
                    <p>Automate your wealth creation with regular investments.</p>
                </div>
                <div className="inv-card" onClick={() => setView('ai')}>
                    <div className="inv-card-icon" style={{ background: '#FDF4FF', color: '#C026D3' }}>🧠</div>
                    <h3>AI Recommended</h3>
                    <p>Personalized suggestions based on your salary and spending.</p>
                </div>
                <div className="inv-card" onClick={() => setView('simulator')}>
                    <div className="inv-card-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>🧮</div>
                    <h3>Profit Simulator</h3>
                    <p>Calculate potential returns using our magic formula tool.</p>
                </div>
            </div>
        </>
    )

    const renderStockList = (title) => (
        <>
            {renderTopBar(title)}
            {renderRiskFilter()}
            <div className="stock-grid">
                {filteredStocks.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1', color: '#6B7280' }}>
                        No stocks found for this risk profile.
                    </div>
                ) : (
                    filteredStocks.map(renderStockCard)
                )}
            </div>
        </>
    )

    const renderSip = () => {
        const rate = 0.12 // 12% avg return
        const annualInvest = sipAmount * 12
        const estYearlyOutput = annualInvest * (1 + rate)

        return (
            <>
                {renderTopBar('SIP Planner')}
                <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #E5E7EB' }}>
                    <div className="inv-input-group">
                        <label>Monthly Investment Amount</label>
                        <div className="inv-input-wrapper">
                            <span className="inv-currency-symbol">₹</span>
                            <input 
                                className="inv-input" 
                                type="number" 
                                value={sipAmount} 
                                onChange={e => setSipAmount(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="sim-box" style={{ background: '#EEF2FF', borderColor: '#C7D2FE' }}>
                        <h4>Estimated Value in 1 Year</h4>
                        <h2 style={{ color: '#4F46E5' }}>{formatINR(estYearlyOutput)}</h2>
                        <p style={{ color: '#6366F1' }}>Invested: {formatINR(annualInvest)}</p>
                    </div>

                    <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>Suggested SIP Funds</h3>
                    <div className="stock-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {STOCKS.filter(s => s.type === 'long').slice(0, 3).map(renderStockCard)}
                    </div>
                </div>
            </>
        )
    }

    const renderSimulator = () => {
        const rate = 0.15 // 15% return for demo
        const finalValue = simAmount * Math.pow((1 + rate), simYears)
        const profit = finalValue - simAmount

        return (
            <>
                {renderTopBar('Profit Simulator')}
                <div style={{ maxWidth: '600px', margin: '0 auto', background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #E5E7EB' }}>
                    <div className="inv-input-group">
                        <label>One-time Investment</label>
                        <div className="inv-input-wrapper">
                            <span className="inv-currency-symbol">₹</span>
                            <input className="inv-input" type="number" value={simAmount} onChange={e => setSimAmount(Number(e.target.value))} />
                        </div>
                    </div>
                    <div className="inv-input-group">
                        <label>Duration (Years)</label>
                        <input className="inv-input" style={{ paddingLeft: '16px' }} type="number" value={simYears} onChange={e => setSimYears(Number(e.target.value))} />
                    </div>

                    <div className="sim-box" style={{ background: '#ECFCCB', borderColor: '#BEF264' }}>
                        <h4 style={{ color: '#4D7C0F' }}>Estimated Returns</h4>
                        <h2 style={{ color: '#3F6212' }}>{formatINR(finalValue)}</h2>
                        <p style={{ color: '#65A30D' }}>Profit: {formatINR(profit)} (+{(Math.pow((1+rate), simYears) * 100 - 100).toFixed(0)}%)</p>
                    </div>
                </div>
            </>
        )
    }

    const renderAi = () => {
        const remaining_balance = walletBalance - expenses
        const recSip = remaining_balance > 0 ? remaining_balance * 0.2 : 0

        return (
            <>
                {renderTopBar('AI Recommendations')}
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div className="ai-recommend-box" style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '-30px', right: '10px', fontSize: '4rem', animation: 'bounce 2s infinite' }}>🦊</div>
                        <h2>Magic Number Found! 🪄</h2>
                        <p>Based on your salary and recent expenses, you can safely invest</p>
                        <h1 style={{ fontSize: '3rem', margin: '16px 0', color: '#701A75' }}>{formatINR(recSip)}</h1>
                        <p>this month without hurting your lifestyle.</p>
                    </div>

                    <h3 style={{ marginTop: '32px', marginBottom: '16px' }}>AI Top Picks For You</h3>
                    <div className="stock-grid">
                        {STOCKS.slice(0, 2).map(renderStockCard)}
                    </div>
                </div>
            </>
        )
    }

    const renderPortfolio = () => (
        <>
            {renderTopBar('My Investments')}
            <div className="portfolio-card" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #312E81 100%)' }}>
                <div className="portfolio-stat">
                    <p style={{ color: '#C7D2FE' }}>Total Capital Invested</p>
                    <h2>{formatINR(portfolio.reduce((acc, curr) => acc + Number(curr.amount), 0))}</h2>
                </div>
                <div className="portfolio-stat">
                    <p style={{ color: '#C7D2FE' }}>Current Value</p>
                    <h2 className="portfolio-profit" style={{ color: '#A7F3D0' }}>
                        {formatINR(portfolio.reduce((acc, curr) => acc + Number(curr.amount) * 1.05, 0))}
                    </h2>
                </div>
            </div>

            <h3 style={{ margin: '0 0 20px 0' }}>Holding History</h3>
            <div className="portfolio-list">
                {portfolio.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                        <span style={{ fontSize: '2rem' }}>📭</span>
                        <p style={{ color: '#6B7280', margin: '8px 0 0 0' }}>No investments made yet.</p>
                    </div>
                ) : (
                    portfolio.map(inv => (
                        <div key={inv.id} className="portfolio-item">
                            <div className="pi-left">
                                <div className="pi-icon">📈</div>
                                <div className="pi-info">
                                    <h4>{inv.stock_name}</h4>
                                    <p>{new Date(inv.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="pi-right">
                                <h4>{formatINR(inv.amount)}</h4>
                                <p className="pi-profit">+5.0%</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
    )

    const renderModal = () => {
        if (!selectedStock) return null
        return (
            <div className="inv-modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) setSelectedStock(null) }}>
                <div className="inv-modal-card">
                    <button className="inv-modal-close" onClick={() => setSelectedStock(null)}>×</button>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h2 className="inv-modal-title" style={{ margin: 0 }}>{selectedStock.name}</h2>
                        <span className="stock-price">{formatINR(selectedStock.price)}</span>
                    </div>
                    
                    <div className="stock-tags" style={{ marginBottom: '16px' }}>
                        <span className={`stock-tag tag-risk-${selectedStock.risk.toLowerCase()}`}>Risk: {selectedStock.risk}</span>
                        <span className={`stock-tag tag-growth-${selectedStock.growthLabel.toLowerCase()}`}>Growth: {selectedStock.growthLabel}</span>
                    </div>

                    <div className="inv-modal-desc">
                        <p><strong>Why we recommend:</strong> {selectedStock.description}</p>
                        <p style={{marginTop: '8px'}}><strong>Risk Explanation:</strong> {selectedStock.riskExplanation}</p>
                        <p style={{marginTop: '8px', color: '#059669'}}><strong>Expected Growth:</strong> {selectedStock.expectedGrowth}</p>
                    </div>

                    <form onSubmit={handleInvest}>
                        {errorMsg && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.9rem' }}>{errorMsg}</div>}
                        
                        <div className="inv-input-group">
                            <label>Number of Shares</label>
                            <div className="inv-input-wrapper">
                                <span className="inv-currency-symbol" style={{fontSize: '1rem'}}>#</span>
                                <input 
                                    className="inv-input" 
                                    type="number" 
                                    placeholder="0"
                                    min="1"
                                    step="1"
                                    value={investShares} 
                                    onChange={e => setInvestShares(e.target.value)}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6B7280', marginTop: '12px' }}>
                                <span>Total Cost: <strong style={{color: '#111827'}}>{investShares ? formatINR(Number(investShares) * selectedStock.price) : '₹0'}</strong></span>
                                <span>Savings: {formatINR(savingsBalance)}</span>
                            </div>
                        </div>

                        <button type="submit" className="inv-primary-btn" disabled={processing}>
                            {processing ? 'Processing...' : `Buy ${investShares || 0} Shares`}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="investments-page">
            {view === 'overview' && renderOverview()}
            {view === 'short' && renderStockList('Short-Term Investments')}
            {view === 'long' && renderStockList('Long-Term Investments')}
            {view === 'sip' && renderSip()}
            {view === 'simulator' && renderSimulator()}
            {view === 'ai' && renderAi()}
            {view === 'portfolio' && renderPortfolio()}

            {renderModal()}
        </div>
    )
}
