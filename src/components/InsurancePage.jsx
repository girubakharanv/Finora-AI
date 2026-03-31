import React from 'react'
import './InsurancePage.css'

const MOCK_INSURANCES = [
    { id: 1, name: 'Bajaj Allianz Health Guard', rating: 4.7, price: 580, csr: 99.4, tag: 'MODERATE', bestFor: 'Best overall (new addition)', color: '#FFB07C' },
    { id: 2, name: 'HDFC ERGO Optima Secure', rating: 4.6, price: 850, csr: 99.1, tag: 'PREMIUM', bestFor: 'Premium coverage', color: '#7C83FF' },
    { id: 3, name: 'Care Supreme', rating: 4.5, price: 720, csr: 98.5, tag: 'FAMILY', bestFor: 'Family plans', color: '#7DDBA3' },
    { id: 4, name: 'ICICI Lombard Complete', rating: 4.5, price: 920, csr: 97.4, tag: 'CORPORATE', bestFor: 'Corporate users', color: '#8EC5FC' },
    { id: 5, name: 'Tata AIG MediCare', rating: 4.4, price: 680, csr: 96.8, tag: 'SAFE', bestFor: 'Brand trust', color: '#C3A6F7' },
    { id: 6, name: 'Aditya Birla Activ One', rating: 4.4, price: 710, csr: 97.1, tag: 'LIFESTYLE', bestFor: 'Lifestyle diseases', color: '#FFA5B4' },
    { id: 7, name: 'Niva Bupa ReAssure', rating: 4.3, price: 650, csr: 95.9, tag: 'ADVANCED', bestFor: 'Unlimited restore', color: '#FFD97D' },
    { id: 8, name: 'Star Health Optima', rating: 4.3, price: 620, csr: 94.2, tag: 'MODERATE', bestFor: 'Tier-2/3 cities', color: '#7DDBA3' },
    { id: 9, name: 'Reliance Health Infinity', rating: 4.3, price: 590, csr: 95.1, tag: 'BUDGET', bestFor: 'Unlimited cover', color: '#FFB07C' },
    { id: 10, name: 'ManipalCigna ProHealth', rating: 4.2, price: 780, csr: 94.8, tag: 'AGGRESSIVE', bestFor: 'Custom plans', color: '#FF8A8A' },
    { id: 11, name: 'SBI Super Health', rating: 4.1, price: 540, csr: 93.5, tag: 'BUDGET', bestFor: 'Budget', color: '#FFB07C' }
]

export default function InsurancePage() {
    return (
        <div className="insurance-page fade-in-up">
            {/* -- Top Insight Section -- */}
            <section className="ins-insights-banner">
                <div className="ins-banner-content">
                    <div className="ins-banner-main">
                        <span className="ins-banner-emoji">🧠</span>
                        <div>
                            <h3>Important Insight</h3>
                            <p>A good insurer must have <strong>CSR &gt; 90%</strong>. Top insurers today even reach <strong>99%+ claim settlement</strong>.</p>
                        </div>
                    </div>
                    <div className="ins-banner-picks">
                        <div className="ins-pick-item">🏆 <span>Best overall (2026): Bajaj Allianz</span></div>
                        <div className="ins-pick-item">👨‍👩‍👧 <span>Family: Care Supreme / Star Health</span></div>
                        <div className="ins-pick-item">💰 <span>Budget: SBI / Reliance</span></div>
                        <div className="ins-pick-item">🚀 <span>Advanced: Niva Bupa / HDFC ERGO</span></div>
                    </div>
                </div>
            </section>

            {/* -- Plan Grid -- */}
            <div className="ins-grid-container">
                <div className="ins-grid-header">
                    <h2>Top Health Insurance for You (2026)</h2>
                    <p>Based on Claim Settlement Ratio & Network Hospitals</p>
                </div>

                <div className="ins-grid">
                    {MOCK_INSURANCES.map(plan => (
                        <PolicyCard key={plan.id} plan={plan} />
                    ))}
                </div>
            </div>
        </div>
    )
}

function PolicyCard({ plan }) {
    return (
        <div className="ins-card">
            <div className="ins-card-top">
                <div className="ins-name-wrap">
                    <div className="ins-plan-avatar" style={{ background: `${plan.color}22`, color: plan.color }}>
                        {plan.name.charAt(0)}
                    </div>
                    <div className="ins-plan-info">
                        <h4>{plan.name}</h4>
                        <span className="ins-plan-best">⭐ {plan.rating} • {plan.bestFor}</span>
                    </div>
                </div>
                <div className="ins-price-wrap">
                    <span className="ins-price-val">₹{plan.price}</span>
                    <span className="ins-price-unit">/mo</span>
                </div>
            </div>

            <div className="ins-card-footer">
                <div className="ins-footer-left">
                    <div className="ins-csr-badge">
                        ▲ {plan.csr}% <span className="ins-csr-label">CSR</span>
                    </div>
                    <div className="ins-tag" style={{ background: `${plan.color}15`, color: plan.color }}>
                        {plan.tag}
                    </div>
                </div>
                <button className="ins-action-btn">INFO</button>
            </div>
        </div>
    )
}
