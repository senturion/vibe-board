'use client'

import { useState, useEffect } from 'react'
import { Quote, RefreshCw } from 'lucide-react'

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Success is not final, failure is not fatal.", author: "Winston Churchill" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Small daily improvements are the key to staggering long-term results.", author: "Unknown" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
]

export function QuoteWidget() {
  const [quote, setQuote] = useState(QUOTES[0])
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    // Get a random quote on mount, but consistent for the day
    const today = new Date().toDateString()
    const seed = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    const index = seed % QUOTES.length
    setQuote(QUOTES[index])
  }, [])

  const getNewQuote = () => {
    setIsRefreshing(true)
    const randomIndex = Math.floor(Math.random() * QUOTES.length)
    setQuote(QUOTES[randomIndex])
    setTimeout(() => setIsRefreshing(false), 300)
  }

  return (
    <div className="p-3 bg-[var(--bg-tertiary)] border border-[var(--border)]">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Quote size={14} className="text-[var(--accent)] flex-shrink-0 mt-0.5" />
        <button
          onClick={getNewQuote}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          title="New quote"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>
      <p className="text-[11px] text-[var(--text-secondary)] italic leading-relaxed mb-1">
        "{quote.text}"
      </p>
      <p className="text-[10px] text-[var(--text-tertiary)]">
        — {quote.author}
      </p>
    </div>
  )
}
