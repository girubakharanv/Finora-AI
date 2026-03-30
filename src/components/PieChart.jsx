import React from 'react'

const categories = [
    { name: 'Food & Dining', value: 28, color: '#FF7EB3', amount: '₹21,320' },
    { name: 'Shopping', value: 22, color: '#7C83FF', amount: '₹16,750' },
    { name: 'Transport', value: 15, color: '#FFD97D', amount: '₹11,420' },
    { name: 'Bills', value: 20, color: '#7DDBA3', amount: '₹15,230' },
    { name: 'Entertainment', value: 15, color: '#C3A6F7', amount: '₹11,430' },
]

function buildConicGradient(data) {
    let cumulative = 0
    const stops = []
    data.forEach((item) => {
        stops.push(`${item.color} ${cumulative}%`)
        cumulative += item.value
        stops.push(`${item.color} ${cumulative}%`)
    })
    return `conic-gradient(${stops.join(', ')})`
}

export default function PieChart() {
    return (
        <div className="card pie-chart-card fade-in-up stagger-4">
            <div className="pie-chart-header">
                <h3>Spending by Category</h3>
                <span className="pie-chart-month">March 2026</span>
            </div>

            <div className="pie-chart-content">
                <div className="pie-chart-visual">
                    <div
                        className="pie-donut"
                        style={{ background: buildConicGradient(categories) }}
                    >
                        <div className="pie-donut-hole">
                            <span className="pie-total-label">Total</span>
                            <span className="pie-total-amount">₹76,150</span>
                        </div>
                    </div>
                </div>

                <div className="pie-chart-legend">
                    {categories.map((cat, i) => (
                        <div className="pie-legend-item" key={i}>
                            <div className="pie-legend-left">
                                <span
                                    className="pie-legend-dot"
                                    style={{ background: cat.color }}
                                />
                                <span className="pie-legend-name">{cat.name}</span>
                            </div>
                            <div className="pie-legend-right">
                                <span className="pie-legend-amount">{cat.amount}</span>
                                <span className="pie-legend-pct">{cat.value}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
