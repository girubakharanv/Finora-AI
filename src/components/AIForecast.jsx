import React, { useState } from 'react'
import './AIForecast.css'

/* ---- data ---- */
const actual = [3200, 2800, 4100, 1900, 3500, null, null]
const predict = [3200, 2800, 4100, 1900, 3500, 2600, 3100]
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const safe = 3000   // safe spending line

const dailyForecasts = [
    { day: 'Saturday', emoji: '🛒', amount: '₹2,600', cat: 'Shopping day', confidence: 82 },
    { day: 'Sunday', emoji: '🍔', amount: '₹3,100', cat: 'Food & dining', confidence: 75 },
]

const predictions = [
    { icon: '📈', title: 'Weekly total prediction', value: '₹21,200', sub: 'vs ₹19,500 last week', color: '#FF7EB3' },
    { icon: '🛡️', title: 'Safe to spend today', value: '₹3,000', sub: 'Based on your budget', color: '#7DDBA3' },
    { icon: '💡', title: 'Potential savings', value: '₹4,800', sub: 'If you follow AI tips', color: '#7C83FF' },
]

const insights = [
    { emoji: '🍕', text: 'Food spending likely to spike this weekend. Consider meal-prepping!' },
    { emoji: '🚕', text: 'Your transport costs drop on weekends — great pattern!' },
    { emoji: '💳', text: 'You usually spend more on Saturdays. Try a ₹2,500 cap.' },
]

/* ---- SVG helpers ---- */
function buildSmooth(data, w, h, pad) {
    const max = Math.max(...predict) * 1.2
    const stepX = (w - pad * 2) / (data.length - 1)
    const pts = data.map((v, i) => ({
        x: pad + i * stepX,
        y: v != null ? h - pad - (v / max) * (h - pad * 2) : null,
    }))
    const validPts = pts.filter(p => p.y !== null)
    let d = `M ${validPts[0].x},${validPts[0].y}`
    for (let i = 1; i < validPts.length; i++) {
        const prev = validPts[i - 1], curr = validPts[i]
        const cx1 = prev.x + stepX * 0.4, cx2 = curr.x - stepX * 0.4
        d += ` C ${cx1},${prev.y} ${cx2},${curr.y} ${curr.x},${curr.y}`
    }
    return { d, pts: validPts, allPts: pts }
}

function buildArea(d, pts, w, h, pad) {
    const last = pts[pts.length - 1], first = pts[0]
    return `${d} L ${last.x},${h - pad} L ${first.x},${h - pad} Z`
}

export default function AIForecast() {
    const [hoveredIdx, setHoveredIdx] = useState(null)

    const W = 620, H = 280, P = 40
    const maxVal = Math.max(...predict) * 1.2
    const safeY = H - P - (safe / maxVal) * (H - P * 2)

    const act = buildSmooth(actual, W, H, P)
    const pred = buildSmooth(predict, W, H, P)
    const predArea = buildArea(pred.d, pred.pts, W, H, P)

    const gridLines = [0.25, 0.5, 0.75, 1.0]

    return (
        <div className="forecast-page">
            {/* Greeting + Mascot row */}
            <div className="forecast-greeting-row fade-in-up">
                <div className="forecast-greeting">
                    <h2>AI Spending Forecast 🔮</h2>
                    <p>Fina's smart predictions for your week ahead</p>
                </div>
                <div className="forecast-mascot-mini">
                    <span className="fm-face">🦊</span>
                    <div className="fm-bubble">
                        <p>You may spend <strong>₹2,000 more</strong> this week than usual. Let me show you why! 👇</p>
                    </div>
                </div>
            </div>

            {/* Prediction Cards */}
            <div className="forecast-cards-row fade-in-up stagger-1">
                {predictions.map((p, i) => (
                    <div className="card forecast-stat-card" key={i}>
                        <div className="fc-icon" style={{ background: `${p.color}18` }}>
                            <span>{p.icon}</span>
                        </div>
                        <div className="fc-info">
                            <span className="fc-label">{p.title}</span>
                            <span className="fc-value" style={{ color: p.color }}>{p.value}</span>
                            <span className="fc-sub">{p.sub}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Forecast Graph */}
            <div className="card forecast-graph-card fade-in-up stagger-2">
                <div className="fg-header">
                    <h3>Weekly Spending Forecast</h3>
                    <div className="fg-legend">
                        <span className="fg-legend-item"><span className="fg-dot" style={{ background: '#7C83FF' }} /> Actual</span>
                        <span className="fg-legend-item"><span className="fg-dot" style={{ background: '#C084FC', border: '2px dashed #C084FC', background: 'transparent' }} /> Predicted</span>
                        <span className="fg-legend-item"><span className="fg-dot" style={{ background: '#7DDBA3' }} /> Safe level</span>
                    </div>
                </div>

                <div className="fg-container">
                    <svg viewBox={`0 0 ${W} ${H}`} className="fg-svg" onMouseLeave={() => setHoveredIdx(null)}>
                        <defs>
                            <linearGradient id="fgGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#C084FC" stopOpacity="0.18" />
                                <stop offset="100%" stopColor="#C084FC" stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* Grid */}
                        {gridLines.map((frac, i) => {
                            const y = H - P - frac * (H - P * 2)
                            return (
                                <g key={i}>
                                    <line x1={P} y1={y} x2={W - P} y2={y} stroke="#EDE9FE" strokeWidth="1" />
                                    <text x={P - 8} y={y + 4} fill="#A9A8BD" fontSize="9" textAnchor="end" fontFamily="Poppins">
                                        ₹{Math.round(frac * maxVal / 1000)}k
                                    </text>
                                </g>
                            )
                        })}

                        {/* Day labels */}
                        {days.map((d, i) => {
                            const x = P + i * ((W - P * 2) / (days.length - 1))
                            return <text key={i} x={x} y={H - 10} fill="#A9A8BD" fontSize="10" textAnchor="middle" fontFamily="Poppins">{d}</text>
                        })}

                        {/* Safe level line */}
                        <line x1={P} y1={safeY} x2={W - P} y2={safeY} stroke="#7DDBA3" strokeWidth="1.5" strokeDasharray="6 4" />
                        <text x={W - P + 4} y={safeY + 4} fill="#7DDBA3" fontSize="8" fontWeight="600" fontFamily="Poppins">Safe</text>

                        {/* Prediction area */}
                        <path d={predArea} fill="url(#fgGrad)" />

                        {/* Prediction line (dashed for future) */}
                        <path d={pred.d} fill="none" stroke="#C084FC" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />

                        {/* Actual line (solid) */}
                        {act.d && <path d={act.d} fill="none" stroke="#7C83FF" strokeWidth="3" strokeLinecap="round" />}

                        {/* Dots */}
                        {pred.allPts.map((pt, i) => {
                            if (pt.y === null) return null
                            const isActual = actual[i] !== null
                            return (
                                <g key={i}>
                                    <circle
                                        cx={pt.x} cy={pt.y}
                                        r={hoveredIdx === i ? 7 : isActual ? 5 : 4}
                                        fill="white"
                                        stroke={isActual ? '#7C83FF' : '#C084FC'}
                                        strokeWidth="2.5"
                                        style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                                        onMouseEnter={() => setHoveredIdx(i)}
                                    />
                                    {!isActual && (
                                        <circle cx={pt.x} cy={pt.y} r="8" fill="#C084FC" fillOpacity="0.12">
                                            <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
                                            <animate attributeName="fill-opacity" values="0.12;0;0.12" dur="2s" repeatCount="indefinite" />
                                        </circle>
                                    )}
                                    {hoveredIdx === i && (
                                        <g>
                                            <rect x={pt.x - 38} y={pt.y - 34} width="76" height="26" rx="8" fill={isActual ? '#7C83FF' : '#C084FC'} />
                                            <text x={pt.x} y={pt.y - 17} fill="white" fontSize="10" fontWeight="700" textAnchor="middle" fontFamily="Poppins">
                                                ₹{predict[i].toLocaleString()}
                                            </text>
                                            <text x={pt.x} y={pt.y - 42} fill={isActual ? '#7C83FF' : '#C084FC'} fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="Poppins">
                                                {isActual ? 'Actual' : 'Predicted'}
                                            </text>
                                        </g>
                                    )}
                                </g>
                            )
                        })}
                    </svg>
                </div>
            </div>

            {/* Bottom: Daily Forecasts + AI Insights */}
            <div className="forecast-bottom-row fade-in-up stagger-3">
                {/* Daily Forecasts */}
                <div className="card daily-forecast-card">
                    <h3>📅 Upcoming Forecasts</h3>
                    <div className="daily-forecast-list">
                        {dailyForecasts.map((f, i) => (
                            <div className="daily-forecast-item" key={i}>
                                <div className="df-left">
                                    <span className="df-emoji">{f.emoji}</span>
                                    <div className="df-info">
                                        <h4>{f.day}</h4>
                                        <p>{f.cat}</p>
                                    </div>
                                </div>
                                <div className="df-right">
                                    <span className="df-amount">{f.amount}</span>
                                    <div className="df-confidence">
                                        <div className="df-conf-bar">
                                            <div className="df-conf-fill" style={{ width: `${f.confidence}%` }} />
                                        </div>
                                        <span className="df-conf-text">{f.confidence}% sure</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Safe Spending Gauge */}
                    <div className="safe-spending-gauge">
                        <div className="ssg-header">
                            <span className="ssg-label">🛡️ Safe to spend today</span>
                            <span className="ssg-value">₹3,000</span>
                        </div>
                        <div className="ssg-bar">
                            <div className="ssg-zone ssg-green" style={{ width: '60%' }} />
                            <div className="ssg-zone ssg-yellow" style={{ width: '25%' }} />
                            <div className="ssg-zone ssg-red" style={{ width: '15%' }} />
                            <div className="ssg-marker" style={{ left: '45%' }} />
                        </div>
                        <div className="ssg-labels">
                            <span>₹0</span>
                            <span>₹3,000</span>
                            <span>₹5,000</span>
                        </div>
                    </div>
                </div>

                {/* Mascot Insights */}
                <div className="card forecast-mascot-card">
                    <div className="fmc-top">
                        <span className="fmc-face">🦊</span>
                        <div className="fmc-badge">
                            <span className="fmc-badge-dot" />
                            Fina's Predictions
                        </div>
                    </div>
                    <div className="fmc-insights">
                        {insights.map((ins, i) => (
                            <div className="fmc-insight" key={i}>
                                <span className="fmc-ins-emoji">{ins.emoji}</span>
                                <p>{ins.text}</p>
                            </div>
                        ))}
                    </div>
                    <div className="fmc-bottom-tip">
                        <span>✨</span>
                        <p>These predictions improve as Fina learns your habits over time.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
