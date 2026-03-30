import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import './PayScreen.css'

const RECENT_CONTACTS = [
    { name: 'Aarav', emoji: '👦', color: '#7C83FF' },
    { name: 'Priya', emoji: '👧', color: '#FF5F96' },
    { name: 'Ranjit', emoji: '🧑', color: '#56C596' },
    { name: 'Meena', emoji: '👩', color: '#FF9F43' },
    { name: 'Dev', emoji: '🧔', color: '#A78BFA' },
]

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000]

export default function PayScreen({ user }) {
    const [view, setView] = useState('home') // home | send | receive | history
    const [amount, setAmount] = useState('')
    const [receiverEmail, setReceiverEmail] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')
    const [errorMsg, setErrorMsg] = useState('')
    const [statusMascot, setStatusMascot] = useState(null) // null | 'success' | 'error'
    const [walletBalance, setWalletBalance] = useState(0)
    const [recentTxns, setRecentTxns] = useState([])
    const [pin, setPin] = useState('')
    const [showPinPad, setShowPinPad] = useState(false)

    useEffect(() => {
        fetchData()
    }, [user])

    const fetchData = async () => {
        if (!user) return
        const { data } = await supabase
            .from('transactions')
            .select('amount, type, description, created_at, category')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) {
            let inc = 0, exp = 0
            data.forEach(tx => {
                if (tx.type === 'income') inc += tx.amount
                else exp += tx.amount
            })
            setWalletBalance(inc - exp < 0 ? 0 : inc - exp)
            setRecentTxns(data.slice(0, 8))
        }
    }

    const handlePinDigit = (d) => {
        if (d === '⌫') { setPin(p => p.slice(0, -1)); return }
        if (pin.length >= 4) return
        const newPin = pin + d
        setPin(newPin)
        if (newPin.length === 4) {
            setTimeout(() => {
                setShowPinPad(false)
                setPin('')
                executeSend()
            }, 300)
        }
    }

    const triggerSend = (e) => {
        e.preventDefault()
        if (!amount || isNaN(amount) || Number(amount) <= 0) { setErrorMsg('Enter a valid amount'); return }
        if (!receiverEmail.includes('@')) { setErrorMsg('Enter a valid receiver email'); return }
        setErrorMsg('')
        setShowPinPad(true)
    }

    const executeSend = async () => {
        setLoading(true)
        setSuccessMsg('')
        setErrorMsg('')
        setStatusMascot(null)

        try {
            const res = await fetch('http://localhost:5000/p2p-transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender_id: user.id,
                    receiver_email: receiverEmail,
                    amount: Number(amount),
                    description: description || 'Finora Transfer'
                })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setSuccessMsg(data.message)
                setStatusMascot('success')
                setAmount('')
                setReceiverEmail('')
                setDescription('')
                setView('success')
                fetchData()
            } else {
                setErrorMsg(data.error || 'Transfer failed')
                setStatusMascot('error')
                setView('send')
            }
        } catch {
            setErrorMsg('Backend offline. Run: cd backend && node server.js')
            setStatusMascot('error')
            setView('send')
        }
        setLoading(false)
    }

    const formatINR = (n) =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

    const timeAgo = (d) => {
        const s = Math.floor((Date.now() - new Date(d)) / 1000)
        if (s < 60) return 'Just now';
        if (s < 3600) return `${Math.floor(s / 60)}m ago`
        if (s < 86400) return `${Math.floor(s / 3600)}h ago`
        return `${Math.floor(s / 86400)}d ago`
    }

    // ========== VIEWS ==========
    if (view === 'success') return (
        <div className="pay-fullscreen success-screen">
            <div className="success-circle">✅</div>
            <h2>Payment Sent!</h2>
            <p className="success-amount">{formatINR(Number(amount) || 0)}</p>
            <p className="success-sub">to {receiverEmail}</p>
            <button className="pay-btn-primary" onClick={() => { setView('home'); setSuccessMsg(''); }}>
                Back to Wallet
            </button>
        </div>
    )

    if (view === 'send') return (
        <div className="pay-screen-wrap">
            <div className="pay-topbar">
                <button className="pay-back-btn" onClick={() => setView('home')}>←</button>
                <h2>Send Money</h2>
                <div />
            </div>

            <form className="send-form-card" onSubmit={triggerSend}>
                <div className="send-avatar-row">
                    <div className="send-avatar-icon">💸</div>
                    <p>Send to anyone on Finora</p>
                </div>

                {errorMsg && <div className="pay-error-banner">{errorMsg}</div>}

                <div className="pay-field">
                    <label>Receiver Email</label>
                    <div className="pay-input-wrap">
                        <span className="pay-input-icon">📧</span>
                        <input type="email" placeholder="friend@gmail.com" value={receiverEmail}
                            onChange={e => setReceiverEmail(e.target.value)} required />
                    </div>
                </div>

                <div className="pay-field">
                    <label>Amount (₹)</label>
                    <div className="big-amount-input">
                        <span className="rupee-sym">₹</span>
                        <input type="number" placeholder="0" value={amount}
                            onChange={e => setAmount(e.target.value)} required />
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
                    <label>Note (optional)</label>
                    <div className="pay-input-wrap">
                        <span className="pay-input-icon">📝</span>
                        <input type="text" placeholder="e.g., Lunch, Rent split..."
                            value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                </div>

                <button type="submit" className="pay-btn-primary" disabled={loading}>
                    {loading ? 'Processing...' : `Pay ₹${amount || '0'}`}
                </button>
            </form>

            {/* PIN Pad Overlay */}
            {showPinPad && (
                <div className="pin-overlay">
                    <div className="pin-card">
                        <h3>Confirm Payment</h3>
                        <p className="pin-sub">Enter your 4-digit Finora PIN</p>
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

    if (view === 'history') return (
        <div className="pay-screen-wrap">
            <div className="pay-topbar">
                <button className="pay-back-btn" onClick={() => setView('home')}>←</button>
                <h2>Transaction History</h2>
                <div />
            </div>
            <div className="history-list">
                {recentTxns.length === 0 ? (
                    <div className="empty-state">
                        <div style={{ fontSize: '3rem' }}>💤</div>
                        <p>No transactions yet</p>
                    </div>
                ) : recentTxns.map((tx, i) => (
                    <div key={i} className="history-item">
                        <div className={`history-dot ${tx.type}`}>
                            {tx.type === 'income' ? '↓' : '↑'}
                        </div>
                        <div className="history-info">
                            <h4>{tx.description || tx.category}</h4>
                            <p>{timeAgo(tx.created_at)}</p>
                        </div>
                        <div className={`history-amount ${tx.type}`}>
                            {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    // ===== HOME VIEW =====
    return (
        <div className="pay-screen-wrap">
            {/* Balance Header */}
            <div className="wallet-header">
                <div className="wallet-header-top">
                    <div>
                        <p className="wallet-label">Finora Wallet</p>
                        <h1 className="wallet-balance">{formatINR(walletBalance)}</h1>
                        <p className="wallet-sub">Available Balance</p>
                    </div>
                    <div className="wallet-avatar">
                        {user?.email?.charAt(0).toUpperCase() || '🦊'}
                    </div>
                </div>
                <div className="wallet-email">{user?.email}</div>
            </div>

            {/* Quick Action Row */}
            <div className="quick-actions">
                <button className="qa-btn" onClick={() => setView('send')}>
                    <div className="qa-icon send">↑</div>
                    <span>Send</span>
                </button>
                <button className="qa-btn" onClick={() => setView('receive')}>
                    <div className="qa-icon receive">↓</div>
                    <span>Receive</span>
                </button>
                <button className="qa-btn" onClick={() => setView('history')}>
                    <div className="qa-icon history">≡</div>
                    <span>History</span>
                </button>
                <button className="qa-btn" onClick={() => setView('send')}>
                    <div className="qa-icon request">⚡</div>
                    <span>Request</span>
                </button>
            </div>

            {/* Recent Contacts */}
            <div className="section-card">
                <h3 className="section-title">People</h3>
                <div className="contacts-row">
                    {RECENT_CONTACTS.map((c, i) => (
                        <button key={i} className="contact-btn"
                            onClick={() => { setView('send'); setReceiverEmail('') }}>
                            <div className="contact-avatar" style={{ background: c.color }}>
                                {c.emoji}
                            </div>
                            <span>{c.name}</span>
                        </button>
                    ))}
                    <button className="contact-btn" onClick={() => setView('send')}>
                        <div className="contact-avatar new">+</div>
                        <span>New</span>
                    </button>
                </div>
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
                ) : recentTxns.slice(0, 4).map((tx, i) => (
                    <div key={i} className="history-item">
                        <div className={`history-dot ${tx.type}`}>
                            {tx.type === 'income' ? '↓' : '↑'}
                        </div>
                        <div className="history-info">
                            <h4>{tx.description || tx.category}</h4>
                            <p>{timeAgo(tx.created_at)}</p>
                        </div>
                        <div className={`history-amount ${tx.type}`}>
                            {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
