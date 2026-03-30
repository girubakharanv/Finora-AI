import React from 'react'
import './SmartAlerts.css'

export default function SmartAlerts() {
    const alerts = [
        {
            id: 1,
            type: 'danger',
            icon: '🍔',
            message: 'You overspent on food this week by ₹1,500.',
            mascot: '😱',
            action: 'Set limit'
        },
        {
            id: 2,
            type: 'warning',
            icon: '⚠️',
            message: 'You are close to your ₹5,000 shopping budget.',
            mascot: '😳',
            action: 'Review'
        },
        {
            id: 3,
            type: 'success',
            icon: '🎉',
            message: 'Great! You saved ₹2,000 on transport this month.',
            mascot: '🥳',
            action: 'View'
        }
    ]

    return (
        <div className="smart-alerts-container fade-in-up stagger-3">
            <div className="alerts-header">
                <h3>Smart Alerts 🔔</h3>
                <button className="clear-alerts-btn">Clear all</button>
            </div>

            <div className="alerts-list">
                {alerts.map(alert => (
                    <div key={alert.id} className={`alert-card alert-${alert.type}`}>
                        <div className="alert-mascot">
                            <span className="am-face">{alert.mascot}</span>
                        </div>

                        <div className="alert-content">
                            <div className="alert-icon-ring">
                                <span>{alert.icon}</span>
                            </div>
                            <p className="alert-message">{alert.message}</p>
                        </div>

                        <button className={`alert-action-btn btn-${alert.type}`}>
                            {alert.action}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
