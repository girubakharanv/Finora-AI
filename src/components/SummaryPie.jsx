import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'

const CATEGORY_COLORS = {
    'Food & Dining': '#EB5757',
    'Shopping': '#2F80ED',
    'Transport': '#F2C94C',
    'Entertainment': '#9B51E0',
    'Others': '#A9A8BD'
}

function buildConicGradient(data) {
    if (!data || data.length === 0) return 'rgba(0,0,0,0.05)'
    let cumulative = 0
    const stops = []
    data.forEach((item) => {
        stops.push(`${item.color} ${cumulative}%`)
        cumulative += item.value
        stops.push(`${item.color} ${cumulative}%`)
    })
    return `conic-gradient(${stops.join(', ')})`
}

export default function SummaryPie({ user }) {
    const [categories, setCategories] = useState([])
    const [totalExpense, setTotalExpense] = useState(0)
    const [loading, setLoading] = useState(true)

    const formatINR = (n) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

    const fetchData = useCallback(async () => {
        if (!user) return
        setLoading(true)

        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        const { data } = await supabase
            .from('transactions')
            .select('amount, category')
            .eq('user_id', user.id)
            .eq('type', 'expense')
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth)

        if (data) {
            const totals = {}
            let total = 0
            data.forEach(tx => {
                const cat = tx.category || 'Others'
                totals[cat] = (totals[cat] || 0) + Number(tx.amount)
                total += Number(tx.amount)
            })

            const processed = Object.entries(totals).map(([name, amount]) => ({
                name,
                value: total > 0 ? (amount / total) * 100 : 0,
                color: CATEGORY_COLORS[name] || CATEGORY_COLORS['Others']
            }))
            setCategories(processed)
            setTotalExpense(total)
        }
        setLoading(false)
    }, [user])

    useEffect(() => {
        fetchData()
        const channel = supabase.channel('public:summarypie')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user?.id}` }, () => fetchData())
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [fetchData, user])

    return (
        <div className="card summary-pie-card glass-card" style={{ flex: '0 0 320px', padding: '24px' }}>
            <div className="card-header" style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Summary</h3>
            </div>
            <div className="summary-pie-content" style={{ position: 'relative', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {loading ? <div className="auth-spinner" /> : (
                    <div className="pie-donut" style={{ width: '160px', height: '160px', borderRadius: '50%', background: buildConicGradient(categories), display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                        <div className="pie-donut-hole" style={{ width: '100px', height: '100px', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: '#6B7280', fontWeight: 600 }}>Total Spent</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{formatINR(totalExpense)}</span>
                        </div>
                    </div>
                )}
            </div>
            <div className="summary-pie-legend" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {categories.slice(0, 4).map((cat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cat.color }} />
                        <span style={{ color: '#4B5563' }}>{cat.name}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
