import React, { useState, useRef, useEffect } from 'react'
import './FloatChat.css'

export default function FloatChat() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([
        { id: 1, sender: 'fina', text: 'Hi Nidhi! I am Fina 🦊. How can I help you with your finances today?' }
    ])
    const [inputText, setInputText] = useState('')
    const [isTyping, setIsTyping] = useState(false)

    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isTyping])

    const handleSend = (e) => {
        e.preventDefault()
        if (!inputText.trim()) return

        const userMsg = { id: Date.now(), sender: 'user', text: inputText }
        setMessages(prev => [...prev, userMsg])
        setInputText('')
        setIsTyping(true)

        // Simulate Fina's response after a short delay
        setTimeout(() => {
            let replyText = "I'm still learning! But it looks like you're doing great. 🌟"

            const lowerInput = userMsg.text.toLowerCase()
            if (lowerInput.includes('spend') || lowerInput.includes('spending')) {
                replyText = "Mostly on food 🍔! You spent ₹21,320 there this week."
            } else if (lowerInput.includes('save') || lowerInput.includes('savings')) {
                replyText = "You've saved ₹48,350 total! Try cooking at home tomorrow to save more. 🍳"
            } else if (lowerInput.includes('budget')) {
                replyText = "You have ₹23,850 left in your budget this month. 💰"
            }

            setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'fina', text: replyText }])
            setIsTyping(false)
        }, 1500)
    }

    return (
        <div className="float-chat-wrapper">
            {/* Floating Chat Button */}
            <button
                className={`chat-fab ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Chat with Fina"
            >
                {isOpen ? (
                    <span className="fab-close">✕</span>
                ) : (
                    <span className="fab-fina">🦊</span>
                )}
            </button>

            {/* Chat Panel */}
            <div className={`chat-panel ${isOpen ? 'show' : ''}`}>
                <div className="chat-header">
                    <div className="ch-left">
                        <span className="ch-avatar">🦊</span>
                        <div className="ch-info">
                            <h3>Fina AI</h3>
                            <p>Online</p>
                        </div>
                    </div>
                    <button className="ch-close" onClick={() => setIsOpen(false)}>✕</button>
                </div>

                <div className="chat-body">
                    {messages.map(msg => (
                        <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender}`}>
                            {msg.sender === 'fina' && <span className="msg-avatar">🦊</span>}
                            <div className="chat-bubble">
                                <p>{msg.text}</p>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="chat-bubble-wrapper fina">
                            <span className="msg-avatar">🦊</span>
                            <div className="chat-bubble typing">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className="chat-footer" onSubmit={handleSend}>
                    <input
                        type="text"
                        placeholder="Ask about your spending..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                    />
                    <button type="submit" className="chat-send-btn" disabled={!inputText.trim()}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    )
}
