import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import './HealthcareSavings.css'

// ── Risk & Recommendation engine ─────────────────────────────────────────────
function calcRisk(age, lifestyle, smoking) {
    if (Number(age) > 40 || smoking === 'yes') return 'High'
    if (lifestyle === 'Moderate') return 'Medium'
    return 'Low'
}

const RECOMMENDED = { Low: 10000, Medium: 25000, High: 50000 }

const RISK_META = {
    Low:    { color: '#22C55E', bg: '#F0FDF4', border: '#BBF7D0', icon: '💚', label: 'Low Risk' },
    Medium: { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', icon: '⚠️', label: 'Medium Risk' },
    High:   { color: '#EF4444', bg: '#FFF1F2', border: '#FECDD3', icon: '🚨', label: 'High Risk' },
}

const formatINR = n =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

export default function HealthcareSavings() {
    // ── State ──────────────────────────────────────────────────────────────
    const [userId, setUserId]             = useState(null)
    const [profile, setProfile]           = useState(null)   // from health_profiles
    const [editing, setEditing]           = useState(false)
    const [formAge, setFormAge]           = useState('')
    const [formLifestyle, setFormLifestyle] = useState('Active')
    const [formSmoking, setFormSmoking]   = useState('no')
    const [formMonthly, setFormMonthly]   = useState('')
    const [fundSaved, setFundSaved]       = useState(0)
    const [healthExpenses, setHealthExpenses] = useState([])
    const [addAmt, setAddAmt]             = useState('')
    const [addDesc, setAddDesc]           = useState('')
    const [addType, setAddType]           = useState('contribution') // 'contribution' | 'medical'
    const [loading, setLoading]           = useState(true)
    const [saving, setSaving]             = useState(false)
    const [successMsg, setSuccessMsg]     = useState('')
    const [errorMsg, setErrorMsg]         = useState('')
    const [salary, setSalary]             = useState(0)

    // ── Fetch ──────────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)

        // Profile (Salary)
        const { data: userProf } = await supabase
            .from('profiles')
            .select('salary')
            .eq('id', user.id)
            .single()
        if (userProf) {
            setSalary(Number(userProf.salary) || 0)
        }

        // Health profile
        const { data: hp } = await supabase
            .from('health_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()
        setProfile(hp || null)
        if (hp) {
            setFormAge(hp.age?.toString() || '')
            setFormLifestyle(hp.lifestyle || 'Active')
            setFormSmoking(hp.smoking || 'no')
            setFormMonthly(hp.monthly_contribution?.toString() || '')
        }

        // Healthcare fund balance (sum of contributions - medical expenses)
        const { data: txs } = await supabase
            .from('transactions')
            .select('amount, description, created_at, type')
            .eq('user_id', user.id)
            .eq('category', 'Healthcare')

        if (txs) {
            const contributions = txs
                .filter(t => t.type === 'transfer')
                .reduce((s, t) => s + Number(t.amount), 0)
            const expenses = txs
                .filter(t => t.type === 'expense')
                .reduce((s, t) => s + Number(t.amount), 0)
            setFundSaved(Math.max(0, contributions - expenses))
            setHealthExpenses(txs.filter(t => t.type === 'expense').slice(0, 10))
        }

        setLoading(false)
    }, [])

    useEffect(() => {
        fetchAll()
        const ch = supabase
            .channel('healthcare_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchAll)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'health_profiles' }, fetchAll)
            .subscribe()
        return () => supabase.removeChannel(ch)
    }, [fetchAll])

    // ── Save health profile ────────────────────────────────────────────────
    const saveProfile = async () => {
        if (!formAge || isNaN(formAge) || Number(formAge) < 1) {
            setErrorMsg('Enter a valid age')
            return
        }
        setSaving(true)
        setErrorMsg('')

        const payload = {
            user_id: userId,
            age: Number(formAge),
            lifestyle: formLifestyle,
            smoking: formSmoking,
            monthly_contribution: Number(formMonthly) || 0,
        }

        const { error } = profile
            ? await supabase.from('health_profiles').update(payload).eq('user_id', userId)
            : await supabase.from('health_profiles').insert(payload)

        if (error) {
            setErrorMsg('Save failed: ' + error.message)
        } else {
            setEditing(false)
            setSuccessMsg('Health profile saved! ✅')
            setTimeout(() => setSuccessMsg(''), 3000)
            fetchAll()
        }
        setSaving(false)
    }

    // ── Add money to fund / record medical expense ─────────────────────────
    const addTransaction = async () => {
        if (!addAmt || isNaN(addAmt) || Number(addAmt) <= 0) {
            setErrorMsg('Enter a valid amount')
            return
        }
        setSaving(true)
        setErrorMsg('')

        const { error } = await supabase.from('transactions').insert({
            user_id: userId,
            amount: Number(addAmt),
            type: addType === 'contribution' ? 'transfer' : 'expense',
            category: 'Healthcare',
            description: addDesc || (addType === 'contribution' ? 'Healthcare fund contribution' : 'Medical expense'),
            status: 'completed',
        })

        if (error) {
            setErrorMsg('Failed: ' + error.message)
        } else {
            setAddAmt('')
            setAddDesc('')
            setSuccessMsg(addType === 'contribution' ? 'Added to healthcare fund! 💚' : 'Medical expense recorded! 🏥')
            setTimeout(() => setSuccessMsg(''), 3000)
            fetchAll()
        }
        setSaving(false)
    }

    // ── Derived ────────────────────────────────────────────────────────────
    const risk       = profile ? calcRisk(profile.age, profile.lifestyle, profile.smoking) : null
    const recommended = risk ? RECOMMENDED[risk] : 0
    const pct        = recommended > 0 ? Math.min(Math.round((fundSaved / recommended) * 100), 100) : 0
    const shortfall  = Math.max(0, recommended - fundSaved)
    const meta       = risk ? RISK_META[risk] : null

    const totalHealthSpent = healthExpenses.reduce((s, e) => s + Number(e.amount), 0)

    if (loading) return (
        <div className="hc-wrapper">
            <div className="hc-loading">🩺 Loading healthcare data...</div>
        </div>
    )

    return (
        <div className="hc-wrapper">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="hc-header">
                <div className="hc-header-left">
                    <span className="hc-header-icon">🏥</span>
                    <div>
                        <h2>Healthcare Fund</h2>
                        <p>Prepare for medical emergencies intelligently</p>
                    </div>
                </div>
                {!editing && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button className="hc-edit-btn" onClick={() => { setEditing(true); setErrorMsg('') }}>
                            {profile ? '✏️ Edit Profile' : '➕ Setup Profile'}
                        </button>
                    </div>
                )}
            </div>

            {/* -- Feedback ───────────────────────────────────────────────── */}
            {successMsg && <div className="hc-success">{successMsg}</div>}
            {errorMsg   && <div className="hc-error">{errorMsg}</div>}

            {/* ── Profile Setup / Edit Form ───────────────────────────────── */}
            {(editing || !profile) && (
                <div className="hc-card hc-form-card">
                    <h3>🙋 Health Profile</h3>
                    <p className="hc-form-desc">We use this to calculate your personalised health risk and recommended fund.</p>

                    <div className="hc-form-grid">
                        <div className="hc-field">
                            <label>Age</label>
                            <input
                                type="number"
                                placeholder="e.g. 28"
                                value={formAge}
                                onChange={e => setFormAge(e.target.value)}
                                className="hc-input"
                                min="1" max="120"
                            />
                        </div>

                        <div className="hc-field">
                            <label>Lifestyle</label>
                            <select value={formLifestyle} onChange={e => setFormLifestyle(e.target.value)} className="hc-input">
                                <option value="Active">🏃 Active</option>
                                <option value="Moderate">🚶 Moderate</option>
                                <option value="Sedentary">🪑 Sedentary</option>
                            </select>
                        </div>

                        <div className="hc-field">
                            <label>Smoking?</label>
                            <select value={formSmoking} onChange={e => setFormSmoking(e.target.value)} className="hc-input">
                                <option value="no">🚭 No</option>
                                <option value="yes">🚬 Yes</option>
                            </select>
                        </div>

                        <div className="hc-field">
                            <label>Monthly Contribution Target (₹)</label>
                            <input
                                type="number"
                                placeholder="e.g. 2000"
                                value={formMonthly}
                                onChange={e => setFormMonthly(e.target.value)}
                                className="hc-input"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="hc-form-actions">
                        <button className="hc-save-btn" onClick={saveProfile} disabled={saving}>
                            {saving ? 'Saving...' : '💾 Save Profile'}
                        </button>
                        {profile && (
                            <button className="hc-cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Risk + Recommendation Card ─────────────────────────────── */}
            {profile && risk && !editing && (
                <div className="hc-risk-row">
                    {/* Risk badge */}
                    <div className="hc-card hc-risk-card" style={{ background: meta.bg, borderColor: meta.border }}>
                        <div className="hc-risk-icon">{meta.icon}</div>
                        <div className="hc-risk-label" style={{ color: meta.color }}>{meta.label}</div>
                        <div className="hc-risk-desc">
                            {risk === 'High'   && 'Age or smoking increases your medical risk significantly.'}
                            {risk === 'Medium' && 'Moderate lifestyle presents some health risk over time.'}
                            {risk === 'Low'    && 'Great lifestyle! Keep it up and stay prepared.'}
                        </div>
                        <div className="hc-risk-detail">
                            <span>👤 Age: {profile.age}</span>
                            <span>🏃 {profile.lifestyle}</span>
                            <span>{profile.smoking === 'yes' ? '🚬 Smoker' : '🚭 Non-smoker'}</span>
                        </div>
                    </div>

                    {/* Recommended fund */}
                    <div className="hc-card hc-rec-card">
                        <div className="hc-rec-icon">💊</div>
                        <div className="hc-rec-label">Recommended Fund</div>
                        <div className="hc-rec-amount" style={{ color: meta.color }}>
                            {formatINR(recommended)}
                        </div>
                        {profile.monthly_contribution > 0 && (
                            <div className="hc-rec-monthly">
                                Monthly target: <strong>{formatINR(profile.monthly_contribution)}</strong>
                            </div>
                        )}
                        {shortfall === 0 ? (
                            <div className="hc-alert safe">✅ Your fund is at a safe level!</div>
                        ) : (
                            <div className="hc-alert warn">⚠️ Your fund is below safe level — need {formatINR(shortfall)} more</div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Progress Card ──────────────────────────────────────────── */}
            {profile && !editing && (
                <div className="hc-card hc-progress-card">
                    <div className="hc-progress-header">
                        <div>
                            <h3>🩺 Healthcare Fund</h3>
                            <p>Saved vs Target</p>
                        </div>
                        <div className="hc-progress-amounts">
                            <span className="hc-saved-amt">{formatINR(fundSaved)}</span>
                            <span className="hc-target-amt">/ {formatINR(recommended)}</span>
                        </div>
                    </div>

                    <div className="hc-progress-track">
                        <div
                            className="hc-progress-fill"
                            style={{
                                width: `${pct}%`,
                                background: pct >= 100
                                    ? 'linear-gradient(90deg, #22C55E, #16A34A)'
                                    : pct >= 60
                                    ? 'linear-gradient(90deg, #F59E0B, #D97706)'
                                    : 'linear-gradient(90deg, #3B82F6, #6366F1)',
                            }}
                        />
                    </div>

                    <div className="hc-progress-footer">
                        <span>{pct}% funded</span>
                        <span>{pct < 100 ? `${formatINR(shortfall)} remaining` : '🎉 Goal reached!'}</span>
                    </div>
                </div>
            )}

            {/* ── Add Contribution / Medical Expense ─────────────────────── */}
            {profile && !editing && (
                <div className="hc-card hc-add-card">
                    <h3>➕ Add Transaction</h3>

                    <div className="hc-type-toggle">
                        <button
                            className={`hc-type-btn ${addType === 'contribution' ? 'active-green' : ''}`}
                            onClick={() => setAddType('contribution')}
                        >
                            💚 Add to Fund
                        </button>
                        <button
                            className={`hc-type-btn ${addType === 'medical' ? 'active-red' : ''}`}
                            onClick={() => setAddType('medical')}
                        >
                            🏥 Medical Expense
                        </button>
                    </div>

                    <div className="hc-add-fields">
                        <input
                            type="number"
                            placeholder="Amount (₹)"
                            value={addAmt}
                            onChange={e => setAddAmt(e.target.value)}
                            className="hc-input"
                            min="1"
                        />
                        <input
                            type="text"
                            placeholder={addType === 'medical' ? 'e.g. Hospital bill / Medicine' : 'e.g. Monthly contribution'}
                            value={addDesc}
                            onChange={e => setAddDesc(e.target.value)}
                            className="hc-input"
                        />
                        <button className="hc-save-btn" onClick={addTransaction} disabled={saving}>
                            {saving ? 'Processing...' : addType === 'contribution' ? '💚 Add to Fund' : '🏥 Record Expense'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Insights ───────────────────────────────────────────────── */}
            {profile && !editing && (
                <div className="hc-insights-row">
                    {/* Insight cards */}
                    <div className="hc-card hc-insight-card">
                        <div className="hc-insight-icon">❤️</div>
                        <div className="hc-insight-label">Total Health Expenses</div>
                        <div className="hc-insight-value">{formatINR(totalHealthSpent)}</div>
                        <div className="hc-insight-desc">{healthExpenses.length} medical records</div>
                    </div>

                    <div className="hc-card hc-insight-card">
                        <div className="hc-insight-icon">💊</div>
                        <div className="hc-insight-label">Fund Coverage</div>
                        <div className="hc-insight-value">{pct}%</div>
                        <div className="hc-insight-desc">of recommended {formatINR(recommended)}</div>
                    </div>

                    <div className="hc-card hc-insight-card">
                        <div className="hc-insight-icon">🩺</div>
                        <div className="hc-insight-label">Monthly Target</div>
                        <div className="hc-insight-value">{profile.monthly_contribution > 0 ? formatINR(profile.monthly_contribution) : '—'}</div>
                        <div className="hc-insight-desc">Set in your profile</div>
                    </div>
                </div>
            )}

            {/* ── Medical Expense History ─────────────────────────────────── */}
            {profile && !editing && healthExpenses.length > 0 && (
                <div className="hc-card hc-history-card">
                    <h3>🏥 Medical Expense History</h3>
                    <div className="hc-history-list">
                        {healthExpenses.map((exp, i) => (
                            <div className="hc-history-item" key={i}>
                                <div className="hc-history-left">
                                    <span className="hc-history-icon">💊</span>
                                    <div>
                                        <div className="hc-history-desc">{exp.description || 'Medical expense'}</div>
                                        <div className="hc-history-date">
                                            {new Date(exp.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                                <div className="hc-history-amount">− {formatINR(exp.amount)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Empty state when no profile yet ───────────────────────── */}
            {!profile && !editing && (
                <div className="hc-empty">
                    <div className="hc-empty-icon">🩺</div>
                    <h3>Set Up Your Health Profile</h3>
                    <p>Tell us about your age, lifestyle and habits so Finora can calculate your recommended healthcare fund.</p>
                    <button className="hc-save-btn" onClick={() => setEditing(true)}>Get Started →</button>
                </div>
            )}
        </div>
    )
}
