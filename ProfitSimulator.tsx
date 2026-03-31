import React, { useState } from 'react';

export const ProfitSimulator: React.FC = () => {
    const [amount, setAmount] = useState<number>(10000);
    const [years, setYears] = useState<number>(1);
    const rate = 0.12; // 12% average rate

    const calculateReturns = () => {
        // Formula: amount * (1 + rate)^time
        const total = amount * Math.pow(1 + rate, years);
        const profit = total - amount;
        return { total, profit };
    };

    const { total, profit } = calculateReturns();

    return (
        <div className="bg-purple-50 p-6 rounded-3xl border-4 border-purple-200 shadow-sm">
            <h3 className="text-2xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                🧠 Magic Profit Simulator
            </h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-purple-600 mb-1">How much to invest?</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="w-full p-3 rounded-2xl border-2 border-purple-300 focus:outline-none focus:border-purple-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-purple-600 mb-1">For how many years?</label>
                    <input
                        type="range" min="1" max="20"
                        value={years}
                        onChange={(e) => setYears(Number(e.target.value))}
                        className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <span className="text-purple-700 font-bold">{years} Years</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-white p-4 rounded-2xl border-2 border-purple-100">
                        <p className="text-xs text-gray-500 uppercase">Estimated Return</p>
                        <p className="text-xl font-bold text-green-600">₹{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border-2 border-purple-100">
                        <p className="text-xs text-gray-500 uppercase">Pure Profit</p>
                        <p className="text-xl font-bold text-purple-600">₹{profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};