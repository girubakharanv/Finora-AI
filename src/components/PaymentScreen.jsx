import React, { useState } from 'react'

export default function PaymentScreen({ user }) {
    const [amount, setAmount] = useState('')
    const [receiverEmail, setReceiverEmail] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')
    const [statusMascot, setStatusMascot] = useState('🦊')

    const handleTransfer = async (e) => {
        e.preventDefault()
        if (!amount || isNaN(amount) || amount <= 0) {
            setErrorMsg('Please enter a valid amount')
            return
        }
        if (!receiverEmail.includes('@')) {
            setErrorMsg('Please enter a valid receiver email')
            return
        }

        setLoading(true)
        setErrorMsg('')
        setSuccessMsg('')
        setStatusMascot('⏳')

        try {
            const res = await fetch('http://localhost:5000/p2p-transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender_id: user.id,
                    receiver_email: receiverEmail,
                    amount: Number(amount),
                    description: description || 'Transfer'
                })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                setSuccessMsg(data.message)
                setStatusMascot('🎉')
                setAmount('')
                setReceiverEmail('')
                setDescription('')
            } else {
                setErrorMsg(data.error || 'Failed to process transfer')
                setStatusMascot('😥')
            }
        } catch (err) {
            setErrorMsg('Network Error: Ensure your Finora backend (port 5000) is running.')
            setStatusMascot('😥')
        }

        setLoading(false)
    }

    return (
        <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '40px', flexWrap: 'wrap' }} className="fade-in-up">

            {/* LEFT: Receive Section */}
            <div style={{ flex: '1 1 350px', background: 'white', padding: '40px', borderRadius: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Receive Money</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '0.95rem' }}>
                    Share your registered email with friends so they can send you funds instantly.
                </p>

                <div style={{ width: '200px', height: '200px', background: 'var(--bg-main)', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--primary)', marginBottom: '24px' }}>
                    <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <rect x="7" y="7" width="3" height="3" />
                        <rect x="14" y="7" width="3" height="3" />
                        <rect x="7" y="14" width="3" height="3" />
                        <rect x="14" y="14" width="3" height="3" />
                    </svg>
                </div>

                <div style={{ background: '#F8F9FA', padding: '16px 24px', borderRadius: '16px', width: '100%', fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-main)', border: '1px solid #E2E8F0' }}>
                    {user?.email || 'user@example.com'}
                </div>
            </div>

            {/* RIGHT: Send Section */}
            <div style={{ flex: '1 1 450px', background: 'white', padding: '40px', borderRadius: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '10px' }}>
                        {statusMascot}
                    </div>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Send Money</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Zero fees. Instant Finora network transfers.</p>
                </div>

                {errorMsg && (
                    <div style={{ background: '#FFF0F5', color: '#F43F5E', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontWeight: 500, textAlign: 'center' }}>
                        {errorMsg}
                    </div>
                )}
                {successMsg && (
                    <div style={{ background: '#F0FDF4', color: '#10B981', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontWeight: 500, textAlign: 'center' }}>
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                            To (Enter receiver's Finora Email)
                        </label>
                        <input
                            type="email"
                            placeholder="friend@example.com"
                            value={receiverEmail}
                            onChange={(e) => setReceiverEmail(e.target.value)}
                            className="auth-input"
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                            Amount (₹)
                        </label>
                        <input
                            type="number"
                            placeholder="e.g., 500"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="auth-input"
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                            What's it for? (Categorized automatically)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Dinner, Rent, Uber split..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="auth-input"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: 'linear-gradient(135deg, #7DDBA3 0%, #38B583 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '16px',
                            borderRadius: '16px',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '10px',
                            transition: 'all 0.2s',
                            boxShadow: '0 10px 20px rgba(86, 197, 150, 0.3)'
                        }}
                    >
                        {loading ? 'Processing Transfer...' : `Send ₹${amount || '0'}`}
                    </button>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                        ⚡ Finora Secure Transfer Network
                    </p>
                </form>
            </div>
        </div>
    )
}
