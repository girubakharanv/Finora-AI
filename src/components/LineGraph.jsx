import React from 'react'

const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
const incomeData = [52, 60, 55, 70, 65, 80, 75, 82, 88]
const expenseData = [38, 50, 42, 48, 55, 45, 52, 48, 50]

function buildPath(data, width, height, padding) {
    const maxVal = Math.max(...incomeData, ...expenseData) * 1.15
    const stepX = (width - padding * 2) / (data.length - 1)
    const points = data.map((val, i) => {
        const x = padding + i * stepX
        const y = height - padding - ((val / maxVal) * (height - padding * 2))
        return { x, y }
    })

    let d = `M ${points[0].x},${points[0].y}`
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        const cpx1 = prev.x + stepX * 0.4
        const cpx2 = curr.x - stepX * 0.4
        d += ` C ${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`
    }
    return { d, points }
}

function buildAreaPath(d, points, width, height, padding) {
    const lastPt = points[points.length - 1]
    const firstPt = points[0]
    return `${d} L ${lastPt.x},${height - padding} L ${firstPt.x},${height - padding} Z`
}

export default function LineGraph() {
    const [activeTab, setActiveTab] = React.useState('Monthly')
    const [hoveredPoint, setHoveredPoint] = React.useState(null)
    const tabs = ['Weekly', 'Monthly', 'Yearly']

    const w = 560
    const h = 260
    const pad = 36

    const income = buildPath(incomeData, w, h, pad)
    const expense = buildPath(expenseData, w, h, pad)
    const incomeArea = buildAreaPath(income.d, income.points, w, h, pad)
    const expenseArea = buildAreaPath(expense.d, expense.points, w, h, pad)

    const maxVal = Math.max(...incomeData, ...expenseData) * 1.15
    const gridLines = [0.25, 0.5, 0.75, 1.0]

    return (
        <div className="card line-graph-card fade-in-up stagger-5">
            <div className="line-graph-header">
                <h3>Monthly Trend</h3>
                <div className="chart-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            className={`chart-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="line-graph-container">
                <svg
                    viewBox={`0 0 ${w} ${h}`}
                    className="line-graph-svg"
                    onMouseLeave={() => setHoveredPoint(null)}
                >
                    <defs>
                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7C83FF" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#7C83FF" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF7EB3" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#FF7EB3" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Grid */}
                    {gridLines.map((frac, i) => {
                        const y = h - pad - frac * (h - pad * 2)
                        const label = `${Math.round(frac * maxVal)}k`
                        return (
                            <g key={i}>
                                <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#EDE9FE" strokeWidth="1" />
                                <text x={pad - 8} y={y + 4} fill="#A9A8BD" fontSize="9" textAnchor="end" fontFamily="Poppins">{label}</text>
                            </g>
                        )
                    })}

                    {/* Month labels */}
                    {months.map((m, i) => {
                        const x = pad + i * ((w - pad * 2) / (months.length - 1))
                        return (
                            <text key={i} x={x} y={h - 10} fill="#A9A8BD" fontSize="10" textAnchor="middle" fontFamily="Poppins">{m}</text>
                        )
                    })}

                    {/* Area fills */}
                    <path d={incomeArea} fill="url(#incomeGrad)" />
                    <path d={expenseArea} fill="url(#expenseGrad)" />

                    {/* Lines */}
                    <path d={income.d} fill="none" stroke="#7C83FF" strokeWidth="2.5" strokeLinecap="round" />
                    <path d={expense.d} fill="none" stroke="#FF7EB3" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 4" />

                    {/* Income dots */}
                    {income.points.map((pt, i) => (
                        <g key={`inc-${i}`}>
                            <circle
                                cx={pt.x} cy={pt.y} r={hoveredPoint === i ? 6 : 4}
                                fill="white" stroke="#7C83FF" strokeWidth="2.5"
                                style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                                onMouseEnter={() => setHoveredPoint(i)}
                            />
                            {hoveredPoint === i && (
                                <g>
                                    <rect x={pt.x - 35} y={pt.y - 32} width="70" height="24" rx="8" fill="#7C83FF" />
                                    <text x={pt.x} y={pt.y - 16} fill="white" fontSize="10" fontWeight="600" textAnchor="middle" fontFamily="Poppins">
                                        ₹{incomeData[i]}k
                                    </text>
                                </g>
                            )}
                        </g>
                    ))}

                    {/* Expense dots */}
                    {expense.points.map((pt, i) => (
                        <circle
                            key={`exp-${i}`}
                            cx={pt.x} cy={pt.y} r={3}
                            fill="#FF7EB3" stroke="white" strokeWidth="1.5"
                        />
                    ))}
                </svg>
            </div>

            <div className="chart-legend" style={{ marginTop: '12px' }}>
                <div className="chart-legend-item">
                    <span className="chart-legend-dot" style={{ background: '#7C83FF' }} />
                    Income
                </div>
                <div className="chart-legend-item">
                    <span className="chart-legend-dot" style={{ background: '#FF7EB3' }} />
                    Expenses
                </div>
            </div>
        </div>
    )
}
