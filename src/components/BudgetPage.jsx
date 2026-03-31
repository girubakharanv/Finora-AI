import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import './BudgetPage.css'

// ── Category definitions ──
const CATEGORIES = [
  { key: 'Food',          emoji: '🍔', label: 'Food',          iconClass: 'food',          txCategory: 'Food & Dining' },
  { key: 'Travel',        emoji: '🚗', label: 'Travel',        iconClass: 'travel',        txCategory: 'Transport' },
  { key: 'Entertainment', emoji: '🎮', label: 'Entertainment', iconClass: 'entertainment', txCategory: 'Entertainment' },
  { key: 'Shopping',      emoji: '🛒', label: 'Shopping',      iconClass: 'shopping',      txCategory: 'Shopping' },
  { key: 'Bills',         emoji: '💡', label: 'Bills',         iconClass: 'bills',         txCategory: 'Bills' },
  { key: 'Others',        emoji: '📦', label: 'Others',        iconClass: 'others',        txCategory: 'Others' },
]

// ── Helpers ──
const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

const getMonthRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  return { start, end }
}

const statusOf = (spent, limit) => {
  if (limit <= 0) return 'safe'
  const pct = (spent / limit) * 100
  if (pct >= 100) return 'exceeded'
  if (pct >= 80)  return 'warning'
  return 'safe'
}

// ═══════════════════════════════════════════════
// ─── MAIN COMPONENT ──────────────────────────
// ═══════════════════════════════════════════════
export default function BudgetPage({ user }) {
  // ── State ──
  const [salary, setSalary] = useState(0)
  const [salaryDate, setSalaryDate] = useState(null)
  const [autoAddSalary, setAutoAddSalary] = useState(false)
  const [budgets, setBudgets] = useState([]) // [{category, limit_amount, spent}]
  const [loading, setLoading] = useState(true)

  // Modals & toasts
  const [showSalaryModal, setShowSalaryModal] = useState(false)
  const [showLimitsModal, setShowLimitsModal] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [toast, setToast] = useState(null)
  const [saving, setSaving] = useState(false)

  // Modal form values
  const [salaryInput, setSalaryInput] = useState('')
  const [limitInputs, setLimitInputs] = useState({})

  // ── Toast helper ──
  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ── Fetch all data ──
  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // 1. Get profile (salary info)
    const { data: profile } = await supabase
      .from('profiles')
      .select('salary, salary_date, auto_add_salary')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      setSalary(Number(profile.salary) || 0)
      setSalaryDate(profile.salary_date || null)
      setAutoAddSalary(!!profile.auto_add_salary)
    }

    // 2. Get budgets
    const { data: budgetRows } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)

    // 3. Get this month's transactions for spending calc
    const { start, end } = getMonthRange()
    const { data: txs } = await supabase
      .from('transactions')
      .select('amount, type, category')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .gte('created_at', start)
      .lte('created_at', end)

    // Map transaction category → budget category
    const spendingMap = {}
    CATEGORIES.forEach(c => { spendingMap[c.key] = 0 })

    if (txs) {
      txs.forEach(tx => {
        const cat = CATEGORIES.find(c => c.txCategory === tx.category)
        const key = cat ? cat.key : 'Others'
        spendingMap[key] += Number(tx.amount) || 0
      })
    }

    // Merge budgets with spending
    const merged = CATEGORIES.map(cat => {
      const row = budgetRows?.find(b => b.category === cat.key)
      return {
        ...cat,
        limit_amount: row ? Number(row.limit_amount) : 0,
        spent: spendingMap[cat.key] || 0,
      }
    })

    setBudgets(merged)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()

    // Real-time listeners
    const budgetChannel = supabase
      .channel('public:budgets:budgetpage')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budgets' }, () => fetchData())
      .subscribe()

    const txChannel = supabase
      .channel('public:transactions:budgetpage')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(budgetChannel)
      supabase.removeChannel(txChannel)
    }
  }, [fetchData])

  // ── Save salary ──
  const handleSaveSalary = async () => {
    const amt = Number(salaryInput)
    if (isNaN(amt) || amt <= 0) return
    setSaving(true)

    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('profiles')
      .update({ salary: amt, salary_date: today })
      .eq('id', user.id)

    if (!error) {
      setSalary(amt)
      setSalaryDate(today)
      setShowSalaryModal(false)
      showToast('✅ Salary updated successfully!')
    }
    setSaving(false)
  }

  // ── Toggle auto-add salary ──
  const handleToggleAuto = async (checked) => {
    setAutoAddSalary(checked)
    await supabase
      .from('profiles')
      .update({ auto_add_salary: checked })
      .eq('id', user.id)
  }

  // ── Credit salary to balance ──
  const handleCreditSalary = async () => {
    if (salary <= 0) return
    setSaving(true)

    // Get current balance
    const { data: prof } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single()

    const newBalance = (Number(prof?.balance) || 0) + salary

    const { error } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id)

    if (!error) {
      // Log as income transaction
      await supabase.from('transactions').insert([{
        user_id: user.id,
        amount: salary,
        type: 'income',
        category: 'Deposit',
        description: 'Monthly salary credited',
      }])
      showToast(`✅ ${formatINR(salary)} credited to your wallet!`)
    }
    setSaving(false)
  }

  // ── Save category limits ──
  const handleSaveLimits = async () => {
    setSaving(true)
    const upserts = CATEGORIES.map(cat => ({
      user_id: user.id,
      category: cat.key,
      limit_amount: Math.max(0, Number(limitInputs[cat.key]) || 0),
      spent_amount: 0,
    }))

    // Check for negative
    if (upserts.some(u => u.limit_amount < 0)) {
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('budgets')
      .upsert(upserts, { onConflict: 'user_id,category' })

    if (!error) {
      setShowLimitsModal(false)
      showToast('✅ Budget limits saved!')
      fetchData()
    }
    setSaving(false)
  }

  // ── Monthly reset ──
  const handleReset = async () => {
    setSaving(true)
    // We just reset spent_amount in budgets (spending is computed from transactions)
    // The real reset is informational — we keep the limits, new month auto-resets via date range query
    const { error } = await supabase
      .from('budgets')
      .update({ spent_amount: 0 })
      .eq('user_id', user.id)

    if (!error) {
      setShowResetConfirm(false)
      showToast('🔄 Monthly budgets reset!')
      fetchData()
    }
    setSaving(false)
  }

  // ── Open limits modal with current values ──
  const openLimitsModal = () => {
    const inputs = {}
    budgets.forEach(b => { inputs[b.key] = b.limit_amount || '' })
    setLimitInputs(inputs)
    setShowLimitsModal(true)
  }

  // ── Computed values ──
  const totalBudget = budgets.reduce((s, b) => s + b.limit_amount, 0)
  const totalSpent  = budgets.reduce((s, b) => s + b.spent, 0)
  const totalRemaining = Math.max(0, totalBudget - totalSpent)
  const hasBudgets = budgets.some(b => b.limit_amount > 0)

  const exceededCategories = budgets.filter(b => b.limit_amount > 0 && b.spent >= b.limit_amount)
  const warningCategories  = budgets.filter(b => b.limit_amount > 0 && b.spent >= b.limit_amount * 0.8 && b.spent < b.limit_amount)
  const allWithinBudget    = hasBudgets && exceededCategories.length === 0

  // Top spending category
  const topCat = [...budgets].sort((a, b) => b.spent - a.spent)[0]

  // ===== 1. FINANCIAL HEALTH SCORE CALCULATIONS =====
  let healthScore = 100
  let healthMessage = "Add your salary to get your Health Score"
  let healthColor = "var(--text-muted)"
  let healthEmoji = "🦊"

  if (salary > 0) {
    const savings = salary - totalSpent
    const spentRatio = totalSpent / salary
    const savingsRatio = savings / salary

    // Rule 1: Budget Discipline (-10 per exceeded category)
    healthScore -= (exceededCategories.length * 10)

    // Rule 2: Spending Ratio
    if (spentRatio > 0.8) healthScore -= 15
    else if (spentRatio < 0.5) healthScore += 5

    // Rule 3: Savings Performance
    if (savingsRatio > 0.2) healthScore += 10
    else if (savingsRatio < 0.1) healthScore -= 10

    // Clamp
    healthScore = Math.max(0, Math.min(100, healthScore))

    // Determine Status
    if (healthScore >= 80) {
      healthColor = "#10B981" // Green
      healthMessage = "Excellent financial discipline 💚"
      healthEmoji = "🤩"
    } else if (healthScore >= 50) {
      healthColor = "#F59E0B" // Yellow
      healthMessage = "You're doing okay, but can improve ⚠️"
      healthEmoji = "🤔"
    } else {
      healthColor = "#EF4444" // Red
      healthMessage = "High spending detected, take control 🚨"
      healthEmoji = "😱"
    }
  } else {
    healthScore = 0
  }

  // ===== 2. END-OF-MONTH PREDICTION CALCULATIONS =====
  const today = new Date()
  const currentDay = today.getDate()
  const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  
  let dailyAvg = 0
  let projectedSpending = 0
  let expectedSavings = 0
  
  if (currentDay > 0) {
    dailyAvg = totalSpent / currentDay
    projectedSpending = dailyAvg * totalDaysInMonth
    expectedSavings = salary - projectedSpending
  }

  const isPredictingGood = expectedSavings > 0

  // ── Generate insights ──
  const generateInsights = () => {
    const insights = []

    if (topCat && topCat.spent > 0) {
      insights.push({
        emoji: '📊',
        text: `Your top spending category is ${topCat.label} ${topCat.emoji} at ${formatINR(topCat.spent)} this month.`,
      })
    }

    exceededCategories.forEach(c => {
      const overBy = c.spent - c.limit_amount
      insights.push({
        emoji: '🚨',
        text: `You exceeded ${c.label} budget by ${formatINR(overBy)}. Try to cut back!`,
      })
    })

    warningCategories.forEach(c => {
      const remaining = c.limit_amount - c.spent
      insights.push({
        emoji: '⚠️',
        text: `Only ${formatINR(remaining)} left in ${c.label}. Spend wisely!`,
      })
    })

    if (allWithinBudget) {
      insights.push({
        emoji: '🎉',
        text: `Amazing! You're within all your budgets. Keep going!`,
      })
    }

    if (salary > 0 && totalSpent > 0) {
      const pctOfSalary = ((totalSpent / salary) * 100).toFixed(0)
      insights.push({
        emoji: '💡',
        text: `You've spent ${pctOfSalary}% of your salary this month on tracked categories.`,
      })
    }

    if (insights.length === 0) {
      insights.push({
        emoji: '🦊',
        text: 'Set your budgets to get smart spending insights from Fina!',
      })
    }

    return insights.slice(0, 3)
  }

  // ── Mascot mood ──
  const mascotEmoji = exceededCategories.length > 0 ? '😟' : warningCategories.length > 0 ? '😐' : '😊'
  const mascotText  = exceededCategories.length > 0
    ? 'Budget exceeded!'
    : warningCategories.length > 0
      ? 'Getting close...'
      : 'All good! 🎉'

  // ═══════════════════════════════════════
  // ─── RENDER ─────────────────────────
  // ═══════════════════════════════════════

  if (loading) {
    return (
      <div className="budget-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div className="auth-spinner"></div>
      </div>
    )
  }

  return (
    <div className="budget-page">

      {/* ─── Salary Hero Card ─── */}
      <div className="salary-hero">
        <div className="salary-hero-bg s1" />
        <div className="salary-hero-bg s2" />
        <div className="salary-hero-bg s3" />

        <div className="salary-hero-content">
          <div className="salary-hero-left">
            <p className="salary-hero-label">💰 Monthly Salary</p>
            <h1 className="salary-hero-amount">{formatINR(salary)}</h1>
            <p className="salary-hero-date">
              {salaryDate
                ? `Last updated: ${new Date(salaryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'Not set yet'}
            </p>

            <div className="auto-salary-row">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autoAddSalary}
                  onChange={(e) => handleToggleAuto(e.target.checked)}
                />
                <span className="toggle-slider" />
              </label>
              <label onClick={() => handleToggleAuto(!autoAddSalary)}>
                Auto-add salary monthly
              </label>
            </div>
          </div>

          <div className="salary-hero-right">
            <div className="salary-hero-emoji">💎</div>
            <button className="salary-btn" onClick={() => { setSalaryInput(salary || ''); setShowSalaryModal(true) }}>
              ✏️ {salary > 0 ? 'Update Salary' : 'Set Salary'}
            </button>
            {salary > 0 && (
              <button className="credit-salary-btn" onClick={handleCreditSalary} disabled={saving}>
                💳 {saving ? 'Crediting...' : 'Credit to Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Intelligent Finance Section ─── */}
      {salary > 0 && (
        <div className="intelligence-row fade-in-up stagger-1">
          {/* Health Score Card */}
          <div className="intelligence-card health-card">
            <h3 className="intel-title">Financial Health Score</h3>
            <div className="health-content">
              <div className="health-circle-wrapper">
                <svg className="health-circle" viewBox="0 0 120 120">
                  <circle className="health-circle-bg" cx="60" cy="60" r="50"></circle>
                  <circle 
                    className="health-circle-progress" 
                    cx="60" cy="60" r="50" 
                    style={{ 
                      strokeDasharray: 314,
                      strokeDashoffset: 314 - (314 * healthScore) / 100,
                      stroke: healthColor
                    }}
                  ></circle>
                </svg>
                <div className="health-score-text">
                  <span className="score-val" style={{ color: healthColor }}>{Math.round(healthScore)}</span>
                  <span className="score-max">/ 100</span>
                </div>
              </div>
              <div className="health-info">
                <div className="health-emoji">{healthEmoji}</div>
                <p className="health-message" style={{ color: healthColor }}>{healthMessage}</p>
              </div>
            </div>
          </div>

          {/* Prediction Card */}
          <div className="intelligence-card prediction-card">
            <h3 className="intel-title">Monthly Prediction</h3>
            <div className="prediction-content">
              <div className="prediction-main">
                <div className="pred-row">
                  <span className="pred-label">Projected Spending</span>
                  <div className="pred-val-wrap">
                    <span className="pred-val" style={{ color: 'var(--text-dark)' }}>{formatINR(projectedSpending)}</span>
                    <span className="pred-trend" style={{ color: projectedSpending > salary * 0.8 ? '#EF4444' : '#10B981' }}>
                      {projectedSpending > totalSpent ? '↑' : '↓'}
                    </span>
                  </div>
                </div>
                <div className="pred-row">
                  <span className="pred-label">Expected Savings</span>
                  <span className="pred-val" style={{ color: isPredictingGood ? '#10B981' : '#EF4444' }}>
                    {expectedSavings > 0 ? '+' : ''}{formatINR(expectedSavings)}
                  </span>
                </div>
              </div>
              
              <div className="pred-message" style={{ background: isPredictingGood ? '#F0FDF4' : '#FEF2F2', color: isPredictingGood ? '#166534' : '#991B1B' }}>
                {isPredictingGood ? (
                  <>You're on track to save <strong>{formatINR(expectedSavings)}</strong> 🎯</>
                ) : (
                  <>You may overspend by <strong>{formatINR(Math.abs(expectedSavings))}</strong> ⚠️</>
                )}
              </div>
              <div className="pred-insight">
                <span>💡</span> Your daily average spending is <strong>{formatINR(dailyAvg)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Quick Summary Row ─── */}
      {hasBudgets && (
        <div className="top-spending-row fade-in-up stagger-1">
          <div className="top-spending-card">
            <span className="top-spending-icon">🎯</span>
            <div className="top-spending-info">
              <h4>Total Budget</h4>
              <div className="top-val">{formatINR(totalBudget)}</div>
            </div>
          </div>
          <div className="top-spending-card">
            <span className="top-spending-icon">💸</span>
            <div className="top-spending-info">
              <h4>Total Spent</h4>
              <div className="top-val">{formatINR(totalSpent)}</div>
            </div>
          </div>
          <div className="top-spending-card">
            <span className="top-spending-icon">✅</span>
            <div className="top-spending-info">
              <h4>Remaining</h4>
              <div className="top-val">{formatINR(totalRemaining)}</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Budget Overview ─── */}
      <div>
        <div className="budget-section-header">
          <h2 className="budget-section-title">📊 Category Budgets</h2>
          <div className="budget-section-actions">
            <button className="budget-add-btn" onClick={openLimitsModal}>
              ✏️ Set Limits
            </button>
            {hasBudgets && (
              <button className="budget-reset-btn" onClick={() => setShowResetConfirm(true)}>
                🔄 Reset Month
              </button>
            )}
          </div>
        </div>

        {hasBudgets ? (
          <div className="budget-cards-grid fade-in-up stagger-2">
            {budgets.filter(b => b.limit_amount > 0).map(b => {
              const pct = b.limit_amount > 0 ? Math.min(100, (b.spent / b.limit_amount) * 100) : 0
              const status = statusOf(b.spent, b.limit_amount)

              return (
                <div className={`budget-card ${status}`} key={b.key}>
                  <div className="budget-card-header">
                    <div className="budget-cat-info">
                      <div className={`budget-cat-icon ${b.iconClass}`}>{b.emoji}</div>
                      <span className="budget-cat-name">{b.label}</span>
                    </div>
                    <span className={`budget-cat-status ${status}`}>
                      {status === 'exceeded' ? '🚨 Over' : status === 'warning' ? '⚠️ Near' : '✅ Safe'}
                    </span>
                  </div>

                  <div className="budget-progress-section">
                    <div className="budget-progress-labels">
                      <span className="budget-spent">{formatINR(b.spent)}</span>
                      <span className="budget-limit">of {formatINR(b.limit_amount)}</span>
                    </div>

                    <div className="budget-progress-track">
                      <div
                        className={`budget-progress-fill ${status}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: b.limit_amount - b.spent > 0 ? 'var(--text-muted)' : '#EF4444' }}>
                        {b.limit_amount - b.spent > 0 ? `${formatINR(b.limit_amount - b.spent)} left` : '₹0 left'}
                      </div>
                      <div className={`budget-pct ${status}`}>
                        {pct.toFixed(0)}% used
                      </div>
                    </div>
                  </div>

                  {/* Warning banners */}
                  {status === 'warning' && (
                    <div className="budget-warning-banner warning-type">
                      ⚠️ You're close to your {b.label} limit!
                    </div>
                  )}
                  {status === 'exceeded' && (
                    <div className="budget-warning-banner exceeded-type">
                      🚨 You exceeded your {b.label} budget!
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="budget-empty">
            <span className="budget-empty-emoji">📋</span>
            <h3>No budgets set yet</h3>
            <p>Set category limits to start tracking your spending smartly!</p>
            <button className="budget-add-btn" onClick={openLimitsModal}>
              ✨ Set Your First Budget
            </button>
          </div>
        )}
      </div>

      {/* ─── Insights & Badge Row ─── */}
      <div className="insight-badge-row fade-in-up stagger-3">
        {/* AI Insight Card */}
        <div className="budget-insight-card">
          <div className="insight-card-header">
            <span className="ai-sparkle">✨</span>
            <h4>AI Spending Insights</h4>
          </div>
          <div className="insight-items">
            {generateInsights().map((item, i) => (
              <div className="insight-item" key={i}>
                <span className="insight-emoji">{item.emoji}</span>
                <span className="insight-text">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Badge Card */}
        <div className={`budget-badge-card ${allWithinBudget ? '' : 'no-badge'}`}>
          {allWithinBudget ? (
            <>
              <span className="badge-trophy">🏆</span>
              <h3 className="badge-title">Budget Master!</h3>
              <p className="badge-subtitle">You're within all your budgets this month. Amazing discipline! 🎉</p>
            </>
          ) : hasBudgets ? (
            <>
              <span className="badge-mascot">{mascotEmoji}</span>
              <h3 className="badge-title">
                {exceededCategories.length > 0
                  ? `${exceededCategories.length} budget${exceededCategories.length > 1 ? 's' : ''} exceeded`
                  : 'Almost there!'}
              </h3>
              <p className="badge-subtitle">
                {exceededCategories.length > 0
                  ? 'Try to cut back on overspent categories to earn your badge!'
                  : 'Stay within all limits to earn the Budget Master badge! 🏆'}
              </p>
            </>
          ) : (
            <>
              <span className="badge-mascot">🦊</span>
              <h3 className="badge-title">Earn Your Badge</h3>
              <p className="badge-subtitle">Set category budgets and stay within limits to become a Budget Master!</p>
            </>
          )}
        </div>
      </div>

      {/* ─── Floating Mascot ─── */}
      {hasBudgets && (
        <div className="mascot-floating" title={mascotText}>
          {mascotEmoji}
          <div className="mascot-bubble">{mascotText}</div>
        </div>
      )}

      {/* ═══ MODALS ═══ */}

      {/* ── Set Salary Modal ── */}
      {showSalaryModal && (
        <div className="budget-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSalaryModal(false) }}>
          <div className="budget-modal">
            <div className="budget-modal-header">
              <span className="modal-emoji">💰</span>
              <h2>Set Monthly Salary</h2>
              <p>Enter your monthly salary to track budgets effectively</p>
            </div>

            <div className="salary-modal-row">
              <span className="input-icon">₹</span>
              <input
                type="number"
                placeholder="e.g. 50000"
                value={salaryInput}
                onChange={(e) => setSalaryInput(e.target.value)}
                autoFocus
                min="1"
              />
            </div>

            <div className="budget-modal-btns">
              <button className="budget-modal-cancel" onClick={() => setShowSalaryModal(false)}>
                Cancel
              </button>
              <button
                className="budget-modal-save"
                onClick={handleSaveSalary}
                disabled={saving || !salaryInput || Number(salaryInput) <= 0}
              >
                {saving ? 'Saving...' : '💾 Save Salary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Set Limits Modal ── */}
      {showLimitsModal && (
        <div className="budget-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowLimitsModal(false) }}>
          <div className="budget-modal">
            <div className="budget-modal-header">
              <span className="modal-emoji">📊</span>
              <h2>Set Category Limits</h2>
              <p>Define monthly spending limits for each category</p>
            </div>

            <div className="budget-modal-grid">
              {CATEGORIES.map(cat => (
                <div className="budget-modal-row" key={cat.key}>
                  <span className="cat-emoji">{cat.emoji}</span>
                  <span className="cat-label">{cat.label}</span>
                  <span className="rupee">₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    value={limitInputs[cat.key] || ''}
                    onChange={(e) => setLimitInputs(prev => ({ ...prev, [cat.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="budget-modal-btns">
              <button className="budget-modal-cancel" onClick={() => setShowLimitsModal(false)}>
                Cancel
              </button>
              <button
                className="budget-modal-save"
                onClick={handleSaveLimits}
                disabled={saving}
              >
                {saving ? 'Saving...' : '✅ Save Limits'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Confirm Modal ── */}
      {showResetConfirm && (
        <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowResetConfirm(false) }}>
          <div className="confirm-card">
            <span className="confirm-emoji">🔄</span>
            <h3>Reset Monthly Budgets?</h3>
            <p>This will reset all spent amounts to ₹0. Your category limits will remain. Use this at the start of a new month.</p>
            <div className="confirm-btns">
              <button className="confirm-no" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </button>
              <button className="confirm-yes" onClick={handleReset} disabled={saving}>
                {saving ? 'Resetting...' : 'Yes, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="budget-toast">{toast}</div>
      )}
    </div>
  )
}
