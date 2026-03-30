import React from 'react'

export default function Mascot() {
    const [tapped, setTapped] = React.useState(false)

    const tips = [
        "You saved 12% more this month! 🎉",
        "Try the 50/30/20 budget rule! 💡",
        "Your spending dropped by ₹2,400! 📉",
        "Set a savings goal for next month! 🎯",
        "Great job staying under budget! ⭐",
    ]

    const [tipIndex, setTipIndex] = React.useState(0)

    const handleTap = () => {
        setTapped(true)
        setTipIndex((tipIndex + 1) % tips.length)
        setTimeout(() => setTapped(false), 600)
    }

    return (
        <div className="card mascot-card fade-in-up stagger-2">
            <div
                className="mascot-character"
                onClick={handleTap}
                style={{
                    animation: tapped ? 'bounce 0.6s ease' : 'float 3s ease-in-out infinite',
                }}
                role="img"
                aria-label="Finora AI Fox Mascot"
            >
                🦊
            </div>
            <h3>Hey! I'm Fina 🌟</h3>
            <p>Your smart AI finance buddy.<br />Tap me for tips!</p>
            <div className="mascot-tip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                </svg>
                {tips[tipIndex]}
            </div>
        </div>
    )
}
