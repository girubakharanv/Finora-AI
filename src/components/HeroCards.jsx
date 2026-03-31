import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const BUDGET_CAT_MAP = {
    'Food & Dining': 'Food',
    'Transport': 'Travel',
    'Entertainment': 'Entertainment',
    'Shopping': 'Shopping',
    'Bills': 'Bills',
    'Others': 'Others',
}

export default function HeroCards() {
    const navigate = useNavigate()
    const [balance, setBalance] = useState(0)
    const [expense, setExpense] = useState(0)
    const [savings, setSavings] = useState(0)
    const [credit, setCredit] = useState(0)
    const [loading, setLoading] = useState(true)
    const [budgetRemaining, setBudgetRemaining] = useState(null)
    const [topCategory, setTopCategory] = useState(null)

    const fetchAggregates = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch balance from profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', user.id)
            .single()

        // Fetch expenses from transactions
        const { data } = await supabase
            .from('transactions')
            .select('amount, type, category, created_at')
            .eq('user_id', user.id)

        if (profile) {
            setBalance(Number(profile.balance) || 0)
        }

        if (data) {
            let totalIncome = 0
            let totalExpense = 0
            let savedAmt = 0
            data.forEach(tx => {
                if (tx.type === 'income') totalIncome += tx.amount
                if (tx.type === 'expense') totalExpense += Number(tx.amount) || 0
                if (tx.type === 'transfer' && tx.category === 'Savings') {
                    savedAmt += Number(tx.amount) || 0
                }
            })

            setExpense(totalExpense)
            setSavings(savedAmt)
            setCredit(totalIncome)
        }

        // Fetch budget data for remaining budget display
        const { data: budgetRows } = await supabase
            .from('budgets')
            .select('*')
            .eq('user_id', user.id)

        if (budgetRows && budgetRows.length > 0) {
            // Get current month spending
            const now = new Date()
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

            const monthTxs = (data || []).filter(tx =>
                tx.type === 'expense' &&
                tx.created_at >= start &&
                tx.created_at <= end
            )

            const spendingMap = {}
            Object.values(BUDGET_CAT_MAP).forEach(k => { spendingMap[k] = 0 })
            monthTxs.forEach(tx => {
                const budgetKey = BUDGET_CAT_MAP[tx.category] || 'Others'
                spendingMap[budgetKey] += Number(tx.amount) || 0
            })

            let totalLimit = 0
            let totalSpent = 0
            let topCat = null
            let topSpent = 0

            budgetRows.forEach(b => {
                totalLimit += Number(b.limit_amount) || 0
                const spent = spendingMap[b.category] || 0
                totalSpent += spent
                if (spent > topSpent) {
                    topSpent = spent
                    topCat = b.category
                }
            })

            setBudgetRemaining(Math.max(0, totalLimit - totalSpent))
            setTopCategory(topCat && topSpent > 0 ? topCat : null)
        }

        setLoading(false)
    }

    useEffect(() => {
        fetchAggregates()

        const profileChannel = supabase
            .channel('public:profiles:hero')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
                fetchAggregates()
            })
            .subscribe()

        const txChannel = supabase
            .channel('public:transactions:hero')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                fetchAggregates()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(profileChannel)
            supabase.removeChannel(txChannel)
        }
    }, [])

    const formatAmt = (amt) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0)
    }

    const expenseSub = topCategory
    const savingsSub = budgetRemaining !== null
        ? `Budget left: ${formatAmt(budgetRemaining)}`
        : 'Goal: ₹1,00,000'

    const cards = [
        {
            title: 'Wallet Balance',
            amount: formatAmt(balance),
            change: '+0.0%',
            up: true,
            subtitle: 'Net Wealth: ' + formatAmt(balance + savings),
            emoji: '💎',
            gradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #A855F7 100%)',
            shadowColor: 'rgba(99, 102, 241, 0.4)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
            ),
        },
        {
            title: 'Total Expense',
            amount: formatAmt(expense),
            change: '↓ 0.0%',
            up: false,
            subtitle: 'Lifetime Tracking',
            emoji: '🛒',
            gradient: 'linear-gradient(135deg, #F43F5E 0%, #FB7185 50%, #FDA4AF 100%)',
            shadowColor: 'rgba(244, 63, 94, 0.4)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
            ),
        },
        {
            title: 'Savings',
            amount: formatAmt(savings),
            change: '0.0%',
            up: true,
            subtitle: savingsSub,
            emoji: '🐷',
            gradient: 'linear-gradient(135deg, #10B981 0%, #34D399 50%, #6EE7B7 100%)',
            shadowColor: 'rgba(16, 185, 129, 0.4)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
                </svg>
            ),
        },
        {
            title: 'Total Credit',
            amount: formatAmt(credit),
            change: '+0.0%',
            up: true,
            subtitle: 'Transaction Income',
            emoji: '📩',
            gradient: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 50%, #93C5FD 100%)',
            shadowColor: 'rgba(59, 130, 246, 0.4)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
            ),
        },
    ]

    return (
        <div className="hero-cards-row">
            {cards.map((card, i) => (
                <div
                    className={`hero-card fade-in-up stagger-${i + 1}`}
                    key={i}
                    style={{
                        background: card.gradient,
                        '--shadow-color': card.shadowColor,
                        cursor: (card.title === 'Total Expense' || card.title === 'Total Credit' || card.title === 'Savings') ? 'pointer' : 'default'
                    }}
                    onClick={() => {
                        if (card.title === 'Total Expense') navigate('/pay', { state: { view: 'history', filter: 'expense' } })
                        if (card.title === 'Total Credit') navigate('/pay', { state: { view: 'history', filter: 'income' } })
                        if (card.title === 'Savings') navigate('/savings')
                    }}
                >
                    <div className="hero-card-bg-circle c1" />
                    <div className="hero-card-bg-circle c2" />

                    <div className="hero-card-top">
                        <div className="hero-card-icon">
                            {card.icon}
                        </div>
                        <span className="hero-card-emoji">{card.emoji}</span>
                    </div>

                    <div className="hero-card-body">
                        <p className="hero-card-title">{card.title}</p>
                        <h2 className="hero-card-amount">
                            {loading ? '...' : card.amount}
                        </h2>
                        <div className="hero-card-footer">
                            <span className={`hero-card-badge ${card.up ? 'up' : 'down'}`}>
                                {card.up ? '↑' : '↓'} {card.change}
                            </span>
                            <span className="hero-card-sub">{card.subtitle}</span>
                        </div>
                    </div>

                    {card.title === 'Savings' && (
                        <div className="hero-progress">
                            <div className="hero-progress-bar" style={{ width: `${Math.min(100, (savings / 100000) * 100)}%` }} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
