import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function HeroCards() {
    const [balance, setBalance] = useState(0)
    const [expense, setExpense] = useState(0)
    const [savings, setSavings] = useState(0)
    const [loading, setLoading] = useState(true)

    const fetchAggregates = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', user.id)

        if (data) {
            let totalIncome = 0
            let totalExpense = 0
            data.forEach(tx => {
                if (tx.type === 'income') totalIncome += tx.amount
                if (tx.type === 'expense') totalExpense += tx.amount
            })

            const currentBalance = totalIncome - totalExpense
            setBalance(currentBalance < 0 ? 0 : currentBalance)
            setExpense(totalExpense)

            // Artificial Savings Calculation for demo (20% of income)
            setSavings(totalIncome * 0.20)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchAggregates()

        const channel = supabase
            .channel('public:transactions:hero')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                fetchAggregates()
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [])

    const formatAmt = (amt) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0)
    }

    const cards = [
        {
            title: 'Total Balance',
            amount: formatAmt(balance),
            change: '+0.0%',
            up: true,
            subtitle: 'Real-time sync',
            emoji: '💎',
            gradient: 'linear-gradient(135deg, #7C83FF 0%, #A78BFA 50%, #C084FC 100%)',
            shadowColor: 'rgba(124, 131, 255, 0.3)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                    <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
                </svg>
            ),
        },
        {
            title: 'Total Expense',
            amount: formatAmt(expense),
            change: '0.0%',
            up: false,
            subtitle: 'Lifetime Tracking',
            emoji: '🛒',
            gradient: 'linear-gradient(135deg, #FFA5B4 0%, #FF7EB3 50%, #FF5F96 100%)',
            shadowColor: 'rgba(255, 165, 180, 0.3)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
            ),
        },
        {
            title: 'Savings',
            amount: formatAmt(savings),
            change: '0.0%',
            up: true,
            subtitle: 'Goal: ₹1,00,000',
            emoji: '🐷',
            gradient: 'linear-gradient(135deg, #7DDBA3 0%, #56C596 50%, #38B583 100%)',
            shadowColor: 'rgba(125, 219, 163, 0.3)',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
                </svg>
            ),
        },
    ]

    return (
        <div className="hero-cards-row fade-in-up stagger-1">
            {cards.map((card, i) => (
                <div
                    className="hero-card"
                    key={i}
                    style={{
                        background: card.gradient,
                        '--shadow-color': card.shadowColor,
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
