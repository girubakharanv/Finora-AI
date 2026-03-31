import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function StatsCards() {
    const navigate = useNavigate()
    const [income, setIncome] = useState(0)
    const [expenses, setExpenses] = useState(0)
    const [savings, setSavings] = useState(0)
    const [investments, setInvestments] = useState(0)

    const fetchAggregates = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch user's salary to add to income
        const { data: profile } = await supabase
            .from('profiles')
            .select('salary, balance')
            .eq('id', user.id)
            .single()

        const baseSalary = Number(profile?.salary) || 0
        const currentBalance = Number(profile?.balance) || 0

        const { data } = await supabase
            .from('transactions')
            .select('amount, type, category')
            .eq('user_id', user.id)

        const { data: invData } = await supabase
            .from('investments')
            .select('amount')
            .eq('user_id', user.id)

        if (data) {
            let totalIncome = currentBalance
            let totalExpense = 0
            let totalInvestments = 0
            let totalSavings = 0
            
            data.forEach(tx => {
                if (tx.type === 'income') totalIncome += tx.amount
                if (tx.type === 'expense') totalExpense += Number(tx.amount) || 0
                if (tx.type === 'transfer' && tx.category === 'Savings') {
                    totalSavings += Number(tx.amount) || 0
                }
                if (tx.category === 'Investment' || tx.category === 'Stocks') totalInvestments += tx.amount
            })

            if (invData) {
                invData.forEach(inv => {
                    totalInvestments += Number(inv.amount) || 0
                })
            }

            setIncome(currentBalance + totalSavings)
            setExpenses(totalExpense)
            setSavings(totalSavings)
            setInvestments(totalInvestments)
        }
    }

    useEffect(() => {
        fetchAggregates()

        const txChannel = supabase
            .channel('public:transactions:statscards')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                fetchAggregates()
            })
            .subscribe()

        const profileChannel = supabase
            .channel('public:profiles:statscards')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
                fetchAggregates()
            })
            .subscribe()

        const invChannel = supabase
            .channel('public:investments:statscards')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'investments' }, () => {
                fetchAggregates()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(txChannel)
            supabase.removeChannel(profileChannel)
            supabase.removeChannel(invChannel)
        }
    }, [])

    const formatAmt = (amt) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt || 0)
    }

    const stats = [
        {
            label: 'Total Income',
            value: formatAmt(income),
            change: '+0.0%',
            up: true,
            color: 'blue',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            ),
        },
        {
            label: 'Total Expenses',
            value: formatAmt(expenses),
            change: '0.0%',
            up: false,
            color: 'pink',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
            ),
        },
        {
            label: 'Savings',
            value: formatAmt(savings),
            change: '+0.0%',
            up: true,
            color: 'green',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
                </svg>
            ),
        },
        {
            label: 'Investments',
            value: formatAmt(investments),
            amount: investments, // Keep raw value for check
            change: '+0.0%',
            up: true,
            color: 'purple',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
            ),
        },
    ]

    return (
        <div className="stats-grid">
            {stats.map((stat, i) => {
                return (
                    <div
                        className={`card stats-card fade-in-up stagger-${i + 2}`}
                        key={i}
                        style={{ cursor: (stat.label === 'Total Expenses' || stat.label === 'Savings' || stat.label === 'Investments') ? 'pointer' : 'default' }}
                        onClick={() => {
                            if (stat.label === 'Total Expenses') navigate('/pay', { state: { view: 'history', filter: 'expense' } })
                            if (stat.label === 'Savings') navigate('/savings')
                            if (stat.label === 'Investments') navigate('/investments')
                        }}
                    >
                        <div className="stat-icon-wrapper" style={{ 
                            background: `rgba(${stat.color === '#7C83FF' ? '124, 131, 255' : stat.color === '#FF7EB3' ? '255, 126, 179' : stat.color === '#7DDBA3' ? '125, 219, 163' : '195, 166, 247'}, 0.12)`,
                            color: stat.color
                        }}>
                            {stat.icon}
                        </div>
                        <div className="stat-content">
                            <span className="stat-label">{stat.label}</span>
                            <h3 className="stat-value">{stat.value}</h3>
                            <div className="stat-trend">
                                <span className={`trend-pill ${stat.trend === 'up' ? 'up' : 'down'}`}>
                                    {stat.trend === 'up' ? '↑' : '↓'} 0.0%
                                </span>
                                <span className="trend-text">from last week</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    )
}
