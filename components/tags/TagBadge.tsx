'use client'

import { X } from 'lucide-react'
import { Tag } from '@/lib/types'

interface TagBadgeProps {
  tag: Tag
  size?: 'sm' | 'md'
  onRemove?: () => void
  onClick?: () => void
}

export function TagBadge({ tag, size = 'sm', onRemove, onClick }: TagBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      style={{
        backgroundColor: tag.bgColor,
        color: tag.color,
      }}
      onClick={onClick}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          <X size={size === 'sm' ? 10 : 12} />
        </button>
      )}
    </span>
  )
}
