import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

function buildPath(data, width, height, padding, maxVal) {
    if (!data || data.length < 2) return { d: '', points: [] }
    const actualMax = maxVal || 1
    const stepX = (width - padding * 2) / (data.length - 1)
    const points = data.map((val, i) => ({
        x: padding + i * stepX,
        y: height - padding - ((val / actualMax) * (height - padding * 2))
    }))

    let d = `M ${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1], curr = points[i]
        const cpx1 = prev.x + stepX * 0.45, cpx2 = curr.x - stepX * 0.45
        d += ` C ${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`
    }
    return { d, points }
}

function buildAreaPath(d, points, width, height, padding) {
    if (!d || !points || points.length === 0) return ''
    return `${d} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`
}

export default function LineGraph({ user }) {
    const [activeTab, setActiveTab] = useState('Monthly')
    const [hoveredPoint, setHoveredPoint] = useState(null)
    const [months, setMonths] = useState([])
    const [incomeData, setIncomeData] = useState([])
    const [expenseData, setExpenseData] = useState([])
    const [loading, setLoading] = useState(true)

    const w = 600
    const h = 200
    const pad = 30

    const fetchData = useCallback(async () => {
        if (!user) return
        setLoading(true)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const now = new Date()
        const recentMonths = []
        for (let i = 8; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            recentMonths.push({ label: monthNames[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), income: 0, expense: 0 })
        }
        const { data } = await supabase.from('transactions').select('amount, type, created_at').eq('user_id', user.id).gte('created_at', new Date(recentMonths[0].year, recentMonths[0].month, 1).toISOString())
        if (data) {
            data.forEach(tx => {
                const txDate = new Date(tx.created_at)
                const bucket = recentMonths.find(m => m.month === txDate.getMonth() && m.year === txDate.getFullYear())
                if (bucket) { if (tx.type === 'income') bucket.income += Number(tx.amount); else bucket.expense += Number(tx.amount); }
            })
        }
        setMonths(recentMonths.map(m => m.label))
        setIncomeData(recentMonths.map(m => m.income / 1000))
        setExpenseData(recentMonths.map(m => m.expense / 1000))
        setLoading(false)
    }, [user])

    useEffect(() => {
        fetchData()
        const channel = supabase.channel('public:linegraph_final').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user?.id}` }, () => fetchData()).subscribe()
        return () => supabase.removeChannel(channel)
    }, [fetchData, user])

    const maxVal = Math.max(...incomeData, ...expenseData, 1) * 1.12
    const income = buildPath(incomeData, w, h, pad, maxVal)
    const expense = buildPath(expenseData, w, h, pad, maxVal)
    const incomeArea = buildAreaPath(income.d, income.points, w, h, pad)
    const expenseArea = buildAreaPath(expense.d, expense.points, w, h, pad)

    return (
        <div className="card line-graph-card glass-card perfect-analytics" style={{ flex: 1, padding: '24px', overflow: 'hidden' }}>
            <div className="line-graph-header" style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1a1a2e' }}>Financial Trend</h3>
                <div className="trend-badge" style={{ background: '#6366F115', color: '#6366F1', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800 }}>8-MONTH ANALYSIS</div>
            </div>
            
            <div className="line-graph-container" style={{ position: 'relative' }}>
                {loading ? <div style={{ height: h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="auth-spinner" /></div> : (
                    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }} onMouseLeave={() => setHoveredPoint(null)}>
                        <defs>
                            <pattern id="dotGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                                <circle cx="2" cy="2" r="1" fill="#e2e8f0" />
                            </pattern>
                            <linearGradient id="incomeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2F80ED" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#2F80ED" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="expenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#EB5757" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="#EB5757" stopOpacity="0" />
                            </linearGradient>
                            <filter id="perfectGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                        </defs>

                        {/* Dot Grid Background */}
                        <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} fill="url(#dotGrid)" />

                        {/* X-Axis labels */}
                        {months.map((m, i) => (
                            <text key={i} x={pad + i * ((w - pad * 2) / (months.length - 1))} y={h - 4} fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="600">{m}</text>
                        ))}

                        {/* Graph Areas */}
                        <path d={incomeArea} fill="url(#incomeAreaGrad)" style={{ transition: 'all 0.5s ease' }} />
                        <path d={expenseArea} fill="url(#expenseAreaGrad)" style={{ transition: 'all 0.5s ease' }} />

                        {/* Graph Lines */}
                        <path d={income.d} fill="none" stroke="#2F80ED" strokeWidth="3.5" strokeLinecap="round" filter="url(#perfectGlow)" />
                        <path d={expense.d} fill="none" stroke="#EB5757" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="6 4" filter="url(#perfectGlow)" opacity="0.8" />

                        {/* Interactive Markers */}
                        {income.points.map((pt, i) => (
                            <g key={i} onMouseEnter={() => setHoveredPoint(i)} style={{ cursor: 'pointer' }}>
                                <circle cx={pt.x} cy={pt.y} r={hoveredPoint === i ? 6 : 0} fill="#2F80ED" stroke="white" strokeWidth="2" />
                                {hoveredPoint === i && (
                                    <g>
                                        <rect x={pt.x - 45} y={pt.y - 45} width="90" height="32" rx="10" fill="#1e1e2d" style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }} />
                                        <text x={pt.x} y={pt.y - 25} fill="white" fontSize="11" fontWeight="800" textAnchor="middle">₹{(incomeData[i] * 1000).toLocaleString()}</text>
                                    </g>
                                )}
                            </g>
                        ))}
                    </svg>
                )}
            </div>
            <div className="chart-legend" style={{ display: 'flex', gap: '24px', marginTop: '12px', paddingLeft: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700 }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2F80ED', boxShadow: '0 0 10px rgba(47, 128, 237, 0.5)' }} /> Income</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700 }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EB5757', boxShadow: '0 0 10px rgba(235, 87, 87, 0.5)' }} /> Expenses</div>
            </div>
        </div>
    )
}
