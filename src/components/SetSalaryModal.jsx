import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './SetSalaryModal.css';

export default function SetSalaryModal({ user, onComplete, forceOpen = false, onClose }) {
    const [salary, setSalary] = useState('');
    const [balance, setBalance] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [profileExists, setProfileExists] = useState(false);

    useEffect(() => {
        let isCancelled = false;

        if (forceOpen) {
            const loadProfile = async () => {
                if (!user?.id) return;
                const { data } = await supabase
                    .from('profiles')
                    .select('salary, balance, phone_number')
                    .eq('id', user.id)
                    .maybeSingle();
                if (isCancelled) return;
                if (data) {
                    setProfileExists(true);
                    setSalary(data.salary || '');
                    setBalance(data.balance || '');
                    setPhone(data.phone_number || '');
                }
            };
            loadProfile();
            setIsOpen(true);
            return () => { isCancelled = true; };
        }

        const checkSetup = async () => {
            if (!user?.id) return;
            const { data, error } = await supabase
                .from('profiles')
                .select('salary, balance, phone_number')
                .eq('id', user.id)
                .maybeSingle();

            if (isCancelled) return;

            if (error) {
                console.error("Supabase Error fetch profile:", error);
                setIsOpen(true);
                setErrorMsg(`DB Error: ${error.message}.`);
            } else if (!data) {
                setProfileExists(false);
                setIsOpen(true);
            } else if (!data.salary || data.salary <= 0) {
                setProfileExists(true);
                setIsOpen(true);
            } else {
                setProfileExists(true);
                setSalary(data.salary || '');
                setBalance(data.balance || '');
                setPhone(data.phone_number || '');
            }
        };
        checkSetup();

        return () => { isCancelled = true; };
    // Use user?.id (stable primitive) instead of the user object to prevent re-renders
    }, [user?.id, forceOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        const salAmt = Number(salary);
        const balAmt = Number(balance);
        const phoneVal = phone.replace(/\D/g, '');

        if (isNaN(salAmt) || salAmt <= 0) {
            setErrorMsg('Please enter a valid monthly salary.');
            return;
        }
        if (isNaN(balAmt) || balAmt < 0) {
            setErrorMsg('Please enter a valid initial balance (can be 0).');
            return;
        }
        if (phoneVal && phoneVal.length !== 10) {
            setErrorMsg('Phone number must be exactly 10 digits.');
            return;
        }

        setLoading(true);
        try {
            let updateErr;

            const updateData = { 
                salary: salAmt,
                balance: balAmt,
            };
            
            // Always include phone_number in the update
            if (phoneVal) {
                updateData.phone_number = phoneVal;
            }

            if (profileExists) {
                const { error } = await supabase
                    .from('profiles')
                    .update(updateData)
                    .eq('id', user.id);
                updateErr = error;

            } else {
                const { error } = await supabase
                    .from('profiles')
                    .insert({ 
                        id: user.id,
                        username: user.user_metadata?.username || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                        email: user.email,
                        phone_number: phoneVal || null,
                        ...updateData
                    });
                updateErr = error;
                if (!error) setProfileExists(true);
            }

            if (updateErr) {
                console.error("Supabase Save Error:", updateErr);
                if ((updateErr.message && updateErr.message.includes('profiles_phone_number_key')) || 
                    (updateErr.code === '23505' && updateErr.message && updateErr.message.includes('phone_number'))) {
                    throw new Error("This mobile number is already registered to another user.");
                }
                throw updateErr;
            }

            setIsOpen(false);
            if (onClose) onClose();
            if (onComplete) onComplete();

        } catch (err) {
            console.error(err);
            const msg = err.message || err.hint || 'Unknown RLS error';
            setErrorMsg(msg.includes('already registered') ? msg : `Failed to save: ${msg}`);
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    const handleCancel = () => {
        setIsOpen(false);
        if (onClose) onClose();
    }

    return (
        <div className="salary-modal-overlay">
            <div className="salary-modal-card fade-in-up" style={{ maxWidth: '450px' }}>
                <div className="sm-header">
                    <span className="sm-icon">🏦</span>
                    <h2>Wallet Setup</h2>
                    <p>Set your balance, salary, and link your phone number for payments.</p>
                </div>
                
                {errorMsg && <div className="sm-error">{errorMsg}</div>}
                
                <form onSubmit={handleSubmit} className="sm-form">
                    
                    <label style={{ textAlign: 'left', display: 'block', marginBottom: '8px', color: '#4B5563', fontWeight: 600, fontSize: '0.9rem' }}>
                        1. Current Wallet Balance
                    </label>
                    <div className="sm-input-wrap">
                        <span className="rupee-sym">₹</span>
                        <input
                            type="number"
                            placeholder="e.g. 5000"
                            value={balance}
                            onChange={(e) => setBalance(e.target.value)}
                            required
                        />
                    </div>

                    <label style={{ textAlign: 'left', display: 'block', marginBottom: '8px', color: '#4B5563', fontWeight: 600, fontSize: '0.9rem', marginTop: '16px' }}>
                        2. Monthly Salary
                    </label>
                    <div className="sm-input-wrap">
                        <span className="rupee-sym">₹</span>
                        <input
                            type="number"
                            placeholder="e.g. 30000"
                            value={salary}
                            onChange={(e) => setSalary(e.target.value)}
                            required
                        />
                    </div>

                    <label style={{ textAlign: 'left', display: 'block', marginBottom: '8px', color: '#4B5563', fontWeight: 600, fontSize: '0.9rem', marginTop: '16px' }}>
                        3. Mobile Number 📱
                    </label>
                    <div className="sm-input-wrap">
                        <span className="rupee-sym">📱</span>
                        <input
                            type="tel"
                            placeholder="10-digit mobile number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            maxLength={10}
                        />
                    </div>
                    <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '4px', textAlign: 'left' }}>
                        Others will find you by this number to send payments
                    </p>
                    
                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                        {forceOpen && (
                            <button type="button" disabled={loading} className="sm-btn" onClick={handleCancel} style={{ background: '#E5E7EB', color: '#374151' }}>
                                Cancel
                            </button>
                        )}
                        <button type="submit" disabled={loading} className="sm-btn" style={{ flex: 1 }}>
                            {loading ? 'Saving...' : 'Set Details'}
                        </button>
                    </div>
                    
                    <p className="sm-sub">These values will be synced independently in your Finora wallet.</p>
                </form>
            </div>
        </div>
    );
}
