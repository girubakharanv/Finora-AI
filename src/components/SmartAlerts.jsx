import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './SmartAlerts.css'

const CATEGORY_META = {
    Food:          { emoji: '🍔', txCategory: 'Food & Dining' },
    Travel:        { emoji: '🚗', txCategory: 'Transport' },
    Entertainment: { emoji: '🎮', txCategory: 'Entertainment' },
    Shopping:      { emoji: '🛒', txCategory: 'Shopping' },
    Bills:         { emoji: '💡', txCategory: 'Bills' },
    Others:        { emoji: '📦', txCategory: 'Others' },
}

const formatINR = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

export default function SmartAlerts() {
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAlerts = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { setLoading(false); return }

            // Get budgets
            const { data: budgetRows } = await supabase
                .from('budgets')
                .select('*')
                .eq('user_id', user.id)

            if (!budgetRows || budgetRows.length === 0) {
                // Fallback to static alerts when no budgets set
                setAlerts([
                    { id: 1, type: 'warning', icon: '📋', message: 'Set your budget limits to get smart spending alerts!', mascot: '🦊', action: 'Set Budget', path: '/budget' },
                ])
                setLoading(false)
                return
            }

            // Get this month's transactions
            const now = new Date()
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

            const { data: txs } = await supabase
                .from('transactions')
                .select('amount, type, category')
                .eq('user_id', user.id)
                .eq('type', 'expense')
                .gte('created_at', start)
                .lte('created_at', end)

            // Calculate spending per category
            const spendingMap = {}
            Object.keys(CATEGORY_META).forEach(k => { spendingMap[k] = 0 })

            if (txs) {
                txs.forEach(tx => {
                    const entry = Object.entries(CATEGORY_META).find(([, v]) => v.txCategory === tx.category)
                    const key = entry ? entry[0] : 'Others'
                    spendingMap[key] += Number(tx.amount) || 0
                })
            }

            // Generate dynamic alerts
            const generated = []
            let idCounter = 1

            budgetRows.forEach(b => {
                const meta = CATEGORY_META[b.category]
                if (!meta || b.limit_amount <= 0) return

                const spent = spendingMap[b.category] || 0
                const pct = (spent / b.limit_amount) * 100

                if (pct >= 100) {
                    const overBy = spent - b.limit_amount
                    generated.push({
                        id: idCounter++,
                        type: 'danger',
                        icon: meta.emoji,
                        message: `You exceeded your ${b.category} budget by ${formatINR(overBy)}!`,
                        mascot: '😱',
                        action: 'Review',
                    })
                } else if (pct >= 80) {
                    const remaining = b.limit_amount - spent
                    generated.push({
                        id: idCounter++,
                        type: 'warning',
                        icon: '⚠️',
                        message: `You're close to your ${formatINR(b.limit_amount)} ${b.category} budget. Only ${formatINR(remaining)} left!`,
                        mascot: '😳',
                        action: 'Review',
                    })
                }
            })

            // Add a success alert if all within budget
            const allOk = budgetRows.every(b => {
                const spent = spendingMap[b.category] || 0
                return b.limit_amount <= 0 || spent < b.limit_amount * 0.8
            })

            if (allOk && budgetRows.length > 0) {
                generated.push({
                    id: idCounter++,
                    type: 'success',
                    icon: '🎉',
                    message: 'Great job! All your budgets are looking healthy this month.',
                    mascot: '🥳',
                    action: 'View',
                })
            }

            setAlerts(generated.length > 0 ? generated : [
                { id: 1, type: 'success', icon: '✅', message: 'All budgets look good. Keep it up!', mascot: '😊', action: 'View' }
            ])
            setLoading(false)
        }

        fetchAlerts()

        // Real-time re-fetch
        const ch = supabase
            .channel('public:budgets:smartalerts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, () => fetchAlerts())
            .subscribe()

        const txCh = supabase
            .channel('public:transactions:smartalerts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchAlerts())
            .subscribe()

        return () => {
            supabase.removeChannel(ch)
            supabase.removeChannel(txCh)
        }
    }, [])

    if (loading) return null

    return (
        <div className="smart-alerts-container fade-in-up stagger-3">
            <div className="alerts-header">
                <h3>Smart Alerts 🔔</h3>
                <button className="clear-alerts-btn">Clear all</button>
            </div>

            <div className="alerts-list">
                {alerts.map(alert => (
                    <div key={alert.id} className={`alert-card alert-${alert.type}`}>
                        <div className="alert-mascot">
                            <span className="am-face">{alert.mascot}</span>
                        </div>

                        <div className="alert-content">
                            <div className="alert-icon-ring">
                                <span>{alert.icon}</span>
                            </div>
                            <p className="alert-message">{alert.message}</p>
                        </div>

                        <button className={`alert-action-btn btn-${alert.type}`}>
                            {alert.action}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
