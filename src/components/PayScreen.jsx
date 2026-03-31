import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './PayScreen.css'

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000]

const BUDGET_CATEGORIES = [
    { id: 'Food & Dining', emoji: '🍔', name: 'Food' },
    { id: 'Transport', emoji: '🚗', name: 'Travel' },
    { id: 'Shopping', emoji: '🛒', name: 'Shopping' },
    { id: 'Bills', emoji: '⚡', name: 'Bills' },
    { id: 'Entertainment', emoji: '🎬', name: 'Movies' },
    { id: 'Others', emoji: '📦', name: 'Others' },
]

export default function PayScreen({ user }) {
    const location = useLocation()
    const [view, setView] = useState(location.state?.view || 'home')
    const [amount, setAmount] = useState('')
    const [receiverInput, setReceiverInput] = useState('')
    const [description, setDescription] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Others')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [walletBalance, setWalletBalance] = useState(0)
    const [salary, setSalary] = useState(0)
    const [recentTxns, setRecentTxns] = useState([])
    const [myPhone, setMyPhone] = useState('')
    const [myEmail, setMyEmail] = useState('')
    const [pin, setPin] = useState('')
    const [showPinPad, setShowPinPad] = useState(false)
    const [successData, setSuccessData] = useState(null)
    const [receiverPreview, setReceiverPreview] = useState(null)
    const [budgetData, setBudgetData] = useState([])

    useEffect(() => {
        fetchData()

        const profileChannel = supabase
            .channel('public:profiles:payscreen')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user?.id}` }, () => {
                fetchData()
            })
            .subscribe()

        const txChannel = supabase
            .channel('public:transactions:payscreen')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => {
                fetchData()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(profileChannel)
            supabase.removeChannel(txChannel)
        }
    }, [user])

    const fetchData = async () => {
        if (!user) return

        const { data: prof } = await supabase
            .from('profiles')
            .select('phone_number, balance, email, salary')
            .eq('id', user.id)
            .single()

        if (prof) {
            setMyPhone(prof.phone_number || '')
            setMyEmail(prof.email || user.email || '')
            setWalletBalance(Number(prof.balance) || 0)
            setSalary(Number(prof.salary) || 0)
        }

        const { data: txs } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (txs) {
            setRecentTxns(txs)
        }

        // Fetch budget data and current month's expenses
        const now = new Date()
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        const [budgetsRes, expenseRes] = await Promise.all([
            supabase.from('budgets').select('*').eq('user_id', user.id),
            supabase.from('transactions')
                .select('amount, category')
                .eq('user_id', user.id)
                .eq('type', 'expense')
                .gte('created_at', start)
                .lte('created_at', end)
        ])

        const catMap = {
            'Food & Dining': 'Food',
            'Transport': 'Travel',
            'Shopping': 'Shopping',
            'Bills': 'Bills',
            'Entertainment': 'Entertainment',
            'Others': 'Others'
        }

        const computeBudgetData = BUDGET_CATEGORIES.map(cat => {
            const budgetKey = catMap[cat.id] || 'Others'
            const limitRow = budgetsRes.data?.find(b => b.category === budgetKey)
            const limit_amount = limitRow ? Number(limitRow.limit_amount) : 0

            let spent = 0
            if (expenseRes.data) {
                expenseRes.data.forEach(tx => {
                    const txKey = catMap[tx.category] || 'Others'
                    if (txKey === budgetKey) spent += Number(tx.amount) || 0
                })
            }
            return { id: cat.id, budgetKey, limit_amount, spent }
        })

        setBudgetData(computeBudgetData)
    }

    // Detect if input is email or phone
    const isEmail = (val) => val.includes('@')

    // Look up receiver when input changes (debounced)
    useEffect(() => {
        const timer = setTimeout(async () => {
            const val = receiverInput.trim()
            if (!val) { setReceiverPreview(null); return }

            // Only search if it looks like a valid phone (10 digits) or email
            const isEmailInput = isEmail(val)
            const isPhoneInput = /^\d{10}$/.test(val)

            if (!isEmailInput && !isPhoneInput) { setReceiverPreview(null); return }

            let query = supabase.from('profiles').select('id, username, email, phone_number')

            if (isEmailInput) {
                query = query.eq('email', val)
            } else {
                query = query.eq('phone_number', val)
            }

            const { data } = await query

            if (data && data.length > 0 && data[0].id !== user?.id) {
                setReceiverPreview(data[0])
            } else {
                setReceiverPreview(null)
            }
        }, 500)

        return () => clearTimeout(timer)
    }, [receiverInput, user])

    const handlePinDigit = (d) => {
        if (d === '⌫') { setPin(p => p.slice(0, -1)); return }
        if (pin.length >= 4) return
        const newPin = pin + d
        setPin(newPin)
        if (newPin.length === 4) {
            setTimeout(() => {
                setShowPinPad(false)
                setPin('')
                if (view === 'save') executeSave()
                else executeSend()
            }, 300)
        }
    }

    const triggerSend = (e) => {
        e.preventDefault()
        const val = receiverInput.trim()

        if (!amount || isNaN(amount) || Number(amount) <= 0) { setErrorMsg('Enter a valid amount'); return }

        const isEmailInput = isEmail(val)
        const isPhoneInput = /^\d{10}$/.test(val)

        if (!isEmailInput && !isPhoneInput) {
            setErrorMsg('Enter a valid 10-digit phone number or email address')
            return
        }

        // Self-send check
        if (isEmailInput && val === myEmail) { setErrorMsg("You cannot send money to yourself!"); return }
        if (isPhoneInput && val === myPhone) { setErrorMsg("You cannot send money to yourself!"); return }

        const transferAmt = Number(amount)
        if (salary < transferAmt) {
            setErrorMsg('Insufficient salary balance')
            return
        }

        setErrorMsg('')
        setShowPinPad(true)
    }

    const executeSend = async () => {
        setLoading(true)
        setErrorMsg('')

        try {
            const transferAmt = Number(amount)
            const val = receiverInput.trim()
            const isEmailInput = isEmail(val)

            // 1. Lookup receiver
            let query = supabase.from('profiles').select('id, username, email, phone_number, salary')
            if (isEmailInput) query = query.eq('email', val)
            else query = query.eq('phone_number', val)
            const { data: receiverData, error: lookupErr } = await query.single()

            if (lookupErr || !receiverData) throw new Error('Receiver not found in Finora')
            if (receiverData.id === user.id) throw new Error('You cannot send money to yourself!')

            // 2. Check sender balance
            const { data: senderProfile, error: senderErr } = await supabase
                .from('profiles').select('salary, balance').eq('id', user.id).single()
            if (senderErr) throw senderErr
            const senderBal = Number(senderProfile.salary) || 0
            if (senderBal < transferAmt) throw new Error('Insufficient balance')

            // 3. Deduct from sender
            const { error: deductErr } = await supabase
                .from('profiles')
                .update({ salary: senderBal - transferAmt })
                .eq('id', user.id)
            if (deductErr) throw deductErr

            // 4. Credit receiver
            const receiverBal = Number(receiverData.salary) || 0
            const { error: creditErr } = await supabase
                .from('profiles')
                .update({ salary: receiverBal + transferAmt })
                .eq('id', receiverData.id)
            if (creditErr) throw creditErr

            // 5. Sender ledger entry (expense)
            await supabase.from('transactions').insert({
                user_id: user.id,
                amount: transferAmt,
                type: 'expense',
                category: selectedCategory,
                description: description || `Sent to ${receiverData.username || receiverData.email}`,
                status: 'completed'
            })

            // 6. Receiver ledger entry (income)
            await supabase.from('transactions').insert({
                user_id: receiverData.id,
                amount: transferAmt,
                type: 'income',
                category: 'Transfer',
                description: `Received from ${myEmail || user.email}`,
                status: 'completed'
            })

            const receiverName = receiverPreview?.username || receiverPreview?.email || val
            setSuccessData({ amount: transferAmt, phone: val, name: receiverName })
            setAmount('')
            setReceiverInput('')
            setDescription('')
            setSelectedCategory('Others')
            setReceiverPreview(null)
            setView('success')
            fetchData()

        } catch (err) {
            setErrorMsg(`Transfer failed: ${err.message || 'Please try again.'}`)
            console.error(err)
        }
        setLoading(false)
    }

    const executeSave = async () => {
        setLoading(true)
        setErrorMsg('')

        try {
            const transferAmt = Number(amount)

            // 1. Fetch current wallet balance
            const { data: prof, error: profErr } = await supabase
                .from('profiles').select('balance').eq('id', user.id).single()
            if (profErr) throw profErr

            const currentBal = Number(prof.balance) || 0
            if (currentBal < transferAmt) throw new Error('Insufficient wallet balance')

            // 2. Deduct from wallet
            const { error: updateErr } = await supabase
                .from('profiles')
                .update({ balance: currentBal - transferAmt })
                .eq('id', user.id)
            if (updateErr) throw updateErr

            // 3. Insert savings transaction
            const { error: txErr } = await supabase.from('transactions').insert({
                user_id: user.id,
                amount: transferAmt,
                type: 'transfer',
                category: 'Savings',
                description: 'Transferred to Savings',
                status: 'completed'
            })
            if (txErr) throw txErr

            setSuccessData({ amount: transferAmt, name: 'Savings Account', phone: 'piggy-bank' })
            setAmount('')
            setView('success')
            fetchData()

        } catch (err) {
            setErrorMsg(`Savings failed: ${err.message || 'Please try again.'}`)
            console.error(err)
        }
        setLoading(false)
    }

    const triggerSave = (e) => {
        e.preventDefault()
        if (!amount || isNaN(amount) || Number(amount) <= 0) { setErrorMsg('Enter a valid amount'); return }
        const transferAmt = Number(amount)
        if (walletBalance < transferAmt) {
            setErrorMsg('Insufficient balance')
            return
        }
        setErrorMsg('')
        setShowPinPad(true)
    }

    const formatINR = (n) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

    const timeAgo = (d) => {
        if (!d) return ''
        const s = Math.floor((Date.now() - new Date(d)) / 1000)
        if (s < 60) return 'Just now'
        if (s < 3600) return `${Math.floor(s / 60)}m ago`
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`
        return `${Math.floor(s / 86400)}d ago`
    }

    const renderTransactionItem = (tx) => {
        const isIncome = tx.type === 'income'

        return (
            <div key={tx.id} className="history-item">
                <div className={`history-dot ${tx.type}`}>
                    {isIncome ? '↓' : '↑'}
                </div>
                <div className="history-info">
                    <h4>{tx.description || 'Transfer'}</h4>
                    <p>{timeAgo(tx.created_at)}</p>
                </div>
                <div className={`history-amount ${isIncome ? 'income' : 'expense'}`} style={{ color: isIncome ? '#38B583' : '#EF4444' }}>
                    {isIncome ? '+' : '-'}{formatINR(tx.amount)}
                </div>
            </div>
        )
    }

    // ===== SUCCESS SCREEN =====
    if (view === 'success') return (
        <div className="pay-fullscreen success-screen">
            <div className="success-circle">🎉</div>
            <h2>Payment Sent!</h2>
            <p className="success-amount">{formatINR(successData?.amount || 0)}</p>
            <p className="success-sub">to {successData?.name} ({successData?.phone})</p>
            <button className="pay-btn-primary" onClick={() => { setView('home'); setSuccessData(null) }}>
                Back to Wallet
            </button>
        </div>
    )

    // ===== SEND SCREEN =====
    if (view === 'send') return (
        <div className="pay-screen-wrap">
            <div className="pay-topbar">
                <button className="pay-back-btn" onClick={() => { setView('home'); setErrorMsg(''); setReceiverPreview(null) }}>←</button>
                <h2>Send Money</h2>
                <div />
            </div>

            <form className="send-form-card" onSubmit={triggerSend}>
                <div className="send-avatar-row">
                    <div className="send-avatar-icon">💸</div>
                    <p>Send safely to any Finora Wallet</p>
                </div>

                {errorMsg && <div className="pay-error-banner">{errorMsg}</div>}

                {/* Receiver found preview */}
                {receiverPreview && (
                    <div style={{
                        background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: '12px',
                        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'
                    }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%', background: '#38B583',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                            fontWeight: 700, fontSize: '1.1rem'
                        }}>
                            {(receiverPreview.username || receiverPreview.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.95rem' }}>
                                ✅ {receiverPreview.username || 'User Found'}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#4ADE80' }}>
                                {receiverPreview.email}
                            </div>
                        </div>
                    </div>
                )}

                <div className="pay-field">
                    <label>Receiver (Phone or Email)</label>
                    <div className="pay-input-wrap">
                        <span className="pay-input-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="10-digit phone or email@example.com"
                            value={receiverInput}
                            onChange={e => {
                                const val = e.target.value
                                // Allow digits, @, ., _, -, letters
                                setReceiverInput(val)
                                setErrorMsg('')
                            }}
                            required
                        />
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '4px' }}>
                        Enter the receiver's phone number or email address
                    </p>
                </div>

                <div className="pay-field">
                    <label>Amount (₹)</label>
                    <div className="big-amount-input">
                        <span className="rupee-sym">₹</span>
                        <input
                            type="number"
                            placeholder="0"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                        />
                    </div>
                    <div className="quick-amounts">
                        {QUICK_AMOUNTS.map(q => (
                            <button type="button" key={q} className="quick-chip"
                                onClick={() => setAmount(String(q))}>
                                +{q}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pay-field">
                    <label>Category (Syncs with Budget)</label>
                    <div className="pay-category-grid">
                        {BUDGET_CATEGORIES.map(cat => (
                            <button
                                type="button"
                                key={cat.id}
                                className={`pay-cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat.id)}
                            >
                                <span className="cat-emoji">{cat.emoji}</span>
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pay-field">
                    <label>Note (optional)</label>
                    <div className="pay-input-wrap">
                        <span className="pay-input-icon">📝</span>
                        <input
                            type="text"
                            placeholder="e.g., Lunch, Rent split"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                {/* Budget Warning Banner */}
                {(() => {
                    if (!amount || isNaN(amount) || Number(amount) <= 0) return null
                    const transferAmt = Number(amount)
                    const catData = budgetData.find(b => b.id === selectedCategory)
                    if (catData && catData.limit_amount > 0) {
                        const newTotal = catData.spent + transferAmt
                        if (newTotal > catData.limit_amount) {
                            return (
                                <div style={{ background: '#FEF2F2', color: '#EF4444', padding: '12px 16px', borderRadius: '12px', marginBottom: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🚨</span>
                                    <span>
                                        <strong>Budget Exceeded:</strong> This ₹{transferAmt} payment exceeds your {catData.budgetKey} limit! 
                                        (Spent: ₹{catData.spent} / Limit: ₹{catData.limit_amount})
                                    </span>
                                </div>
                            )
                        } else if (newTotal >= catData.limit_amount * 0.8) {
                            return (
                                <div style={{ background: '#FFFBEB', color: '#D97706', padding: '12px 16px', borderRadius: '12px', marginBottom: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>⚠️</span>
                                    <span>
                                        <strong>Almost limit:</strong> This payment brings you near your {catData.budgetKey} budget limit. 
                                        (Remaining: ₹{catData.limit_amount - newTotal})
                                    </span>
                                </div>
                            )
                        }
                    }
                    return null
                })()}

                <button type="submit" className="pay-btn-primary" disabled={loading}>
                    {loading ? 'Processing...' : `Pay ₹${amount || '0'}`}
                </button>
            </form>

            {/* PIN Pad Overlay */}
            {showPinPad && (
                <div className="pin-overlay">
                    <div className="pin-card">
                        <h3>Confirm ₹{amount}</h3>
                        <p className="pin-sub">to {view === 'save' ? 'Savings Account' : (receiverPreview?.username || receiverInput)} • Enter any 4 digits</p>
                        <div className="pin-dots">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''}`} />
                            ))}
                        </div>
                        <div className="pin-grid">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) => (
                                <button key={i} className={`pin-key ${d === '' ? 'empty' : ''}`}
                                    onClick={() => d !== '' && handlePinDigit(d)}>
                                    {d}
                                </button>
                            ))}
                        </div>
                        <button className="pay-btn-outline" onClick={() => { setShowPinPad(false); setPin('') }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    )

    // ===== SAVE SCREEN =====
    if (view === 'save') return (
        <div className="pay-screen-wrap">
            <div className="pay-topbar">
                <button className="pay-back-btn" onClick={() => { setView('home'); setErrorMsg(''); }}>←</button>
                <h2>Save Money</h2>
                <div />
            </div>

            <form className="send-form-card" onSubmit={triggerSave}>
                <div className="send-avatar-row">
                    <div className="send-avatar-icon" style={{ background: '#E0F2FE' }}>🐷</div>
                    <p>Transfer money from Wallet to Savings</p>
                </div>

                {errorMsg && <div className="pay-error-banner">{errorMsg}</div>}

                <div className="pay-field">
                    <label>Amount (₹)</label>
                    <div className="big-amount-input">
                        <span className="rupee-sym" style={{ color: '#38B583' }}>₹</span>
                        <input
                            type="number"
                            placeholder="0"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                        />
                    </div>
                    <div className="quick-amounts">
                        {QUICK_AMOUNTS.map(q => (
                            <button type="button" key={q} className="quick-chip"
                                onClick={() => setAmount(String(q))}>
                                +{q}
                            </button>
                        ))}
                    </div>
                </div>

                <button type="submit" className="pay-btn-primary" style={{ background: 'linear-gradient(135deg, #7DDBA3 0%, #38B583 100%)' }} disabled={loading}>
                    {loading ? 'Processing...' : `Move ₹${amount || '0'} to Savings`}
                </button>
            </form>

            {/* PIN Pad Overlay */}
            {showPinPad && (
                <div className="pin-overlay">
                    <div className="pin-card">
                        <h3>Confirm Savings: ₹{amount}</h3>
                        <p className="pin-sub">to Savings Account • Enter any 4 digits</p>
                        <div className="pin-dots">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''}`} />
                            ))}
                        </div>
                        <div className="pin-grid">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) => (
                                <button key={i} className={`pin-key ${d === '' ? 'empty' : ''}`} type="button"
                                    onClick={() => d !== '' && handlePinDigit(d)}>
                                    {d}
                                </button>
                            ))}
                        </div>
                        <button className="pay-btn-outline" type="button" onClick={() => { setShowPinPad(false); setPin('') }}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    )

    // ===== HISTORY SCREEN =====
    if (view === 'history') return (
        <div className="pay-screen-wrap">
            <div className="pay-topbar">
                <button className="pay-back-btn" onClick={() => setView('home')}>←</button>
                <h2>Transaction History</h2>
                <div />
            </div>
            <div className="history-list section-card">
                {recentTxns.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: '3rem' }}>💤</div>
                        <p>No transactions yet</p>
                    </div>
                ) : (
                    recentTxns
                        .filter(tx => {
                            const f = location.state?.filter
                            if (f === 'expense') return tx.type !== 'income'
                            if (f === 'income') return tx.type === 'income'
                            return true
                        })
                        .map(renderTransactionItem)
                )}
            </div>
        </div>
    )

    // ===== HOME SCREEN =====
    return (
        <div className="pay-screen-wrap">
            {/* Balance Card */}
            <div className="wallet-header">
                <div className="wallet-header-top">
                    <div>
                        <p className="wallet-label">Finora Wallet</p>
                        <h1 className="wallet-balance">{formatINR(walletBalance)}</h1>
                        <p className="wallet-sub">Live Balance ✅</p>
                    </div>
                    <div className="wallet-avatar">
                        {user?.email?.charAt(0).toUpperCase() || '🦊'}
                    </div>
                </div>
                <div className="wallet-email">
                    {myPhone ? `📱 ${myPhone}` : `📧 ${myEmail || 'Not set'}`}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <button className="qa-btn" onClick={() => setView('send')}>
                    <div className="qa-icon send">↑</div>
                    <span>Send</span>
                </button>
                <button className="qa-btn" onClick={() => setView('save')}>
                    <div className="qa-icon" style={{ background: '#D1FAE5', color: '#10B981' }}>🐷</div>
                    <span>Save</span>
                </button>
                <button className="qa-btn" onClick={() => setView('history')}>
                    <div className="qa-icon history">≡</div>
                    <span>History</span>
                </button>
            </div>

            {/* Recent Transactions */}
            <div className="section-card">
                <div className="section-header">
                    <h3 className="section-title">Recent</h3>
                    <button className="see-all-btn" onClick={() => setView('history')}>See All →</button>
                </div>
                {recentTxns.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: '2.5rem' }}>💸</div>
                        <p>Send money to get started!</p>
                    </div>
                ) : recentTxns.slice(0, 4).map(renderTransactionItem)}
            </div>
        </div>
    )
}
