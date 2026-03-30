import React from 'react'

const transactions = [
    { name: 'Swiggy Order', category: 'Food & Dining', amount: -349, type: 'food', emoji: '🍕', time: '2 min ago' },
    { name: 'Salary Credited', category: 'Income', amount: 85000, type: 'salary', emoji: '💰', time: '1 hr ago' },
    { name: 'Amazon Purchase', category: 'Shopping', amount: -2499, type: 'shopping', emoji: '🛍️', time: '3 hrs ago' },
    { name: 'Uber Ride', category: 'Transport', amount: -189, type: 'transport', emoji: '🚗', time: 'Yesterday' },
    { name: 'Netflix Sub', category: 'Entertainment', amount: -649, type: 'entertainment', emoji: '🎬', time: 'Yesterday' },
    { name: 'Electricity Bill', category: 'Bills', amount: -1240, type: 'bills', emoji: '⚡', time: '2 days ago' },
]

function formatAmount(amount) {
    const abs = Math.abs(amount)
    const formatted = abs >= 1000
        ? `₹${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
        : `₹${abs}`
    return amount < 0 ? `-${formatted}` : `+${formatted}`
}

export default function Transactions() {
    return (
        <div className="card transactions-card fade-in-up stagger-5">
            <div className="card-header">
                <h3>Recent Activity</h3>
                <a href="#" onClick={(e) => e.preventDefault()}>See All →</a>
            </div>

            <div className="transaction-list">
                {transactions.map((tx, i) => (
                    <div className="transaction-item" key={i}>
                        <div className={`transaction-icon ${tx.type}`}>
                            {tx.emoji}
                        </div>
                        <div className="transaction-details">
                            <h4>{tx.name}</h4>
                            <p>{tx.time}</p>
                        </div>
                        <div className={`transaction-amount ${tx.amount < 0 ? 'negative' : 'positive'}`}>
                            {formatAmount(tx.amount)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
