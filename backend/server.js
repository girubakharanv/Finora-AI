require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

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

        // 1. Find Receiver by Email
        const { data: profiles, error: profileErr } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('email', receiver_email.trim());

        if (profileErr || !profiles || profiles.length === 0) {
            return res.status(404).json({ success: false, error: 'Receiver email not found in Finora network.' });
        }

        const receiver = profiles[0];

        if (receiver.id === sender_id) {
            return res.status(400).json({ success: false, error: 'You cannot send money to yourself.' });
        }

        // 2. Classify Category for sender logic
        const category = autoCategorize(description);

        // 3. Inject Ledger Entries (Bypassing RLS with Admin SDK)
        const { error: txErr } = await supabase
            .from('transactions')
            .insert([
                {
                    user_id: sender_id,
                    amount: transferAmount,
                    type: 'expense',
                    category: category,
                    method: 'p2p',
                    status: 'success',
                    description: description || `Transfer to ${receiver.username}`
                },
                {
                    user_id: receiver.id,
                    amount: transferAmount,
                    type: 'income',
                    category: 'Deposit',
                    method: 'p2p',
                    status: 'success',
                    description: description || 'Incoming Transfer'
                }
            ]);

        if (txErr) {
            console.error('Ledger error:', txErr);
            return res.status(500).json({ success: false, error: 'Failed to process ledger transmission.' });
        }

        res.json({ success: true, message: `Successfully transferred ₹${transferAmount} to ${receiver.username}` });

    } catch (err) {
        console.error('Transfer error:', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Finora AI Backend running on port ${PORT}`);
});
