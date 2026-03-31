import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Auth.css'

export default function AuthPage({ defaultMode = 'login' }) {
    const [isLogin, setIsLogin] = useState(defaultMode === 'login')

    useEffect(() => {
        setIsLogin(defaultMode === 'login')
    }, [defaultMode])
    const [showPassword, setShowPassword] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')

    // UI States
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    const validateEmail = (e) => e.includes('@') && e.includes('.')

    const getPasswordStrength = () => {
        if (!password) return null
        if (password.length < 6) return { text: 'Weak (min 6 chars)', color: '#FF5F96' }
        if (password.length >= 6 && password.length < 9) return { text: 'Medium', color: '#FFB74D' }
        return { text: 'Strong', color: '#56C596' }
    }

    const passStrength = getPasswordStrength()

    const isFormValid = () => {
        if (!validateEmail(email)) return false
        if (password.length < 6) return false
        if (!isLogin && !name.trim()) return false
        return true
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrorMsg('')
        setSuccessMsg('')

        if (!validateEmail(email)) return setErrorMsg('Please enter a valid email addressing containing "@" and domain.')
        if (password.length < 6) return setErrorMsg('Password must be at least 6 characters.')
        if (!isLogin && !name.trim()) return setErrorMsg('Please enter your full name.')
        if (!isLogin && (!/^[0-9]{10}$/.test(phone))) return setErrorMsg('Please enter a valid 10-digit mobile number.')

        setLoading(true)

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) {
                    if (error.message.includes('Invalid login credentials')) {
                        throw new Error('Incorrect email or password.')
                    }
                    throw error
                }
                // App.jsx will automatically redirect upon session change
            } else {
                const { data: existingPhone } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('phone_number', phone)
                    .maybeSingle();

                if (existingPhone) {
                    throw new Error('This mobile number is already registered. Please use another one.');
                }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { username: name } }
                })

                if (error) {
                    if (error.message.includes('already registered')) {
                        throw new Error('Already registered using the mail id')
                    }
                    throw error
                }

                if (data?.user) {
                    // Try to insert into profiles. Assumes RLS allows this, or it's done via DB trigger.
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert([{ id: data.user.id, username: name, email, phone }])

                    if (profileError) {
                        console.error('Profile insertion error:', profileError.message)
                        if ((profileError.message && profileError.message.includes('profiles_phone_number_key')) || 
                            (profileError.code === '23505' && profileError.message && profileError.message.includes('phone_number'))) {
                            throw new Error("Account created, but mobile number is already in use by another profile. Please update it in settings later.");
                        }
                    }
                }
                setSuccessMsg('Account created successfully!')
            }
        } catch (error) {
            setErrorMsg(error.message)
        } finally {
            setLoading(false)
        }
    }

    const switchMode = (mode) => {
        navigate(mode ? '/login' : '/signup')
        setErrorMsg('')
        setSuccessMsg('')
    }

    return (
        <div className="auth-page">
            {/* Left — Illustration Panel */}
            <div className="auth-left">
                <div className="auth-illustration fade-in-up">
                    <div className="auth-mascot-container">
                        <span className="auth-mascot" role="img" aria-label="Fox mascot">🦊</span>
                        <span className="mascot-coins coin-1">🪙</span>
                        <span className="mascot-coins coin-2">💰</span>
                        <span className="mascot-coins coin-3">📊</span>
                        <span className="auth-sparkles spark-1">✨</span>
                        <span className="auth-sparkles spark-2">⭐</span>
                    </div>

                    <div className="auth-welcome-text">
                        <h2>
                            Welcome to{' '}
                            <span className="highlight">Finora AI</span>
                        </h2>
                        <p>Your Smart Money Companion — manage finances with fun, intelligence, and ease.</p>
                    </div>

                    <div className="auth-features">
                        <div className="auth-feature-chip"><span>🤖</span> AI Insights</div>
                        <div className="auth-feature-chip"><span>📈</span> Smart Tracking</div>
                        <div className="auth-feature-chip"><span>🔒</span> Secure Database</div>
                    </div>
                </div>
            </div>

            {/* Right — Form Panel */}
            <div className="auth-right">
                <div className="auth-card">
                    <div className="auth-card-header">
                        <div className="auth-logo">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <h1>{isLogin ? 'Welcome Back! 👋' : 'Join Finora AI! 🚀'}</h1>
                        <p>{isLogin ? 'Sign in to continue your financial journey' : 'Create your account and start saving smartly'}</p>
                    </div>

                    {/* Alerts */}
                    {errorMsg && <div className="auth-alert error">{errorMsg}</div>}
                    {successMsg && <div className="auth-alert success">{successMsg}</div>}

                    {/* Login / Signup Tabs */}
                    <div className="auth-tabs">
                        <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => switchMode(true)}>
                            Login
                        </button>
                        <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => switchMode(false)}>
                            Sign Up
                        </button>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        {/* Name (signup only) */}
                        {!isLogin && (
                            <div className="form-group fade-in-up">
                                <label htmlFor="auth-name">Full Name</label>
                                <div className="form-input-wrapper">
                                    <input
                                        id="auth-name"
                                        type="text"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        disabled={loading}
                                    />
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                            </div>
                        )}

                        {/* Phone (signup only) */}
                        {!isLogin && (
                            <div className="form-group fade-in-up">
                                <label htmlFor="auth-phone">Mobile Number</label>
                                <div className="form-input-wrapper">
                                    <input
                                        id="auth-phone"
                                        type="tel"
                                        placeholder="10-digit mobile number"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        disabled={loading}
                                        maxLength={10}
                                    />
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.42 2 2 0 0 1 3 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 16z" />
                                    </svg>
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        <div className="form-group">
                            <label htmlFor="auth-email">Email Address</label>
                            <div className={`form-input-wrapper ${email && !validateEmail(email) ? 'invalid' : ''}`}>
                                <input
                                    id="auth-email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                            </div>
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label htmlFor="auth-password">Password</label>
                            <div className="form-input-wrapper">
                                <input
                                    id="auth-password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {password && (
                                <div className="password-strength" style={{ color: passStrength.color }}>
                                    {passStrength.text}
                                </div>
                            )}
                        </div>

                        {/* Extras (login only) */}
                        {isLogin && (
                            <div className="form-extras">
                                <label className="remember-me">
                                    <input type="checkbox" disabled={loading} />
                                    Remember me
                                </label>
                                <a href="#" className="forgot-link" onClick={(e) => e.preventDefault()}>Forgot Password?</a>
                            </div>
                        )}

                        {/* Submit */}
                        <button type="submit" className="auth-submit-btn" disabled={!isFormValid() || loading}>
                            {loading ? (
                                <span className="auth-spinner"></span>
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-footer">
                        {isLogin ? (
                            <p>Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); switchMode(false); }}>Sign Up</a></p>
                        ) : (
                            <p>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); switchMode(true); }}>Login</a></p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
