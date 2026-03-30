import React, { useState, useEffect } from 'react'
import './AddExpense.css'

const categories = [
    { id: 'food', emoji: '🍔', name: 'Food', hint: 'Looks like a food expense 🍔' },
    { id: 'transport', emoji: '🚗', name: 'Transport', hint: 'Travel expense detected 🚗' },
    { id: 'shopping', emoji: '🛒', name: 'Shopping', hint: 'Retail therapy! 🛍️' },
    { id: 'bills', emoji: '⚡', name: 'Bills', hint: 'Utility bill noted ⚡' },
    { id: 'entertainment', emoji: '🎬', name: 'Movies', hint: 'Enjoy the show! 🎬' },
    { id: 'health', emoji: '💊', name: 'Health', hint: 'Health comes first 💊' },
    { id: 'education', emoji: '📚', name: 'Education', hint: 'Investing in yourself 📚' },
    { id: 'other', emoji: '📦', name: 'Other', hint: 'Miscellaneous expense 📦' },
]

const quickAmounts = [100, 500, 1000, 2000, 5000]

export default function AddExpense({ isOpen, onClose }) {
    const [amount, setAmount] = useState('')
    const [selectedCat, setSelectedCat] = useState(null)
    const [date, setDate] = useState(() => {
        const d = new Date()
        return d.toISOString().split('T')[0]
    })
    const [notes, setNotes] = useState('')

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setAmount('')
            setSelectedCat(null)
            setDate(new Date().toISOString().split('T')[0])
            setNotes('')
        }
    }, [isOpen])

    // Close on Esc key
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        if (isOpen) window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const activeCat = categories.find(c => c.id === selectedCat)

    const handleSubmit = (e) => {
        e.preventDefault()
        // In production, this would save the expense
        onClose()
    }

    return (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className="expense-modal">
                {/* Close */}
                <button className="modal-close" onClick={onClose} aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                {/* Header */}
                <div className="modal-header">
                    <span className="modal-emoji-icon">💸</span>
                    <h2>Add Expense</h2>
                    <p>Track your spending easily</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Amount */}
                    <div className="amount-input-wrapper">
                        <span className="amount-label">Enter Amount</span>
                        <div className="amount-input-row">
                            <span className="amount-currency">₹</span>
                            <input
                                className="amount-input"
                                type="number"
                                placeholder="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                autoFocus
                                min="0"
                            />
                        </div>
                        <div className="quick-amounts">
                            {quickAmounts.map(amt => (
                                <button
                                    key={amt}
                                    type="button"
                                    className="quick-amt-btn"
                                    onClick={() => setAmount(String(amt))}
                                >
                                    ₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category */}
                    <div className="form-section">
                        <span className="form-section-label">Category</span>
                        <div className="category-grid">
                            {categories.map(cat => (
                                <div
                                    key={cat.id}
                                    className={`category-chip ${selectedCat === cat.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedCat(cat.id)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <span className="cat-emoji">{cat.emoji}</span>
                                    <span className="cat-name">{cat.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mascot Hint */}
                    {activeCat && (
                        <div className="mascot-hint">
                            <span className="mascot-hint-emoji">🦊</span>
                            <span className="mascot-hint-text">
                                <span>Fina says:</span> {activeCat.hint}
                            </span>
                        </div>
                    )}

                    {/* Date & Notes */}
                    <div className="modal-input-group">
                        <div className="modal-field">
                            <label htmlFor="expense-date">Date</label>
                            <input
                                id="expense-date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div className="modal-field">
                            <label htmlFor="expense-notes">Notes</label>
                            <input
                                id="expense-notes"
                                type="text"
                                placeholder="e.g. Lunch with Rahul"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button type="submit" className="expense-submit-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Add Expense
                    </button>
                </form>
            </div>
        </div>
    )
}
