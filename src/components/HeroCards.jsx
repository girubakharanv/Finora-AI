import React from 'react'

const heroCards = [
    {
        title: 'Total Balance',
        amount: '₹2,48,350',
        change: '+12.5%',
        up: true,
        subtitle: 'All accounts',
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
        title: 'Monthly Expense',
        amount: '₹76,150',
        change: '-3.4%',
        up: false,
        subtitle: 'This month',
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
        amount: '₹48,350',
        change: '+15.1%',
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

export default function HeroCards() {
    return (
        <div className="hero-cards-row fade-in-up stagger-1">
            {heroCards.map((card, i) => (
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
                        <h2 className="hero-card-amount">{card.amount}</h2>
                        <div className="hero-card-footer">
                            <span className={`hero-card-badge ${card.up ? 'up' : 'down'}`}>
                                {card.up ? '↑' : '↓'} {card.change}
                            </span>
                            <span className="hero-card-sub">{card.subtitle}</span>
                        </div>
                    </div>

                    {/* Savings progress bar */}
                    {card.title === 'Savings' && (
                        <div className="hero-progress">
                            <div className="hero-progress-bar" style={{ width: '48%' }} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
