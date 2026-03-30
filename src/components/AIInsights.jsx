import React, { useState, useEffect } from 'react'

const insights = [
    {
        text: "You saved 15% more this week compared to last week!",
        emoji: "🎉",
        mood: "happy",
        mascot: "🦊",
        tag: "Savings",
        tagColor: "#7DDBA3",
    },
    {
        text: "Food spending is up 20%. Try cooking at home more!",
        emoji: "🍳",
        mood: "concerned",
        mascot: "🤔",
        tag: "Alert",
        tagColor: "#FFA5B4",
    },
    {
        text: "Great job! Your investments grew by ₹4,200 this month.",
        emoji: "📈",
        mood: "proud",
        mascot: "😎",
        tag: "Growth",
        tagColor: "#7C83FF",
    },
    {
        text: "Bills are due in 3 days. You have enough balance!",
        emoji: "✅",
        mood: "calm",
        mascot: "🦊",
        tag: "Reminder",
        tagColor: "#FFD97D",
    },
]

const quickStats = [
    { label: "Today's Spending", value: "₹1,240", icon: "💸", trend: "normal" },
    { label: "Savings Streak", value: "12 days", icon: "🔥", trend: "up" },
    { label: "Budget Left", value: "₹23,850", icon: "💰", trend: "good" },
]

export default function AIInsights() {
    const [current, setCurrent] = useState(0)
    const [animating, setAnimating] = useState(false)

    useEffect(() => {
        const timer = setInterval(() => {
            setAnimating(true)
            setTimeout(() => {
                setCurrent(prev => (prev + 1) % insights.length)
                setAnimating(false)
            }, 300)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    const insight = insights[current]

    const handleNext = () => {
        setAnimating(true)
        setTimeout(() => {
            setCurrent(prev => (prev + 1) % insights.length)
            setAnimating(false)
        }, 300)
    }

    return (
        <div className="ai-insights-section fade-in-up stagger-6">
            {/* Main AI Card */}
            <div className="card ai-insight-card">
                <div className="ai-insight-header">
                    <div className="ai-badge">
                        <span className="ai-badge-dot" />
                        Fina AI
                    </div>
                    <button className="ai-next-btn" onClick={handleNext} title="Next insight">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </button>
                </div>

                <div className="ai-insight-body">
                    <div
                        className="ai-mascot-reaction"
                        style={{ animation: animating ? 'none' : 'float 3s ease-in-out infinite' }}
                    >
                        <span className="ai-mascot-face">{insight.mascot}</span>
                        <span className="ai-mascot-bubble">{insight.emoji}</span>
                    </div>

                    <div className={`ai-insight-text-area ${animating ? 'sliding-out' : 'sliding-in'}`}>
                        <span
                            className="ai-insight-tag"
                            style={{ background: `${insight.tagColor}22`, color: insight.tagColor }}
                        >
                            {insight.tag}
                        </span>
                        <p className="ai-insight-message">{insight.text}</p>
                    </div>
                </div>

                <div className="ai-insight-dots">
                    {insights.map((_, i) => (
                        <button
                            key={i}
                            className={`ai-dot ${i === current ? 'active' : ''}`}
                            onClick={() => { setAnimating(true); setTimeout(() => { setCurrent(i); setAnimating(false); }, 300); }}
                        />
                    ))}
                </div>
            </div>

            {/* Quick Stats */}
            <div className="ai-quick-stats">
                {quickStats.map((stat, i) => (
                    <div className="card ai-quick-stat" key={i}>
                        <span className="ai-stat-icon">{stat.icon}</span>
                        <div className="ai-stat-info">
                            <span className="ai-stat-label">{stat.label}</span>
                            <span className="ai-stat-value">{stat.value}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
