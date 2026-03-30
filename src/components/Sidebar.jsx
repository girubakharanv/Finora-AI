import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function Sidebar({ onAddClick }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [initial, setInitial] = useState('U')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.user_metadata?.username) {
        setInitial(user.user_metadata.username.charAt(0).toUpperCase())
      }
    })
  }, [])

  const getActiveId = () => {
    if (location.pathname === '/analytics') return 'analytics'
    if (location.pathname === '/savings') return 'savings'
    if (location.pathname === '/forecast') return 'forecast'
    if (location.pathname === '/pay') return 'pay'
    return 'home'
  }

  const active = getActiveId()

  const handleNavClick = (id, path) => {
    if (id === 'add') {
      if (onAddClick) onAddClick()
    } else if (path) {
      navigate(path)
    }
  }

  const tabs = [
    {
      id: 'home', label: 'Home', path: '/dashboard', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
      )
    },
    {
      id: 'analytics', label: 'Analysis', path: '/analytics', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
        </svg>
      )
    },
    {
      id: 'pay', label: 'Pay', path: '/pay', isAction: true, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      )
    },
    {
      id: 'savings', label: 'Savings', path: '/savings', icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
          <path d="M2 9.5a.5.5 0 1 0 1 0 .5.5 0 1 0-1 0" />
        </svg>
      )
    },
    {
      id: 'forecast', label: 'Forecast', path: '/forecast', mobileHidden: true, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
        </svg>
      )
    },
    {
      id: 'profile', label: 'Profile', path: null, mobileOnly: true, icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    }
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" title="Finora AI" onClick={() => navigate('/dashboard')}>
        <svg viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>

      <nav className="sidebar-nav">
        {tabs.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${active === item.id ? 'active' : ''} ${item.isAction ? 'nav-action-btn' : ''} ${item.mobileHidden ? 'mobile-hidden' : ''} ${item.mobileOnly ? 'mobile-only' : ''}`}
            onClick={() => handleNavClick(item.id, item.path)}
            title={item.label}
          >
            <div className="nav-icon-wrapper">
              {item.icon}
            </div>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-avatar" title="Profile">
          {initial}
        </div>
      </div>
    </aside>
  )
}
