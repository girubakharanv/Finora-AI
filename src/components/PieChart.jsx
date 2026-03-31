import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const CATEGORIES = [
    { name: 'Food & Dining', key: 'Food', color: '#EB5757', icon: '🍔' },
    { name: 'Shopping', key: 'Shopping', color: '#2F80ED', icon: '🛒' },
    { name: 'Transport', key: 'Transport', color: '#F2C94C', icon: '🚗' },
    { name: 'Entertainment', key: 'Entertainment', color: '#9B51E0', icon: '🎮' },
    { name: 'Bills', key: 'Bills', color: '#27AE60', icon: '💡' },
    { name: 'Others', key: 'Others', color: '#A9A8BD', icon: '📦' }
]

function CircularProgress({ value, color, icon, label, amount, limit }) {
    const radius = 36
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (Math.min(value, 100) / 100) * circumference
    const isOver = value > 100

    return (
        <div className="category-card-solid" style={{ 
            '--cat-color': color, 
            '--cat-shadow': `${color}66`
        }}>
            <div className="ring-visual" style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '50%', padding: '6px', backdropFilter: 'blur(4px)' }}>
                <svg width="60" height="60" viewBox="0 0 90 90">
                    <circle cx="45" cy="45" r={radius} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="8" />
                    <circle 
                        cx="45" cy="45" r={radius} fill="none" 
                        stroke="white" strokeWidth="8" 
                        strokeDasharray={circumference} 
                        strokeDashoffset={offset} 
                        strokeLinecap="round" 
                        style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} 
                        transform="rotate(-90 45 45)"
                    />
                    <text x="45" y="48" fontSize="22" textAnchor="middle" dominantBaseline="middle" style={{ filter: 'brightness(2)' }}>{icon}</text>
                </svg>
                {isOver && <span className="over-badge" style={{ background: 'white', color: color, fontWeight: 900, border: 'none' }}>!</span>}
            </div>
            <div className="ring-details" style={{ marginTop: '5px' }}>
                <span className="ring-label" style={{ fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.65rem', opacity: 0.8 }}>{label}</span>
                <span className="ring-amount" style={{ fontSize: '1.2rem', fontWeight: 900, display: 'block', margin: '4px 0' }}>{amount}</span>
                <div className="ring-target">
                    <span style={{ fontWeight: 700, fontSize: '0.7rem', opacity: 0.9 }}>
                        {limit > 0 ? `${Math.round(value)}% of limit` : 'No budget set'}
                    </span>
                </div>
            </div>
        </div>
    )
}

export default function CategoryHub({ user }) {
    const [catData, setCatData] = useState([])
    const [loading, setLoading] = useState(true)

    const formatINR = (n) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

    const fetchData = useCallback(async () => {
        if (!user) return
        setLoading(true)

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        // 1. Fetch Transactions
        const { data: txs } = await supabase
            .from('transactions')
            .select('amount, category')
            .eq('user_id', user.id)
            .eq('type', 'expense')
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth)

        // 2. Fetch Budgets
        const { data: budgets } = await supabase
            .from('budgets')
            .select('category, limit_amount')
            .eq('user_id', user.id)

        const txTotals = {}
        txs?.forEach(tx => {
            const cat = tx.category || 'Others'
            txTotals[cat] = (txTotals[cat] || 0) + Number(tx.amount)
        })

        const processed = CATEGORIES.map(cat => {
            const spent = txTotals[cat.name] || txTotals[cat.key] || 0
            const budgetRow = budgets?.find(b => b.category === cat.key || b.category === cat.name)
            const limit = Number(budgetRow?.limit_amount) || 0
            const pct = limit > 0 ? (spent / limit) * 100 : 0
            
            return {
                ...cat,
                spent,
                limit,
                pct,
                formattedSpent: formatINR(spent)
            }
        })

        setCatData(processed.filter(c => c.spent > 0 || c.limit > 0))
        setLoading(false)
    }, [user])

    useEffect(() => {
        fetchData()
        const channel = supabase.channel('public:categoryhub')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user?.id}` }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets', filter: `user_id=eq.${user?.id}` }, () => fetchData())
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [fetchData, user])

    return (
        <div className="category-hub-container fade-in-up stagger-4">
            <div className="category-hub-header">
                <h3>Categorical Breakdown</h3>
                <span className="hub-badge">Live</span>
            </div>
            <div className="category-grid">
                {loading ? (
                    <div className="hub-loader"><div className="auth-spinner" /></div>
                ) : catData.length === 0 ? (
                    <div className="hub-empty">
                        <span>🦊</span>
                        <p>No budgets or transactions yet</p>
                    </div>
                ) : (
                    catData.map((cat, i) => (
                        <CircularProgress 
                            key={i}
                            label={cat.name}
                            amount={cat.formattedSpent}
                            value={cat.pct}
                            limit={cat.limit}
                            color={cat.color}
                            icon={cat.icon}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
