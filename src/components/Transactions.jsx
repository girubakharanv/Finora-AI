import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function formatAmount(amount) {
    const abs = Math.abs(amount)
    const formatted = abs >= 1000
        ? `₹${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
        : `₹${abs}`
    return amount < 0 ? `-${formatted}` : `+${formatted}`
}

const getCategoryMeta = (category) => {
    const map = {
        'Food & Dining': { type: 'food', emoji: '🍕' },
        'Transport': { type: 'transport', emoji: '🚗' },
        'Shopping': { type: 'shopping', emoji: '🛍️' },
        'Entertainment': { type: 'entertainment', emoji: '🎬' },
        'Bills': { type: 'bills', emoji: '⚡' },
        'Deposit': { type: 'salary', emoji: '💰' },
        'Others': { type: 'others', emoji: '💳' }
    }
    return map[category] || map['Others']
}

const timeAgo = (dateStr) => {
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return "Just now";
}

export default function Transactions({ limit = 5 }) {
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchTransactions = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (data) setTransactions(data)
            setLoading(false)
        }

        fetchTransactions()

        // Listen for real-time inserts to update instantly
        const channel = supabase
            .channel('public:transactions')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, payload => {
                setTransactions(current => [payload.new, ...current].slice(0, limit))
            })
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [limit])

    if (loading) {
        return (
            <div className="card transactions-card fade-in-up stagger-5" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <div className="auth-spinner"></div>
            </div>
        )
    }

    return (
        <div className="card transactions-card fade-in-up stagger-5">
            <div className="card-header">
                <h3>Recent Activity</h3>
                <a href="#" onClick={(e) => e.preventDefault()}>See All →</a>
            </div>

            <div className="transaction-list">
                {transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                        No transactions yet. Make a payment to see it here!
                    </div>
                ) : (
                    transactions.map((tx) => {
                        const meta = getCategoryMeta(tx.category)
                        const isIncome = tx.type === 'income'
                        const displayAmount = isIncome ? tx.amount : -tx.amount

                        return (
                            <div className="transaction-item" key={tx.id}>
                                <div className={`transaction-icon ${meta.type}`}>
                                    {meta.emoji}
                                </div>
                                <div className="transaction-details">
                                    <h4>{tx.description || tx.category}</h4>
                                    <p>{timeAgo(tx.created_at)}</p>
                                </div>
                                <div className={`transaction-amount ${!isIncome ? 'negative' : 'positive'}`}>
                                    {formatAmount(displayAmount)}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
