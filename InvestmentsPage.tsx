import React, { useState, useEffect } from 'react';
import { MOCK_STOCKS, RiskLevel, Stock } from './mockStocks';
import { ProfitSimulator } from './ProfitSimulator';

const InvestmentsPage: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<'main' | 'short' | 'long' | 'sip'>('main');
    const [riskLevel, setRiskLevel] = useState<RiskLevel>('Safe');
    const [balance, setBalance] = useState(50000); // Mocked from context/Supabase
    const [monthlyExpenses, setMonthlyExpenses] = useState(15000); // Mocked

    const recommendedInvestment = Math.max(0, (balance - monthlyExpenses) * 0.2);

    const filteredStocks = MOCK_STOCKS.filter(stock =>
        (activeCategory === 'main' || stock.type.includes(activeCategory)) &&
        stock.risk === riskLevel
    );

    const renderCategoryCard = (id: typeof activeCategory, title: string, icon: string, desc: string) => (
        <button
            onClick={() => setActiveCategory(id)}
            className="p-6 bg-white border-4 border-pastel-blue rounded-3xl text-left hover:scale-105 transition-transform shadow-md"
        >
            <span className="text-4xl mb-3 block">{icon}</span>
            <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-500 mt-2">{desc}</p>
        </button>
    );

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header & AI Insight */}
            <section className="bg-blue-50 p-8 rounded-[40px] border-4 border-blue-100 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-4xl font-black text-blue-900 mb-2">Finora Investments 📈</h1>
                    <p className="text-blue-700 font-medium">Grow your wealth with smart, AI-powered suggestions!</p>

                    <div className="mt-6 inline-flex items-center gap-4 bg-white px-6 py-3 rounded-2xl shadow-sm border-2 border-blue-200">
                        <span className="text-2xl">🤖</span>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">AI Recommended Investment</p>
                            <p className="text-lg font-bold text-blue-600">You can safely invest ₹{recommendedInvestment.toLocaleString()} this month</p>
                        </div>
                    </div>
                </div>
                <div className="absolute top-[-20px] right-[-20px] text-9xl opacity-10 font-black">💰</div>
            </section>

            {/* Risk Profile Selection */}
            <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-2xl border-2 border-dashed border-gray-300">
                <span className="font-bold text-gray-600">Your Risk Style:</span>
                {(['Safe', 'Moderate', 'Aggressive'] as RiskLevel[]).map(level => (
                    <button
                        key={level}
                        onClick={() => setRiskLevel(level)}
                        className={`px-6 py-2 rounded-full font-bold transition-all ${riskLevel === level
                                ? 'bg-orange-400 text-white scale-110 shadow-lg'
                                : 'bg-white text-gray-400 border-2 border-gray-200 hover:border-orange-200'
                            }`}
                    >
                        {level}
                    </button>
                ))}
            </div>

            {activeCategory === 'main' ? (
                <>
                    {/* Main Category Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {renderCategoryCard('short', 'Short-Term', '⚡', 'Quick gains in 1-12 months.')}
                        {renderCategoryCard('long', 'Long-Term', '🌱', 'Build wealth for years to come.')}
                        {renderCategoryCard('sip', 'SIP / Monthly', '💰', 'Automatic small investments.')}
                        <button className="p-6 bg-yellow-50 border-4 border-yellow-200 rounded-3xl text-left hover:scale-105 transition-transform shadow-md">
                            <span className="text-4xl mb-3 block">🧠</span>
                            <h3 className="text-xl font-bold text-yellow-800">AI Recommended</h3>
                            <p className="text-sm text-yellow-600 mt-2">Custom picks based on your goals.</p>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                Top Stocks for you ({riskLevel})
                            </h2>
                            <div className="grid grid-cols-1 gap-4">
                                {filteredStocks.map(stock => (
                                    <StockListItem key={stock.id} stock={stock} balance={balance} />
                                ))}
                            </div>
                        </div>
                        <ProfitSimulator />
                    </div>
                </>
            ) : (
                <div>
                    <button onClick={() => setActiveCategory('main')} className="mb-6 text-blue-600 font-bold hover:underline">
                        ← Back to Categories
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredStocks.map(stock => (
                            <StockListItem key={stock.id} stock={stock} balance={balance} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const StockListItem: React.FC<{ stock: Stock, balance: number }> = ({ stock, balance }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="bg-white p-6 rounded-3xl border-4 border-gray-100 flex items-center justify-between hover:border-blue-200 transition-colors shadow-sm">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center font-bold text-blue-600">
                    {stock.name.charAt(0)}
                </div>
                <div>
                    <h4 className="font-bold text-gray-800">{stock.name}</h4>
                    <div className="flex gap-2 items-center">
                        <span className="text-sm text-gray-400">₹{stock.price}</span>
                        <span className={`text-xs font-bold ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change)}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-end gap-2">
                <div className={`px-3 py-1 rounded-full text-xs font-black uppercase ${stock.recommendation === 'Buy' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                    {stock.recommendation}
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                >
                    Details
                </button>
            </div>
            {/* Modal implementation would go here, handling the 'Invest' button logic and balance check */}
        </div>
    );
};

export default InvestmentsPage;