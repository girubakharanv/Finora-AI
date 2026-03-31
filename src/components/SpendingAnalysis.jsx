import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import './SpendingAnalysis.css'

const allCategories = [
    { id: 'all',           emoji: '📊', name: 'All',           dbKey: null },
    { id: 'food',          emoji: '🍔', name: 'Food',          dbKey: 'Food & Dining' },
    { id: 'travel',        emoji: '🚗', name: 'Travel',        dbKey: 'Transport' },
    { id: 'shopping',      emoji: '🛒', name: 'Shopping',      dbKey: 'Shopping' },
    { id: 'bills',         emoji: '⚡', name: 'Bills',         dbKey: 'Bills' },
    { id: 'entertainment', emoji: '🎬', name: 'Entertainment', dbKey: 'Entertainment' },
]

const catBudgetKey = {
    food: 'Food',
    travel: 'Travel',
    shopping: 'Shopping',
    bills: 'Bills',
    entertainment: 'Entertainment',
}

const pieColors = ['#6366F1', '#F472B6', '#34D399', '#FBBF24', '#60A5FA']

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

export default function SpendingAnalysis() {
    const [activeCat, setActiveCat] = useState('all')
    const [period, setPeriod]       = useState('This Month')
    const [txs, setTxs]             = useState([])
    const [budgets, setBudgets]     = useState([])
    const [controlMode, setControlMode] = useState(false)
    const [loading, setLoading]     = useState(true)

    const fetchData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setLoading(true)

        const now   = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        const [txRes, budgetRes] = await Promise.all([
            supabase.from('transactions')
                .select('amount, category, created_at')
                .eq('user_id', user.id)
                .eq('type', 'expense')
                .gte('created_at', start)
                .lte('created_at', end),
            supabase.from('budgets')
                .select('category, limit_amount')
                .eq('user_id', user.id),
        ])

        if (txRes.data)    setTxs(txRes.data)
        if (budgetRes.data) setBudgets(budgetRes.data)
        setLoading(false)
    }, [period])

    useEffect(() => {
        fetchData()

        const sub = supabase
            .channel('sa_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchData)
            .subscribe()

        return () => supabase.removeChannel(sub)
    }, [fetchData])

    // ── Derived Data ─────────────────────────────────────────────────────────
    const catInfo = allCategories.find(c => c.id === activeCat)

    const filteredTxs = activeCat === 'all'
        ? txs
        : txs.filter(t => t.category === catInfo.dbKey)

    const dbTotalSpent = filteredTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    // Budget limit for selected category
    const budgetRow = budgets.find(b => b.category === catBudgetKey[activeCat])
    const limitAmt  = budgetRow ? Number(budgetRow.limit_amount) : 0
    const remaining = Math.max(0, limitAmt - dbTotalSpent)
    const usagePct  = limitAmt > 0 ? Math.min(Math.round((dbTotalSpent / limitAmt) * 100), 999) : 0

    // Daily safe spend
    const now        = new Date()
    const totalDays  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysPassed = now.getDate()
    const daysLeft   = Math.max(1, totalDays - daysPassed)

    // When budget is exceeded: still show a useful daily target = limit/total_days
    // When within budget: remaining / days left
    // When no limit set: use spent/daysPassed as benchmark
    const safeDailySpend = limitAmt > 0
        ? (usagePct > 100
            ? Math.round(limitAmt / totalDays)  // fallback: what daily should have been
            : Math.round(remaining / daysLeft))  // ideal: what you can still spend
        : Math.round(dbTotalSpent / Math.max(1, daysPassed))  // no limit: show avg
    const controlLimit   = controlMode ? Math.round(safeDailySpend * 0.75) : safeDailySpend

    // Daily average
    const dbDailyAvg = Math.round(dbTotalSpent / Math.max(1, daysPassed))

    // Category breakdown for pie
    const catTotals = allCategories.slice(1).map((cat, i) => {
        const spent = txs.filter(t => t.category === cat.dbKey)
                         .reduce((s, t) => s + Number(t.amount), 0)
        return { name: cat.name, spent, color: pieColors[i] }
    }).filter(c => c.spent > 0)
    const grandTotal = catTotals.reduce((s, c) => s + c.spent, 0)
    const pieData    = catTotals.map(c => ({
        ...c,
        pct: grandTotal > 0 ? Math.round((c.spent / grandTotal) * 100) : 0,
    }))
    const topCat = pieData.length > 0 ? pieData.reduce((a, b) => a.spent > b.spent ? a : b) : null

    // Highest spending day
    const dayMap = {}
    txs.forEach(t => {
        const d = new Date(t.created_at).toLocaleDateString('en-US', { weekday: 'short' })
        dayMap[d] = (dayMap[d] || 0) + Number(t.amount)
    })
    const topDay = Object.keys(dayMap).length
        ? Object.entries(dayMap).reduce((a, b) => a[1] > b[1] ? a : b)[0]
        : null

    // Bar chart — last 7 days of filtered
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const barData = dayLabels.map(label => {
        const val = dayMap[label] || 0
        return { day: label, val }
    })
    const barMax = Math.max(...barData.map(d => d.val), 1)

    const formatAmt = n =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

    // ── AI Recommendations ────────────────────────────────────────────────────
    const getRecommendations = () => {
        const recs = []
        if (activeCat === 'all') {
            if (grandTotal > 0 && topCat) {
                recs.push({ icon: '📊', msg: `Your highest spending is on ${topCat.name} — ${formatAmt(topCat.spent)} this month.` })
            }
            if (topDay) recs.push({ icon: '📅', msg: `You spend the most on ${topDay}s. Try to plan ahead!` })
            return recs
        }

        if (limitAmt === 0) {
            recs.push({ icon: '⚙️', msg: `Set a budget limit for ${catInfo.name} to get smart alerts.` })
            if (dbTotalSpent > 0) recs.push({ icon: '💡', msg: `You've spent ${formatAmt(dbTotalSpent)} on ${catInfo.name} this month.` })
            return recs
        }

        if (usagePct > 100) {
            const over = dbTotalSpent - limitAmt
            const idealDaily = Math.round(limitAmt / totalDays)
            recs.push({ icon: '🚨', msg: `You exceeded your ${catInfo.name} budget by ${formatAmt(over)}!` })
            recs.push({ icon: '🎯', msg: `Your ideal daily limit was ${formatAmt(idealDaily)}/day. Pause ${catInfo.name} spending now.` })
            recs.push({ icon: '📉', msg: `You've spent ${formatAmt(dbDailyAvg)}/day avg vs the ${formatAmt(idealDaily)}/day target — reduce immediately.` })
        } else if (usagePct > 80) {
            recs.push({ icon: '⚠️', msg: `You're close to exceeding your ${catInfo.name} budget (${usagePct}% used).` })
            recs.push({ icon: '💡', msg: `Reduce daily spending to ${formatAmt(controlLimit)} to stay on track.` })
            recs.push({ icon: '🎯', msg: `Only ${formatAmt(remaining)} left for ${daysLeft} days — that's ${formatAmt(Math.round(remaining/daysLeft))}/day.` })
        } else {
            recs.push({ icon: '✅', msg: `Great! You're well within your ${catInfo.name} budget (${usagePct}% used).` })
            recs.push({ icon: '💡', msg: `You can safely spend ${formatAmt(safeDailySpend)} per day for the remaining ${daysLeft} days.` })
            recs.push({ icon: '💰', msg: `${formatAmt(remaining)} remaining — you're on a healthy pace!` })
        }
        if (topDay) recs.push({ icon: '📅', msg: `You typically spend most on ${topDay}s — be mindful!` })
        return recs
    }

    // ── Mascot ────────────────────────────────────────────────────────────────
    const getMascot = () => {
        if (activeCat === 'all') return { face: '🦊', status: 'neutral' }
        if (limitAmt === 0) return { face: '🦊', status: 'neutral' }
        if (usagePct > 100) return { face: '😟', status: 'danger', label: 'Budget Exceeded!' }
        if (usagePct > 80) return { face: '😐', status: 'warning', label: 'Budget Alert!' }
        return { face: '😊', status: 'safe', label: 'On Track!' }
    }

    const progressColor = usagePct > 100 ? '#EF4444' : usagePct > 70 ? '#F59E0B' : '#34D399'
    const mascot = getMascot()
    const recs   = getRecommendations()

    const safeMsg = usagePct > 100
        ? `Budget exceeded — ideal was ${formatAmt(Math.round(limitAmt / totalDays))}/day 🚨`
        : safeDailySpend > 500
        ? 'You are on track 👍'
        : safeDailySpend > 200
        ? 'Spend carefully ⚠️'
        : 'Limit spending 🚨'

    return (
        <div className="sa-dark-wrapper">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="sa-header">
                <div className="sa-header-left">
                    <h2>Spending Analysis <span className="sa-live-dot" /></h2>
                    <p className="sa-subtitle">Smart budget intelligence — live from your transactions</p>
                </div>
                <div className="sa-header-right">
                    <div className="sa-control-toggle">
                        <span>Control Mode</span>
                        <button
                            className={`sa-toggle ${controlMode ? 'on' : ''}`}
                            onClick={() => setControlMode(p => !p)}
                        >
                            <span className="sa-toggle-knob" />
                        </button>
                    </div>
                    <div className="sa-period-selector">
                        {['This Week', 'This Month', 'This Year'].map(p => (
                            <button key={p} className={`sa-period-btn ${period === p ? 'active' : ''}`}
                                onClick={() => setPeriod(p)}>{p}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Category Tabs ────────────────────────────────────────────── */}
            <div className="sa-cat-tabs">
                {allCategories.map(cat => (
                    <button
                        key={cat.id}
                        className={`sa-cat-tab ${activeCat === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCat(cat.id)}
                    >
                        <span>{cat.emoji}</span> {cat.name}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="sa-loading">Loading your financial data...</div>
            ) : (
                <>
                    {/* ── Top Metric Cards ─────────────────────────────────── */}
                    <div className="sa-metrics-grid">
                        {activeCat !== 'all' && limitAmt > 0 && (
                            <div className="sa-metric-card accent-purple">
                                <div className="sa-metric-icon">💳</div>
                                <div className="sa-metric-label">Total Limit</div>
                                <div className="sa-metric-value">{formatAmt(limitAmt)}</div>
                            </div>
                        )}
                        <div className="sa-metric-card accent-pink">
                            <div className="sa-metric-icon">💸</div>
                            <div className="sa-metric-label">
                                {activeCat === 'all' ? 'Total Spent' : `${catInfo.name} Spent`}
                            </div>
                            <div className="sa-metric-value">{formatAmt(dbTotalSpent)}</div>
                            <div className="sa-metric-sub">↑ Live data</div>
                        </div>
                        {activeCat !== 'all' && limitAmt > 0 && (
                            <div className={`sa-metric-card ${remaining === 0 ? 'accent-red' : 'accent-green'}`}>
                                <div className="sa-metric-icon">{remaining === 0 ? '🚫' : '✅'}</div>
                                <div className="sa-metric-label">Remaining</div>
                                <div className="sa-metric-value">{formatAmt(remaining)}</div>
                            </div>
                        )}
                        {activeCat !== 'all' && limitAmt > 0 && (
                            <div className={`sa-metric-card ${usagePct > 100 ? 'accent-red' : usagePct > 70 ? 'accent-yellow' : 'accent-teal'}`}>
                                <div className="sa-metric-icon">🎯</div>
                                <div className="sa-metric-label">Budget Used</div>
                                <div className="sa-metric-value">{usagePct}%</div>
                            </div>
                        )}
                        <div className="sa-metric-card accent-blue">
                            <div className="sa-metric-icon">📉</div>
                            <div className="sa-metric-label">Daily Average</div>
                            <div className="sa-metric-value">{formatAmt(dbDailyAvg)}</div>
                            <div className="sa-metric-sub">Based on actuals</div>
                        </div>
                    </div>

                    {/* ── Progress Bar (category only) ─────────────────────── */}
                    {activeCat !== 'all' && limitAmt > 0 && (
                        <div className="sa-progress-section">
                            <div className="sa-progress-header">
                                <span>Budget Usage</span>
                                <span style={{ color: progressColor }}>{usagePct}% used</span>
                            </div>
                            <div className="sa-progress-track">
                                <div
                                    className="sa-progress-fill"
                                    style={{ width: `${Math.min(usagePct, 100)}%`, background: progressColor }}
                                />
                            </div>
                            <div className="sa-progress-footer">
                                <span>{formatAmt(dbTotalSpent)} spent</span>
                                <span>{formatAmt(limitAmt)} limit</span>
                            </div>
                        </div>
                    )}

                    {/* ── Main Row: Chart + Safe Spend + AI ───────────────── */}
                    <div className="sa-main-row">
                        {/* Bar Chart */}
                        <div className="sa-card sa-chart-card">
                            <div className="sa-card-header">
                                <h3>Weekly Breakdown</h3>
                                {topDay && <span className="sa-badge">Most on {topDay}s</span>}
                            </div>
                            <div className="sa-bar-chart">
                                {barData.map((d, i) => (
                                    <div className="sa-bar-group" key={i}>
                                        <div className="sa-bar-wrap">
                                            <span className="sa-bar-tip">{d.val > 0 ? formatAmt(d.val) : ''}</span>
                                            <div
                                                className={`sa-bar-fill ${d.day === topDay ? 'peak' : ''}`}
                                                style={{ height: `${(d.val / barMax) * 150}px` }}
                                            />
                                        </div>
                                        <span className="sa-bar-label">{d.day}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="sa-chart-legend">
                                <span className="sa-legend-dot" style={{ background: '#6366F1' }} /> This Month
                                <span className="sa-peak-label">🔥 Peak day highlighted</span>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="sa-right-col">
                            {/* Safe to Spend Today */}
                            {activeCat !== 'all' && limitAmt > 0 && (
                                <div className={`sa-card sa-safe-card ${usagePct > 100 ? 'danger' : usagePct > 80 ? 'warn' : 'safe'}`}>
                                    <div className="sa-safe-label">Safe to Spend Today</div>
                                    <div className="sa-safe-amount">
                                        {formatAmt(controlMode ? controlLimit : safeDailySpend)}
                                    </div>
                                    <div className="sa-safe-msg">{safeMsg}</div>
                                    <div className="sa-safe-sub">{daysLeft} days remaining this month</div>
                                    {controlMode && (
                                        <div className="sa-control-badge">⚡ Control Mode Active — 25% tighter limit</div>
                                    )}
                                </div>
                            )}

                            {/* Mascot */}
                            <div className={`sa-card sa-mascot-card status-${mascot.status}`}>
                                <div className="sa-mascot-face">{mascot.face}</div>
                                {mascot.label && (
                                    <div className={`sa-mascot-bubble ${mascot.status}`}>{mascot.label}</div>
                                )}
                                <div className="sa-mascot-msg">
                                    {activeCat === 'all'
                                        ? 'Select a category for smart budget insights!'
                                        : limitAmt === 0
                                        ? `No budget set for ${catInfo.name} yet.`
                                        : usagePct > 100 ? `Whoa! You've gone over your ${catInfo.name} budget!`
                                        : usagePct > 80 ? `Getting close... watch your ${catInfo.name} spend!`
                                        : `You're doing great with ${catInfo.name}! 🎉`
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── AI Recommendations ──────────────────────────────── */}
                    <div className="sa-card sa-ai-card">
                        <div className="sa-card-header">
                            <h3>🧠 AI Recommendations</h3>
                            <span className="sa-badge">Powered by Fina</span>
                        </div>
                        {recs.length === 0 ? (
                            <div className="sa-empty">No spending data available for this category yet.</div>
                        ) : (
                            <div className="sa-recs-list">
                                {recs.map((r, i) => (
                                    <div className="sa-rec-item" key={i}>
                                        <span className="sa-rec-icon">{r.icon}</span>
                                        <span className="sa-rec-text">{r.msg}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Category Breakdown Pie ───────────────────────────── */}
                    <div className="sa-main-row">
                        <div className="sa-card sa-pie-card">
                            <h3>Category Breakdown</h3>
                            {pieData.length === 0 ? (
                                <div className="sa-empty">No expense data yet this month.</div>
                            ) : (
                                <div className="sa-pie-layout">
                                    <div className="sa-donut" style={{ background: buildConicGradient(pieData) }}>
                                        <div className="sa-donut-center">
                                            <span className="sa-donut-pct">{topCat?.pct || 0}%</span>
                                            <span className="sa-donut-lbl">Top category</span>
                                        </div>
                                    </div>
                                    <div className="sa-pie-legend">
                                        {pieData.map((item, i) => (
                                            <div className="sa-pie-row" key={i}>
                                                <div className="sa-pie-row-left">
                                                    <span className="sa-legend-dot" style={{ background: item.color }} />
                                                    <span>{item.name}</span>
                                                </div>
                                                <span className="sa-pie-amt">{formatAmt(item.spent)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Top Spending Summary */}
                        <div className="sa-card sa-top-card">
                            <h3>🏆 Top Category</h3>
                            {topCat ? (
                                <>
                                    <div className="sa-top-name">{topCat.name}</div>
                                    <div className="sa-top-amount">{formatAmt(topCat.spent)}</div>
                                    <div className="sa-top-pct">{topCat.pct}% of total spend</div>
                                    {topDay && (
                                        <div className="sa-top-day-badge">
                                            📅 You spend most on {topDay}s
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="sa-empty">No spending data to analyze yet.</div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
