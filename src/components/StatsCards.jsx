import React from 'react'

const stats = [
    {
        label: 'Total Income',
        value: '₹0',
        change: '0%',
        up: true,
        color: 'blue',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
        ),
    },
    {
        label: 'Total Expenses',
        value: '₹0',
        change: '0%',
        up: false,
        color: 'pink',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
        ),
    },
    {
        label: 'Savings',
        value: '₹0',
        change: '0%',
        up: true,
        color: 'green',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
            </svg>
        ),
    },
    {
        label: 'Investments',
        value: '₹0',
        change: '0%',
        up: true,
        color: 'purple',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
        ),
    },
]

export default function StatsCards() {
    return (
        <div className="stats-row fade-in-up stagger-3">
            {stats.map((stat, i) => (
                <div className="card stat-card" key={i}>
                    <div className={`stat-icon ${stat.color}`}>
                        {stat.icon}
                    </div>
                    <div className="stat-info">
                        <h4>{stat.label}</h4>
                        <div className="stat-value">{stat.value}</div>
                        <div className={`stat-change ${stat.up ? 'up' : 'down'}`}>
                            {stat.change} this month
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
