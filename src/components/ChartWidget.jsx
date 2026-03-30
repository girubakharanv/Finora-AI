import React from 'react'

const data = [
    { month: 'Jul', income: 65, expense: 40 },
    { month: 'Aug', income: 72, expense: 55 },
    { month: 'Sep', income: 60, expense: 45 },
    { month: 'Oct', income: 80, expense: 50 },
    { month: 'Nov', income: 75, expense: 60 },
    { month: 'Dec', income: 90, expense: 48 },
    { month: 'Jan', income: 85, expense: 52 },
]

export default function ChartWidget() {
    const [activeTab, setActiveTab] = React.useState('Monthly')
    const tabs = ['Weekly', 'Monthly', 'Yearly']

    return (
        <div className="card chart-card fade-in-up stagger-4">
            <div className="chart-card-header">
                <h3>Income vs Expenses</h3>
                <div className="chart-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            className={`chart-tab ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="chart-area">
                {data.map((item, i) => (
                    <div className="chart-bar-group" key={i}>
                        <div className="chart-bars">
                            <div
                                className="chart-bar income"
                                style={{
                                    height: `${item.income * 1.8}px`,
                                    animationDelay: `${i * 0.08}s`,
                                }}
                                title={`Income: ₹${item.income}k`}
                            />
                            <div
                                className="chart-bar expense"
                                style={{
                                    height: `${item.expense * 1.8}px`,
                                    animationDelay: `${i * 0.08 + 0.04}s`,
                                }}
                                title={`Expense: ₹${item.expense}k`}
                            />
                        </div>
                        <span className="chart-bar-label">{item.month}</span>
                    </div>
                ))}
            </div>

            <div className="chart-legend">
                <div className="chart-legend-item">
                    <span className="chart-legend-dot" style={{ background: 'var(--primary)' }}></span>
                    Income
                </div>
                <div className="chart-legend-item">
                    <span className="chart-legend-dot" style={{ background: 'var(--accent-pink)' }}></span>
                    Expenses
                </div>
            </div>
        </div>
    )
}
