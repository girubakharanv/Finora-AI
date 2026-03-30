import React from 'react'
import { useNavigate } from 'react-router-dom'
import './Landing.css'

export default function LandingPage({ session }) {
    const navigate = useNavigate()

    const handleGetStarted = () => {
        if (session) {
            navigate('/dashboard')
        } else {
            navigate('/signup')
        }
    }

    return (
        <div className="landing-wrapper">
            {/* Navbar */}
            <nav className="landing-nav">
                <div className="landing-logo">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    <span>Finora AI</span>
                </div>
                <div className="landing-nav-links">
                    {session ? (
                        <button className="landing-btn-primary" onClick={() => navigate('/dashboard')}>
                            Dashboard
                        </button>
                    ) : (
                        <>
                            <button className="landing-btn-ghost" onClick={() => navigate('/login')}>Login</button>
                            <button className="landing-btn-primary" onClick={() => navigate('/signup')}>Sign Up</button>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="landing-hero">
                <div className="landing-hero-content fade-in-up">
                    <div className="landing-badge">✨ Next-Gen Personal Finance</div>
                    <h1>Transform Your <span className="neon-text">Financial Intelligence</span></h1>
                    <p>Track, analyze, and predict your finances with our beautifully designed, AI-powered insights assistant.</p>
                    <div className="hero-buttons">
                        <button className="landing-btn-primary large glow-btn" onClick={handleGetStarted}>
                            Get Started
                        </button>
                        {!session && (
                            <button className="landing-btn-secondary large" onClick={() => navigate('/login')}>
                                Login to Account
                            </button>
                        )}
                    </div>
                </div>

                <div className="landing-hero-3d">
                    <div className="mascot-3d-wrapper">
                        <span className="mascot-3d-fox">🦊</span>
                        <span className="element-3d float-1">🪙</span>
                        <span className="element-3d float-2">📈</span>
                        <span className="element-3d float-3">💎</span>
                        <div className="neon-glow-blob blob-1"></div>
                        <div className="neon-glow-blob blob-2"></div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="landing-features">
                <h2>Why choose Finora AI?</h2>
                <div className="features-grid">
                    <div className="glass-card feature-card">
                        <div className="feature-icon">🧠</div>
                        <h3>AI Insights</h3>
                        <p>Our smart assistant "Fina" analyzes your spending habits and warns you before you overspend.</p>
                    </div>
                    <div className="glass-card feature-card">
                        <div className="feature-icon">📊</div>
                        <h3>Smart Tracking</h3>
                        <p>Beautiful, smooth, and interactive charts visualize exactly where your money is going.</p>
                    </div>
                    <div className="glass-card feature-card">
                        <div className="feature-icon">🔮</div>
                        <h3>Predictive Analysis</h3>
                        <p>See the future. We project your weekend spending to keep you in the safe green zone.</p>
                    </div>
                    <div className="glass-card feature-card">
                        <div className="feature-icon">🎮</div>
                        <h3>Gamified Savings</h3>
                        <p>Earn XP, unlock badges, and complete daily finance missions to make saving money fun.</p>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="landing-steps">
                <h2>How It Works</h2>
                <div className="steps-container">
                    <div className="step-item">
                        <div className="step-number">1</div>
                        <h3>Add Expenses</h3>
                        <p>Quickly log your transactions with our 1-click emoji selector.</p>
                    </div>
                    <div className="step-connector"></div>
                    <div className="step-item">
                        <div className="step-number">2</div>
                        <h3>AI Analyzes</h3>
                        <p>Our engine securely processes your habits in real-time.</p>
                    </div>
                    <div className="step-connector"></div>
                    <div className="step-item">
                        <div className="step-number">3</div>
                        <h3>Get Insights</h3>
                        <p>Receive smart alerts and actionable predictions.</p>
                    </div>
                </div>
            </section>

            {/* Mascot Banner */}
            <section className="landing-mascot-banner">
                <div className="glass-card banner-card">
                    <div className="banner-content">
                        <h2>Meet your smart financial companion</h2>
                        <p>Fina is always ready to chat, answer your finance queries, and guide you towards wealth.</p>
                        <button className="landing-btn-primary glow-btn" onClick={handleGetStarted}>
                            Start your financial journey today
                        </button>
                    </div>
                    <div className="banner-visual">
                        <span className="banner-mascot">🤖🦊</span>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-top">
                    <div className="landing-logo">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                        <span>Finora AI</span>
                    </div>
                    <div className="footer-links">
                        <span onClick={() => navigate('/login')}>Login</span>
                        <span onClick={() => navigate('/signup')}>Sign Up</span>
                        <span>Privacy Policy</span>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© {new Date().getFullYear()} Finora AI. All rights reserved.</p>
                </div>
            </footer>
        </div>
    )
}
