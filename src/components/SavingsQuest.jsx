import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './SavingsQuest.css'
import HealthcareSavings from './HealthcareSavings'

const missions = [
    { id: 1, emoji: '💰', title: 'Save ₹100 today', desc: 'Skip one small purchase', xp: 25, done: true },
    { id: 2, emoji: '🍳', title: 'Cook at home', desc: 'Skip ordering food today', xp: 40, done: true },
    { id: 3, emoji: '🚶', title: 'Walk instead of cab', desc: 'Save on transport', xp: 30, done: false },
    { id: 4, emoji: '📉', title: 'Reduce daily spend', desc: 'Spend less than ₹2,000 today', xp: 50, done: false },
    { id: 5, emoji: '🎯', title: 'Hit weekly target', desc: 'Save ₹3,000 this week', xp: 100, done: false },
]

const badges = [
    { emoji: '☕', name: 'Coffee Saver', desc: 'Skipped 7 coffee orders', unlocked: true, color: '#FFD97D' },
    { emoji: '🏆', name: 'Budget Master', desc: 'Stayed under budget 4 weeks', unlocked: true, color: '#7C83FF' },
    { emoji: '🔥', name: 'Streak King', desc: '15-day savings streak', unlocked: true, color: '#FF7EB3' },
    { emoji: '🐷', name: 'Piggy Pro', desc: 'Saved ₹50,000 total', unlocked: true, color: '#7DDBA3' },
    { emoji: '💎', name: 'Diamond Saver', desc: 'Saved ₹1,00,000 total', unlocked: false, color: '#C3A6F7' },
    { emoji: '🌟', name: 'Consistency Star', desc: '30-day streak', unlocked: false, color: '#FFD97D' },
    { emoji: '🧠', name: 'Smart Spender', desc: 'Used AI tips 20 times', unlocked: false, color: '#7C83FF' },
    { emoji: '🚀', name: 'Level 20', desc: 'Reach Level 20', unlocked: false, color: '#FF7EB3' },
]

const milestones = [
    { amount: '₹10,000', done: true },
    { amount: '₹25,000', done: true },
    { amount: '₹50,000', done: false, current: true },
    { amount: '₹1,00,000', done: false },
]

export default function SavingsQuest() {
    const navigate = useNavigate()
    const [showHealthcare, setShowHealthcare] = useState(false)

    const [completedMissions, setCompletedMissions] = useState(
        missions.reduce((acc, m) => ({ ...acc, [m.id]: m.done }), {})
    )
    const [celebrating, setCelebrating] = useState(false)

    const level = 12
    const currentXP = 720
    const maxXP = 1000
    const xpPercent = (currentXP / maxXP) * 100
    const [totalSaved, setTotalSaved] = useState(0)
    const [streak, setStreak] = useState(0)

    useEffect(() => {
        const fetchSavings = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('transactions')
                .select('amount, type, category, created_at')
                .eq('user_id', user.id)
                .eq('type', 'transfer')
                .eq('category', 'Savings')

            if (data) {
                // Total savings (only positive deposits, not investment deductions)
                const total = data
                    .filter(tx => Number(tx.amount) > 0)
                    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
                setTotalSaved(total)

                // Streak: count consecutive days backwards from today where user saved
                const savingsDays = new Set(
                    data
                        .filter(tx => Number(tx.amount) > 0) // only deposits
                        .map(tx => new Date(tx.created_at).toLocaleDateString('en-CA')) // 'YYYY-MM-DD'
                )

                let streakCount = 0
                const today = new Date()
                for (let i = 0; i < 365; i++) {
                    const d = new Date(today)
                    d.setDate(today.getDate() - i)
                    const key = d.toLocaleDateString('en-CA')
                    if (savingsDays.has(key)) {
                        streakCount++
                    } else {
                        break // streak broken
                    }
                }
                setStreak(streakCount)
            }
        }

        fetchSavings()

        const txChannel = supabase
            .channel('public:transactions:savingsquest')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                fetchSavings()
            })
            .subscribe()

        return () => supabase.removeChannel(txChannel)
    }, [])

    const handleComplete = (id) => {
        if (completedMissions[id]) return
        setCompletedMissions(prev => ({ ...prev, [id]: true }))
        setCelebrating(true)
        setTimeout(() => setCelebrating(false), 2000)
    }

    const completedCount = Object.values(completedMissions).filter(Boolean).length

    if (showHealthcare) {
        return (
            <div className="savings-page fade-in-up">
                <button 
                    onClick={() => setShowHealthcare(false)} 
                    style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '10px 18px', 
                        borderRadius: '24px', 
                        border: '1.5px solid #E5E7EB', 
                        background: 'white', 
                        color: '#4B5563', 
                        fontWeight: '700', 
                        fontSize: '0.85rem',
                        cursor: 'pointer', 
                        width: 'fit-content',
                        marginBottom: '4px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateX(-3px)';
                        e.currentTarget.style.borderColor = '#A7F3D0';
                        e.currentTarget.style.color = '#10B981';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.color = '#4B5563';
                    }}
                >
                    <span style={{ fontSize: '1.2rem', lineHeight: '1' }}>←</span> Back to Savings
                </button>
                <HealthcareSavings />
            </div>
        )
    }

    return (
        <div className="savings-page">
            {/* Level & XP Bar */}
            <div className="level-banner fade-in-up">
                <div className="level-banner-left">
                    <div className="level-badge">
                        <span className="level-num">{level}</span>
                        <span className="level-label">LEVEL</span>
                    </div>
                    <div className="level-info">
                        <h2>Savings Quest 🎮</h2>
                        <p>Keep saving to level up and unlock rewards!</p>
                    </div>
                </div>
                <div className="xp-section">
                    <div className="xp-header">
                        <span className="xp-text">⚡ {currentXP} / {maxXP} XP</span>
                        <span className="xp-next">Next: Level {level + 1}</span>
                    </div>
                    <div className="xp-bar">
                        <div className="xp-fill" style={{ width: `${xpPercent}%` }}>
                            <div className="xp-glow" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Total Savings + Mascot */}
            <div className="savings-hero-row fade-in-up stagger-1">
                <div className="card savings-total-card">
                    <div className="savings-total-top">
                        <div>
                            <p className="savings-label">Total Savings 🐷</p>
                            <h2 className="savings-amount">₹{totalSaved.toLocaleString('en-IN')}</h2>
                            <div className="savings-goal-text">
                                <span className="savings-goal-badge up">↑ 15.1%</span>
                                Goal: ₹1,00,000
                            </div>
                        </div>
                        <div className="savings-ring">
                            <svg viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="42" fill="none" stroke="#EDE9FE" strokeWidth="8" />
                                <circle
                                    cx="50" cy="50" r="42"
                                    fill="none" stroke="url(#savGrad)" strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${Math.min(100, (totalSaved / 100000) * 100) * 2.64} ${264 - Math.min(100, (totalSaved / 100000) * 100) * 2.64}`}
                                    transform="rotate(-90 50 50)"
                                    className="savings-ring-progress"
                                />
                                <defs>
                                    <linearGradient id="savGrad" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stopColor="#7C83FF" />
                                        <stop offset="100%" stopColor="#C084FC" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <span className="savings-ring-pct">{Math.min(100, Math.floor((totalSaved / 100000) * 100))}%</span>
                        </div>
                    </div>

                    {/* Milestones */}
                    <div className="milestones-bar">
                        {milestones.map((m, i) => (
                            <div key={i} className={`milestone ${m.done ? 'done' : ''} ${m.current ? 'current' : ''}`}>
                                <div className="milestone-dot">
                                    {m.done ? '✓' : m.current ? '🔥' : '🔒'}
                                </div>
                                <span className="milestone-label">{m.amount}</span>
                            </div>
                        ))}
                        <div className="milestone-line" />
                    </div>
                </div>

                {/* Mascot */}
                <div className="card savings-mascot-card">
                    <div className={`savings-mascot-char ${celebrating ? 'celebrating' : ''}`}>
                        {celebrating ? '🥳' : '🦊'}
                    </div>
                    {celebrating && <div className="confetti-burst">🎉✨🎊</div>}
                    <div className="savings-mascot-speech">
                        <p>{celebrating
                            ? "Amazing! You completed a mission! Keep it up! 🎉"
                            : streak > 0
                            ? `You're on fire! 🔥 ${streak}-day savings streak. Let's make it ${streak + 1}!`
                            : "Start saving today to build your streak! 💪"
                        }</p>
                    </div>
                    <div className="savings-streak-badge">
                        <span className="streak-fire">🔥</span>
                        <div>
                            <span className="streak-num">{streak > 0 ? `${streak} day${streak !== 1 ? 's' : ''}` : 'No streak yet'}</span>
                            <span className="streak-label">Savings Streak</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Action Modules ─── */}
            <div className="sq-action-modules fade-in-up stagger-1">
                <div 
                    className="sq-module-card"
                    onClick={() => setShowHealthcare(true)}
                >
                    <div className="sq-module-icon hc">🩺</div>
                    <div className="sq-module-text">
                        <h3>Healthcare Fund</h3>
                        <p>Manage medical savings</p>
                    </div>
                    <div className="sq-module-arrow">➡️</div>
                </div>

                <div 
                    className="sq-module-card invest"
                    onClick={() => navigate('/investments')}
                >
                    <div className="sq-module-icon inv">📈</div>
                    <div className="sq-module-text">
                        <h3>Invest & Grow</h3>
                        <p>Put your savings to work</p>
                    </div>
                    <div className="sq-module-arrow">➡️</div>
                </div>
            </div>

            {/* Missions + Badges */}
            <div className="missions-badges-row fade-in-up stagger-2">
                {/* Daily Missions */}
                <div className="card missions-card">
                    <div className="missions-header">
                        <h3>🎯 Daily Missions</h3>
                        <span className="missions-count">{completedCount}/{missions.length} done</span>
                    </div>
                    <div className="missions-list">
                        {missions.map(m => (
                            <div
                                key={m.id}
                                className={`mission-item ${completedMissions[m.id] ? 'completed' : ''}`}
                                onClick={() => handleComplete(m.id)}
                            >
                                <div className="mission-left">
                                    <span className="mission-emoji">{m.emoji}</span>
                                    <div className="mission-info">
                                        <h4>{m.title}</h4>
                                        <p>{m.desc}</p>
                                    </div>
                                </div>
                                <div className="mission-right">
                                    {completedMissions[m.id] ? (
                                        <span className="mission-done-badge">✅</span>
                                    ) : (
                                        <span className="mission-xp-badge">+{m.xp} XP</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Badges */}
                <div className="card badges-card">
                    <div className="badges-header">
                        <h3>🏅 Achievement Badges</h3>
                        <span className="badges-count">{badges.filter(b => b.unlocked).length}/{badges.length} unlocked</span>
                    </div>
                    <div className="badges-grid">
                        {badges.map((b, i) => (
                            <div key={i} className={`badge-item ${b.unlocked ? 'unlocked' : 'locked'}`}>
                                <div
                                    className="badge-icon"
                                    style={{
                                        background: b.unlocked ? `${b.color}22` : '#F1F0F5',
                                        borderColor: b.unlocked ? b.color : '#DDD',
                                    }}
                                >
                                    <span>{b.emoji}</span>
                                </div>
                                <span className="badge-name">{b.name}</span>
                                <span className="badge-desc">{b.desc}</span>
                                {!b.unlocked && <div className="badge-lock">🔒</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
