require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Initialize Supabase Admin Client (Bypasses RLS)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Helper: Auto-Categorize Description
const autoCategorize = (desc) => {
    const text = (desc || '').toLowerCase();
    if (text.includes('swiggy') || text.includes('zomato') || text.includes('food')) return 'Food & Dining';
    if (text.includes('uber') || text.includes('ola') || text.includes('metro') || text.includes('fuel')) return 'Transport';
    if (text.includes('amazon') || text.includes('flipkart') || text.includes('myntra')) return 'Shopping';
    if (text.includes('netflix') || text.includes('spotify') || text.includes('movie')) return 'Entertainment';
    if (text.includes('electricity') || text.includes('water') || text.includes('wifi') || text.includes('bill')) return 'Bills';
    return 'Others';
};

// ==========================================
// ENDPOINT: P2P Wallet Transfer (Send Money)
// ==========================================
app.post('/p2p-transfer', async (req, res) => {
    try {
        const { sender_id, receiver_email, amount, description } = req.body;
        const transferAmount = Number(amount);

        if (!sender_id || !receiver_email || !transferAmount || transferAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid transfer details' });
        }

        const isEmailInput = receiver_email.includes('@');
        
        let query = supabase.from('profiles').select('id, username, balance');
        if (isEmailInput) {
            query = query.eq('email', receiver_email.trim());
        } else {
            query = query.eq('phone_number', receiver_email.trim());
        }

        const { data: profiles, error: profileErr } = await query;

        if (profileErr || !profiles || profiles.length === 0) {
            return res.status(404).json({ success: false, error: 'Receiver email not found in Finora network.' });
        }

        const receiver = profiles[0];

        if (receiver.id === sender_id) {
            return res.status(400).json({ success: false, error: 'You cannot send money to yourself.' });
        }

        const category = req.body.category || autoCategorize(description);

        // Fetch Sender Salary
        const { data: senderData, error: senderErr } = await supabase
            .from('profiles')
            .select('salary, username')
            .eq('id', sender_id)
            .single();

        if (senderErr || !senderData) {
            return res.status(400).json({ success: false, error: 'Sender not found' });
        }

        if (Number(senderData.salary) < transferAmount) {
            return res.status(400).json({ success: false, error: 'Insufficient salary balance' });
        }

        // Deduct from Sender Salary
        await supabase
            .from('profiles')
            .update({ salary: Number(senderData.salary) - transferAmount })
            .eq('id', sender_id);

        // Add to Receiver Balance
        await supabase
            .from('profiles')
            .update({ balance: Number(receiver.balance) + transferAmount })
            .eq('id', receiver.id);

        // Inject Ledger Entries (Bypassing RLS with Admin SDK)
        const { error: txErr } = await supabase
            .from('transactions')
            .insert([
                {
                    user_id: sender_id,
                    amount: transferAmount,
                    type: 'expense',
                    category: category, // Syncs with budget via sender UI
                    method: 'p2p',
                    status: 'success',
                    description: `Sent to ${receiver.username || receiver.email}${description ? ` - ${description}` : ''}`
                },
                {
                    user_id: receiver.id,
                    amount: transferAmount,
                    type: 'income',
                    category: 'Deposit',
                    method: 'p2p',
                    status: 'success',
                    description: `Received from ${senderData.username || 'User'}${description ? ` - ${description}` : ''}`
                }
            ]);

        if (txErr) {
            console.error('Ledger error:', txErr);
            // Rollback
            await supabase.from('profiles').update({ salary: Number(senderData.salary) }).eq('id', sender_id);
            await supabase.from('profiles').update({ balance: Number(receiver.balance) }).eq('id', receiver.id);
            return res.status(500).json({ success: false, error: 'Failed to process ledger transmission.' });
        }

        res.json({ success: true, message: `Successfully transferred ₹${transferAmount} to ${receiver.username}` });

    } catch (err) {
        console.error('Transfer error:', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
// ==========================================
// ENDPOINT: Transfer to Savings
// ==========================================
app.post('/transfer-savings', async (req, res) => {
    try {
        const { sender_id, amount } = req.body;
        const transferAmount = Number(amount);

        if (!sender_id || !transferAmount || transferAmount <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid transfer details' });
        }

        const { data: senderData, error: senderErr } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', sender_id)
            .single();

        if (senderErr || !senderData) {
            return res.status(400).json({ success: false, error: 'Sender not found' });
        }

        if (Number(senderData.balance) < transferAmount) {
            return res.status(400).json({ success: false, error: 'Insufficient wallet balance' });
        }

        // Deduct from Sender Wallet Balance
        await supabase
            .from('profiles')
            .update({ balance: Number(senderData.balance) - transferAmount })
            .eq('id', sender_id);

        // Inject Ledger Entry (Type: transfer, Category: Savings)
        const { error: txErr } = await supabase
            .from('transactions')
            .insert([{
                user_id: sender_id,
                amount: transferAmount,
                type: 'transfer',
                category: 'Savings',
                method: 'internal',
                status: 'success',
                description: 'Transferred to Savings'
            }]);

        if (txErr) {
            console.error('Savings Ledger error:', txErr);
            await supabase.from('profiles').update({ balance: Number(senderData.balance) }).eq('id', sender_id);
            return res.status(500).json({ success: false, error: 'Failed to process savings ledger.' });
        }

        res.json({ success: true, message: `Successfully transferred ₹${transferAmount} to Savings` });
    } catch (err) {
        console.error('Savings error:', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// ==========================================
// ENDPOINT: Analyze Personality (Gemini AI)
// ==========================================
app.post('/analyze-personality', async (req, res) => {
    try {
        const { salary, totalSpent, txCount, topCat, topCatPct, impulsePct, spendingRatio, savingsPct } = req.body;

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const prompt = `You are an expert AI financial advisor with a fun, supportive tone. 
Given the user's monthly spending summary below, determine their "Spending Personality". 
You can base it on classic archetypes (Saver, Spender, Planner, Impulse Buyer) but give it a creative, fun title.

Data Profile:
- Monthly Salary: ₹${salary}
- Total Spent: ₹${totalSpent}
- Total Transactions: ${txCount}
- Top Spending Category: ${topCat} (${topCatPct}%)
- Impulse Spending (Food & Shopping): ${impulsePct}%
- Spending Ratio (Spent/Salary): ${spendingRatio}
- Savings Ratio: ${savingsPct}%

Instructions:
Evaluate the data accurately and construct a personality profile. Provide the result strictly in JSON matching the exact schema below. Ensure colors and gradients look premium and aesthetic, matching the Finora UI style.

{
  "type": "string (Personality name e.g. 'Zen Master Saver' or 'Impulse Ninja')",
  "emoji": "string (One representing emoji)",
  "mascot": "string (One face emoji representing the mood e.g. 🥳 or 😱)",
  "color": "string (A primary CSS hex color, e.g. '#10B981')",
  "bg": "string (A soft, premium CSS linear-gradient matching the color)",
  "border": "string (An rgba string matching the color with 0.25 opacity)",
  "tag": "string (A short 1-2 word status tag)",
  "tagColor": "string (Hex color for the tag)",
  "description": "string (2-3 sentences max. Personalized explanation based on their data)",
  "suggestion": "string (1 actionable smart tip to improve or maintain their habits)"
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            }
        });
        
        let jsonResponse;
        try {
            jsonResponse = JSON.parse(response.text);
        } catch (parseError) {
             console.error("Failed to parse Gemini JSON", response.text);
             return res.status(500).json({ success: false, error: 'Invalid JSON response from LLM' });
        }
        res.json({ success: true, data: jsonResponse });
    } catch (err) {
        console.error('Gemini Analysis Error:', err);
        res.status(500).json({ success: false, error: 'Failed to analyze personality' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Finora AI Backend running on port ${PORT}`);
});
