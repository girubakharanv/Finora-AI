import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'

const PERSONALITY_MAP = {
    Overspender: {
        emoji: '😰',
        mascot: '😱',
        color: '#FF5F96',
        bg: 'linear-gradient(135deg, #FFF0F4, #FFE0EA)',
        border: 'rgba(255, 95, 150, 0.25)',
        tag: 'Warning',
        tagColor: '#FF5F96',
        description: "You're spending more than you earn. Time to hit the brakes! 🛑",
        suggestion: "Cut back on non-essentials and track every rupee spent.",
    },
    'Impulse Spender': {
        emoji: '🛍️',
        mascot: '😬',
        color: '#F59E0B',
        bg: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
        border: 'rgba(245, 158, 11, 0.25)',
        tag: 'Caution',
        tagColor: '#F59E0B',
        description: "You love spending on food & shopping. Treat yourself — but mindfully! 😅",
        suggestion: "Set category limits and use the 24-hour rule before buying.",
    },
    Saver: {
        emoji: '🐷',
        mascot: '🥳',
        color: '#10B981',
        bg: 'linear-gradient(135deg, #F0FDF9, #D1FAE5)',
        border: 'rgba(16, 185, 129, 0.25)',
        tag: 'Excellent',
        tagColor: '#10B981',
        description: "You're saving over 30% of your salary. Incredible discipline! 🌟",
        suggestion: "Consider investing your surplus to grow wealth faster.",
    },
    'Smart Planner': {
        emoji: '🧠',
        mascot: '🦊',
        color: '#6366F1',
        bg: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
        border: 'rgba(99, 102, 241, 0.25)',
        tag: 'Balanced',
        tagColor: '#6366F1',
        description: "You manage your money with balance and awareness. Keep it up! 💡",
        suggestion: "Explore SIPs or mutual funds to put idle money to work.",
    },
}

export default function AIInsights({ user }) {
    const [todaySpending, setTodaySpending] = useState(0)
    const [salary, setSalary] = useState(0)
    const [streak, setStreak] = useState(0)
    const [loading, setLoading] = useState(true)
    const [lastSync, setLastSync] = useState('Just now')
    const [personalityData, setPersonalityData] = useState(null)

    const formatINR = (n) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

    const fetchData = useCallback(async () => {
        if (!user) return
        setLoading(true)

        // 1. Fetch Salary
        const { data: profile } = await supabase
            .from('profiles')
            .select('salary')
            .eq('id', user.id)
            .single()

        const monthlySalaryRemaining = Number(profile?.salary) || 0
        const dailyBudget = monthlySalaryRemaining / 30

        // 2. Fetch CURRENT MONTH's transactions only (not all-time)
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        const { data: allTxs } = await supabase
            .from('transactions')
            .select('amount, type, category, created_at')
            .eq('user_id', user.id)
            .gte('created_at', monthStart)
            .lte('created_at', monthEnd)

        // 3. Today's spending
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayTotal = (allTxs || [])
            .filter(tx => tx.type === 'expense' && new Date(tx.created_at) >= todayStart)
            .reduce((sum, tx) => sum + Number(tx.amount), 0)
        setTodaySpending(todayTotal)

        // Reconstruct ORIGINAL salary:
        // salary field gets reduced by P2P expenses, so original = remaining + this month's expenses
        const thisMonthExpenses = (allTxs || [])
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + Number(tx.amount), 0)
        const originalSalary = monthlySalaryRemaining + thisMonthExpenses
        const monthlySalary = originalSalary > 0 ? originalSalary : monthlySalaryRemaining
        setSalary(monthlySalary)

        // 4. Savings streak (based on reconstructed daily budget)
        const reconstructedDailyBudget = monthlySalary / 30
        if (monthlySalary > 0) {
            const history = (allTxs || []).filter(tx => tx.type === 'expense')
            let currentStreak = 0
            const dayMap = {}
            history.forEach(tx => {
                const dateKey = new Date(tx.created_at).toDateString()
                dayMap[dateKey] = (dayMap[dateKey] || 0) + Number(tx.amount)
            })
            for (let i = 0; i < 30; i++) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                const spent = dayMap[d.toDateString()] || 0
                if (spent <= reconstructedDailyBudget) currentStreak++
                else break
            }
            setStreak(currentStreak)
        } else {
            setStreak(0)
        }

        // ============================================
        // SPENDING PERSONALITY ANALYSIS
        // ============================================
        const expenseTxs = (allTxs || []).filter(tx => tx.type === 'expense')
        const totalSpent = expenseTxs.reduce((sum, tx) => sum + Number(tx.amount), 0)
        const txCount = expenseTxs.length

        // Category spending
        const catSpend = {}
        expenseTxs.forEach(tx => {
            const cat = tx.category || 'Others'
            catSpend[cat] = (catSpend[cat] || 0) + Number(tx.amount)
        })

        // Find dominant category
        const topCat = Object.entries(catSpend).sort((a, b) => b[1] - a[1])[0]
        const topCatName = topCat?.[0] || 'Others'
        const topCatPct = totalSpent > 0 ? (topCat?.[1] / totalSpent) * 100 : 0

        // Food + Shopping combined %
        const foodAmt = (catSpend['Food & Dining'] || 0) + (catSpend['Food'] || 0)
        const shoppingAmt = catSpend['Shopping'] || 0
        const impulsePct = totalSpent > 0 ? ((foodAmt + shoppingAmt) / totalSpent) * 100 : 0

        // Spending ratio vs salary (use original salary set, not current remaining)
        const spendingRatio = monthlySalary > 0 ? totalSpent / monthlySalary : 0
        
        // Accurate savings: Calculate ACTUAL money transferred to savings
        const actualSavingsAmt = (allTxs || [])
            .filter(tx => tx.type === 'transfer' && tx.category === 'Savings')
            .reduce((sum, tx) => sum + Number(tx.amount), 0)
        
        const savingsPct = monthlySalary > 0 ? (actualSavingsAmt / monthlySalary) * 100 : 0

        // Classify personality locally (no backend needed)
        let personalityType
        if (spendingRatio > 1.0) {
            personalityType = 'Overspender'
        } else if (savingsPct >= 30) {
            personalityType = 'Saver'
        } else if (impulsePct > 45) {
            personalityType = 'Impulse Spender'
        } else {
            personalityType = 'Smart Planner'
        }

        const pMap = PERSONALITY_MAP[personalityType] || PERSONALITY_MAP['Smart Planner']
        setPersonalityData({
            ...pMap,
            type: personalityType,
            txCount,
            spendingRatio: Math.round(spendingRatio * 100),
            topCat: topCatName,
            topCatPct: Math.round(topCatPct)
        })

        setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        setLoading(false)
    }, [user])

    useEffect(() => {
        fetchData()
        const channel = supabase
            .channel('public:transactions:aiinsights_v3')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user?.id}` }, () => fetchData())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user?.id}` }, () => fetchData())
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [fetchData, user])

    const quickStats = [
        { label: "Today's Spending", value: formatINR(todaySpending), icon: '💸', color: '#FF7EB3' },
        { label: 'Savings Streak', value: `${streak} days`, icon: '🔥', color: streak > 0 ? '#F59E0B' : '#A9A8BD' },
        { label: 'Budget Sync', value: lastSync, icon: '🔄', color: '#7DDBA3' },
    ]

    const p = personalityData || PERSONALITY_MAP['Smart Planner']

    return (
        <div className="ai-insights-section fade-in-up stagger-6">
            {/* ===== SPENDING PERSONALITY CARD ===== */}
            <div className="card ai-insight-card" style={{
                background: loading ? '#f8f8ff' : p.bg,
                border: `1.5px solid ${p.border}`,
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Background blob */}
                <div style={{
                    position: 'absolute', top: '-20px', right: '-20px',
                    width: '120px', height: '120px', borderRadius: '50%',
                    background: `radial-gradient(circle, ${p.color}18 0%, transparent 70%)`,
                    pointerEvents: 'none',
                }} />

                {/* Header */}
                <div className="ai-insight-header" style={{ marginBottom: '12px' }}>
                    <div className="ai-badge" style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}cc)` }}>
                        <span className="ai-badge-dot" style={{ animation: 'pulse 1.5s infinite' }} />
                        Spending Personality
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: p.tagColor,
                        background: `${p.tagColor}18`, padding: '4px 10px', borderRadius: '20px' }}>
                        {p.tag}
                    </span>
                </div>

                {/* Body */}
                <div className="ai-insight-body" style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    {/* Mascot */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <div style={{
                            width: '60px', height: '60px', borderRadius: '50%',
                            background: `${p.color}15`, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: '2rem', animation: 'float 3s ease-in-out infinite',
                            border: `2px solid ${p.color}25`,
                        }}>
                            {loading ? '🦊' : p.mascot}
                        </div>
                        <span style={{ fontSize: '1.4rem' }}>{p.emoji}</span>
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 700, color: p.color,
                            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                            You are a
                        </p>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-dark)',
                            marginBottom: '6px', lineHeight: 1.2 }}>
                            {loading ? '...' : (personalityData?.type || 'Smart Planner')} {p.emoji}
                        </h3>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-mid)', lineHeight: 1.5,
                            fontWeight: 500, marginBottom: '10px' }}>
                            {loading ? 'Analyzing your spending...' : p.description}
                        </p>

                        {/* Stats row */}
                        {!loading && personalityData && (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '20px',
                                    background: `${p.color}15`, color: p.color, fontWeight: 700 }}>
                                    💳 {personalityData.txCount} transactions
                                </span>
                                <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '20px',
                                    background: `${p.color}15`, color: p.color, fontWeight: 700 }}>
                                    📊 {personalityData.spendingRatio}% spent
                                </span>
                                {personalityData.topCatPct > 0 && (
                                    <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '20px',
                                        background: `${p.color}15`, color: p.color, fontWeight: 700 }}>
                                        🏷️ Top: {personalityData.topCat} ({personalityData.topCatPct}%)
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Suggestion banner */}
                {!loading && (
                    <div style={{
                        marginTop: '14px', padding: '10px 14px', borderRadius: '12px',
                        background: `${p.color}12`, borderLeft: `3px solid ${p.color}`,
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <span style={{ fontSize: '1rem' }}>💡</span>
                        <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.4, margin: 0 }}>
                            {p.suggestion}
                        </p>
                    </div>
                )}
            </div>

            {/* ===== QUICK STATS (unchanged) ===== */}
            <div className="ai-quick-stats">
                {quickStats.map((stat, i) => (
                    <div className="card ai-quick-stat glass-card" key={i}
                        style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px' }}>
                        <span className="ai-stat-icon" style={{
                            fontSize: '1.5rem', background: `${stat.color}15`,
                            padding: '10px', borderRadius: '12px' }}>
                            {stat.icon}
                        </span>
                        <div className="ai-stat-info" style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="ai-stat-label" style={{
                                fontSize: '0.75rem', color: 'var(--text-light)',
                                fontWeight: 600, textTransform: 'uppercase' }}>
                                {stat.label}
                            </span>
                            <span className="ai-stat-value" style={{
                                fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-dark)' }}>
                                {loading ? '...' : stat.value}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
