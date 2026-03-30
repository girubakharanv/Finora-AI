import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import './Auth.css' // Reusing some base styles for inputs

// Helper to dynamically load Razorpay script
const loadRazorpay = () => {
    return new Promise((resolve) => {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.onload = () => {
            resolve(true)
        }
        script.onerror = () => {
            resolve(false)
        }
        document.body.appendChild(script)
    })
}

export default function PaymentScreen({ user }) {
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')
    const [statusMascot, setStatusMascot] = useState('🤖') // Default, Happy 🎉, Sad 😥

    const handlePayment = async (e) => {
        e.preventDefault()
        if (!amount || isNaN(amount) || amount <= 0) {
            setErrorMsg('Please enter a valid amount')
            return
        }

        setLoading(true)
        setErrorMsg('')
        setSuccessMsg('')
        setStatusMascot('⏳')

        const res = await loadRazorpay()
        if (!res) {
            setErrorMsg('Razorpay SDK failed to load. Check your connection.')
            setLoading(false)
            setStatusMascot('😥')
            return
        }

        try {
            // 1. Create Order on our local Backend
            const orderResponse = await fetch('http://localhost:5000/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(amount) })
            })

            if (!orderResponse.ok) {
                const text = await orderResponse.text()
                throw new Error("Ensure backend is running on port 5000. Setup your keys in backend/.env")
            }

            const order = await orderResponse.json()

            // 2. Initialize Razorpay Checkout
            // NOTE: The key_id here should ideally fall back to a public env variable
            // Since this is a test environment, the user will replace this string or set it.
            const checkoutOptions = {
                key: process.env.VITE_RAZORPAY_KEY_ID || 'YOUR_RAZORPAY_KEY_ID', // Replace in production
                amount: order.amount,
                currency: order.currency,
                name: 'Finora AI',
                description: description || 'Smart Payment',
                order_id: order.id,
                theme: {
                    color: '#B565FF' // Finora Neon Purple
                },
                handler: async function (response) {
                    try {
                        // 3. Verify Payment Signature Backend
                        const verifyRes = await fetch('http://localhost:5000/verify-payment', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                user_id: user.id,
                                amount: Number(amount),
                                description: description || 'General Expense'
                            })
                        })

                        const verifyData = await verifyRes.json()

                        if (verifyData.success) {
                            setSuccessMsg(`Payment Success! Logged under: ${verifyData.category}`)
                            setStatusMascot('🎉')
                            setAmount('')
                            setDescription('')
                        } else {
                            setErrorMsg(verifyData.error || 'Verification failed')
                            setStatusMascot('😥')
                        }
                    } catch (err) {
                        setErrorMsg('Failed to verify payment with server')
                        setStatusMascot('😥')
                    }
                },
                prefill: {
                    name: user.user_metadata?.username || 'User',
                    email: user.email || ''
                }
            }

            const rzp = new window.Razorpay(checkoutOptions)
            rzp.on('payment.failed', function (response) {
                setErrorMsg(`Payment Failed: ${response.error.description}`)
                setStatusMascot('😥')
            })
            rzp.open()
        } catch (err) {
            setErrorMsg(err.message)
            setStatusMascot('😥')
        }
        setLoading(false)
    }

    return (
        <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }} className="fade-in-up">
            <h2 style={{ fontSize: '2rem', marginBottom: '10px' }}>Make a Payment</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
                Securely send money via Razorpay. Finora AI will auto-categorize this expense.
            </p>

            <div style={{ background: 'white', padding: '40px', borderRadius: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)', textAlign: 'center' }}>

                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>
                    {statusMascot}
                </div>

                {errorMsg && (
                    <div style={{ background: '#FFF0F5', color: '#F43F5E', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontWeight: 500 }}>
                        {errorMsg}
                    </div>
                )}
                {successMsg && (
                    <div style={{ background: '#F0FDF4', color: '#10B981', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontWeight: 500 }}>
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                            Amount (₹)
                        </label>
                        <input
                            type="number"
                            placeholder="Enter amount (e.g., 500)"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="auth-input"
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
                            What is this for? (Helps AI categorize)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Swiggy Lunch, Uber Ride..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="auth-input"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: 'linear-gradient(135deg, #7C83FF 0%, #B565FF 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '16px',
                            borderRadius: '16px',
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '10px',
                            transition: 'all 0.2s',
                            boxShadow: '0 10px 20px rgba(181, 101, 255, 0.3)'
                        }}
                    >
                        {loading ? 'Processing...' : `Pay ₹${amount || '0'} Securely`}
                    </button>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                        🔒 Secured by Razorpay Payment Gateway
                    </p>
                </form>
            </div>
        </div>
    )
}
