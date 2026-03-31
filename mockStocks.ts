export type RiskLevel = 'Safe' | 'Moderate' | 'Aggressive';
export type InvestmentType = 'short' | 'long' | 'sip';

export interface Stock {
    id: string;
    name: string;
    price: number;
    change: number;
    risk: RiskLevel;
    type: InvestmentType[];
    recommendation: 'Buy' | 'Hold' | 'Avoid';
    rating: number; // 1-5 stars
    growthLabel: 'High' | 'Moderate' | 'Stable';
    description: string;
    expectedReturn: number; // percentage
}

export const MOCK_STOCKS: Stock[] = [
    {
        id: '1',
        name: 'TCS',
        price: 3850.20,
        change: 1.2,
        risk: 'Safe',
        type: ['long', 'sip'],
        recommendation: 'Buy',
        rating: 5,
        growthLabel: 'Stable',
        description: 'India\'s largest IT services company with consistent dividends.',
        expectedReturn: 12
    },
    {
        id: '2',
        name: 'Reliance Industries',
        price: 2960.45,
        change: -0.8,
        risk: 'Moderate',
        type: ['long', 'short'],
        recommendation: 'Hold',
        rating: 4,
        growthLabel: 'High',
        description: 'Conglomerate with massive growth in telecom and retail sectors.',
        expectedReturn: 15
    },
    {
        id: '3',
        name: 'Zomato',
        price: 185.30,
        change: 4.5,
        risk: 'Aggressive',
        type: ['short'],
        recommendation: 'Buy',
        rating: 3,
        growthLabel: 'High',
        description: 'High growth potential in the food delivery and quick commerce space.',
        expectedReturn: 25
    }
];