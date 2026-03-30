import React, { useState } from 'react'
import './SpendingAnalysis.css'

const allCategories = [
    { id: 'all', emoji: '📊', name: 'All' },
    { id: 'food', emoji: '🍔', name: 'Food' },
    { id: 'travel', emoji: '🚗', name: 'Travel' },
    { id: 'shopping', emoji: '🛒', name: 'Shopping' },
    { id: 'bills', emoji: '⚡', name: 'Bills' },
    { id: 'entertainment', emoji: '🎬', name: 'Entertainment' },
]

const weeklyData = [
    { day: 'Mon', thisMonth: 1200, lastMonth: 800 },
    { day: 'Tue', thisMonth: 2400, lastMonth: 1900 },
    { day: 'Wed', thisMonth: 800, lastMonth: 1200 },
    { day: 'Thu', thisMonth: 3100, lastMonth: 2200 },
    { day: 'Fri', thisMonth: 2600, lastMonth: 3000 },
    { day: 'Sat', thisMonth: 4200, lastMonth: 2800 },
    { day: 'Sun', thisMonth: 1500, lastMonth: 1600 },
]

const pieData = [
    { name: 'Food & Dining', pct: 35, amount: '₹21,320', color: '#FF7EB3' },
    { name: 'Shopping', pct: 22, amount: '₹16,750', color: '#7C83FF' },
    { name: 'Bills & Utilities', pct: 20, amount: '₹15,230', color: '#7DDBA3' },
    { name: 'Transport', pct: 13, amount: '₹11,420', color: '#FFD97D' },
    { name: 'Entertainment', pct: 10, amount: '₹7,430', color: '#C3A6F7' },
]

function buildConicGradient(data) {
    let cum = 0
    const stops = []
    data.forEach(item => {
        stops.push(`${item.color} ${cum}%`)
        cum += item.pct
        stops.push(`${item.color} ${cum}%`)
    })
    return `conic-gradient(${stops.join(', ')})`
}

const mascotReactions = {
    all: { face: '🦊', msg: 'You spent more on food this week 😅', mood: '😅' },
    food: { face: '🤤', msg: 'Foodie alert! Try cooking at home twice this week 🍳', mood: '🍳' },
    travel: { face: '🦊', msg: 'Travel spending is down 12%! Nice one 🎉', mood: '🎉' },
    shopping: { face: '😳', msg: 'Online shopping went up. Maybe a no-buy week? 💡', mood: '💡' },
    bills: { face: '🦊', msg: 'Bills are steady. Good budget management! ✅', mood: '✅' },
    entertainment: { face: '😎', msg: 'Entertainment is under budget. Treat yourself! 🎬', mood: '🎬' },
}

export default function SpendingAnalysis() {
    const [activeCat, setActiveCat] = useState('all')
    const [period, setPeriod] = useState('This Month')

    const maxVal = Math.max(...weeklyData.flatMap(d => [d.thisMonth, d.lastMonth]))
    const reaction = mascotReactions[activeCat]

    return (
        <div className="analytics-page">
            {/* Header Row */}
            <div className="analytics-header-row fade-in-up">
                <h2>Spending Analysis 📊</h2>
                <div className="analytics-period-selector">
                    {['This Week', 'This Month', 'This Year'].map(p => (
                        <button
                            key={p}
                            className={`period-btn ${period === p ? 'active' : ''}`}
                            onClick={() => setPeriod(p)}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Category Tabs */}
            <div className="cat-tabs fade-in-up stagger-1">
                {allCategories.map(cat => (
                    <button
                        key={cat.id}
                        className={`cat-tab ${activeCat === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCat(cat.id)}
                    >
                        <span className="tab-emoji">{cat.emoji}</span>
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Summary Cards */}
            <div className="analytics-summary-row fade-in-up stagger-2">
                <div className="card summary-card">
                    <div className="summary-card-icon pink">💸</div>
                    <div className="summary-card-info">
                        <h4>Total Spent</h4>
                        <div className="summary-value">₹76,150</div>
                        <div className="summary-change down">↑ 8.2% vs last month</div>
                    </div>
                </div>
                <div className="card summary-card">
                    <div className="summary-card-icon blue">📉</div>
                    <div className="summary-card-info">
                        <h4>Daily Average</h4>
                        <div className="summary-value">₹2,538</div>
                        <div className="summary-change up">↓ 3.1% vs last month</div>
                    </div>
                </div>
                <div className="card summary-card">
                    <div className="summary-card-icon green">🎯</div>
                    <div className="summary-card-info">
                        <h4>Budget Used</h4>
                        <div className="summary-value">76%</div>
                        <div className="summary-change up">₹23,850 remaining</div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="analytics-charts-grid fade-in-up stagger-3">
                {/* Bar Chart */}
                <div className="card bar-chart-card">
                    <h3>
                        Weekly Comparison
                        <span>This month vs Last month</span>
                    </h3>
                    <div className="bar-chart-container">
                        {weeklyData.map((d, i) => (
                            <div className="bar-group" key={i}>
                                <div className="bar-pair">
                                    <div
                                        className="abar this-month"
                                        style={{
                                            height: `${(d.thisMonth / maxVal) * 200}px`,
                                            animationDelay: `${i * 0.08}s`,
                                        }}
                                    >
                                        <span className="abar-tooltip">₹{(d.thisMonth / 1000).toFixed(1)}k</span>
                                    </div>
                                    <div
                                        className="abar last-month"
                                        style={{
                                            height: `${(d.lastMonth / maxVal) * 200}px`,
                                            animationDelay: `${i * 0.08 + 0.04}s`,
                                        }}
                                    >
                                        <span className="abar-tooltip">₹{(d.lastMonth / 1000).toFixed(1)}k</span>
                                    </div>
                                </div>
                                <span className="bar-label">{d.day}</span>
                            </div>
                        ))}
                    </div>
                    <div className="bar-chart-legend">
                        <div className="bar-chart-legend-item">
                            <span className="bar-chart-legend-dot" style={{ background: 'var(--primary)' }} />
                            This Month
                        </div>
                        <div className="bar-chart-legend-item">
                            <span className="bar-chart-legend-dot" style={{ background: '#E0C3FC' }} />
                            Last Month
                        </div>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="card analysis-pie-card">
                    <h3>Category Breakdown</h3>
                    <div className="analysis-pie-visual">
                        <div
                            className="analysis-donut"
                            style={{ background: buildConicGradient(pieData) }}
                        >
                            <div className="analysis-donut-center">
                                <span className="donut-emoji">{pieData[0].color === '#FF7EB3' ? '🍔' : '📊'}</span>
                                <span className="donut-pct">{pieData[0].pct}%</span>
                                <span className="donut-label">Top category</span>
                            </div>
                        </div>

                        <div className="analysis-pie-legend">
                            {pieData.map((item, i) => (
                                <div className="analysis-pie-legend-item" key={i}>
                                    <div className="analysis-pie-legend-left">
                                        <span className="legend-dot" style={{ background: item.color }} />
                                        <span className="legend-name">{item.name}</span>
                                    </div>
                                    <span className="analysis-pie-legend-right">{item.amount}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Top Spending + Mascot */}
            <div className="analytics-bottom-row fade-in-up stagger-4">
                {/* Top Spending Highlight */}
                <div className="card top-spending-card">
                    <div className="top-spending-label">🏆 Top Spending Category</div>
                    <div className="top-spending-category">
                        <span className="ts-emoji">🍔</span>
                        <span className="ts-name">Food & Dining</span>
                    </div>
                    <div className="top-spending-amount">₹21,320</div>
                    <div className="top-spending-badge">
                        ↑ 12% compared to last month
                    </div>
                </div>

                {/* Mascot Reaction */}
                <div className="card mascot-reaction-card">
                    <div className="reaction-mascot">{reaction.face}</div>
                    <div className="reaction-speech">
                        <p>{reaction.msg}</p>
                    </div>
                    <div className="reaction-tips">
                        <div className="reaction-tip-chip">
                            <span className="tip-icon">💡</span>
                            Set a weekly food budget of ₹5,000
                        </div>
                        <div className="reaction-tip-chip">
                            <span className="tip-icon">🎯</span>
                            You're 76% through your monthly budget
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
