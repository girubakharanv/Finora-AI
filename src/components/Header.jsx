import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import SmartAlerts from './SmartAlerts'

export default function Header() {
    const [name, setName] = useState('There')
    const [showNotifs, setShowNotifs] = useState(false)
    const notifRef = useRef(null)
    const navigate = useNavigate()

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user && user.user_metadata?.username) {
                const firstName = user.user_metadata.username.split(' ')[0]
                setName(firstName)
            }
        }
        fetchUser()

        // Click outside to close notifications
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifs(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        navigate('/')
    }

    const getGreeting = () => {
        const hour = new Date().getHours()
        if (hour < 12) return 'Good Morning'
        if (hour < 17) return 'Good Afternoon'
        if (hour < 21) return 'Good Evening'
        return 'Good Night'
    }

    return (
        <header className="header">
            <div className="header-left">
                <h1>{getGreeting()}, {name}! 👋</h1>
                <p><span>✨</span>Here's your financial overview for today</p>
            </div>

            <div className="header-right">
                <div className="header-search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input type="text" placeholder="Search transactions..." />
                </div>

                <div className="notif-wrapper" ref={notifRef}>
                    <button 
                        className={`header-icon-btn ${showNotifs ? 'active' : ''}`} 
                        title="Notifications"
                        onClick={() => setShowNotifs(!showNotifs)}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <span className="notif-dot"></span>
                    </button>

                    {showNotifs && (
                        <div className="notif-dropdown fade-in-up">
                            <SmartAlerts />
                        </div>
                    )}
                </div>

                <button className="header-icon-btn" title="Logout" onClick={handleLogout} style={{ color: '#F43F5E' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </button>
            </div>
        </header>
    )
}
