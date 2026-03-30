require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Initialize Supabase Admin Client (Bypasses RLS)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// 2. Initialize Razorpay API
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper: Auto-Categorize Description
const autoCategorize = (desc) => {
    const text = desc.toLowerCase();
    if (text.includes('swiggy') || text.includes('zomato') || text.includes('food')) return 'Food & Dining';
    if (text.includes('uber') || text.includes('ola') || text.includes('metro') || text.includes('fuel')) return 'Transport';
    if (text.includes('amazon') || text.includes('flipkart') || text.includes('myntra')) return 'Shopping';
    if (text.includes('netflix') || text.includes('spotify') || text.includes('movie')) return 'Entertainment';
    if (text.includes('electricity') || text.includes('water') || text.includes('wifi') || text.includes('bill')) return 'Bills';
    return 'Others';
};

// ==========================================
// ENDPOINT: Create Razorpay Order (Send Money/Expense)
// ==========================================
app.post('/create-order', async (req, res) => {
    try {
        const { amount, receipt } = req.body;

        const options = {
            amount: amount * 100, // Amount in paise
            currency: 'INR',
            receipt: receipt || `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// ==========================================
// ENDPOINT: Verify Payment (Frontend Success Handler)
// ==========================================
app.post('/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            user_id,
            amount,
            description
        } = req.body;

        // 1. Verify Signature securely
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // 2. Payment is Valid -> Insert into Supabase
            const category = autoCategorize(description);

            const { data, error } = await supabase
                .from('transactions')
                .insert([{
                    user_id,
                    amount,
                    type: 'expense',
                    category,
                    method: 'upi', // Assuming UPI/Cards handled by checkout
                    status: 'success',
                    razorpay_payment_id,
                    description
                }]);

            if (error) {
                console.error('Supabase Error:', error);
                return res.status(500).json({ error: 'Failed to record transaction' });
            }

            res.json({ success: true, message: 'Payment verified and recorded', category });
        } else {
            res.status(400).json({ success: false, error: 'Invalid Payment Signature' });
        }
    } catch (err) {
        console.error('Verification error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ==========================================
// ENDPOINT: Webhook (For receiving income / external links)
// ==========================================
app.post('/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        // Note: In production, verify razorpay webhook signature using crypto here
        // const secret = process.env.WEBHOOK_SECRET;

        const event = req.body;

        if (event.event === 'payment.captured') {
            const payment = event.payload.payment.entity;

            // Since this is generic incoming money (not tied to an explicit session here without metadata)
            // Normally we pass user_id in payment notes. Assuming notes.user_id exists:
            const user_id = payment.notes?.user_id;

            if (user_id) {
                await supabase.from('transactions').insert([{
                    user_id,
                    amount: payment.amount / 100,
                    type: 'income',
                    category: 'Deposit',
                    method: payment.method,
                    status: 'success',
                    razorpay_payment_id: payment.id,
                    description: payment.description || 'Incoming Transfer'
                }]);
            }
        }

        res.json({ status: 'ok' });
    } catch (err) {
        console.error('Webhook error:', err);
        res.status(500).send('Webhook Error');
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Finora AI Backend running on port ${PORT}`);
});
