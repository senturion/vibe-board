'use client'

import { useState, useMemo } from 'react'
import { Check, Plus, Search, ChevronDown, ChevronRight, Settings } from 'lucide-react'
import { useTagsContext } from '@/contexts/TagsContext'
import { Tag, TagCategory, TAG_COLORS } from '@/lib/types'
import { TagBadge } from './TagBadge'

interface TagPickerProps {
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
  onOpenManager?: () => void
}

export function TagPicker({ selectedTagIds, onTagsChange, onOpenManager }: TagPickerProps) {
  const { tags, categories, addTag, getTagsByCategory } = useTagsContext()
  const [search, setSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColorIndex, setNewTagColorIndex] = useState(0)

  // Filter tags by search
  const filteredTags = useMemo(() => {
    if (!search) return tags
    const query = search.toLowerCase()
    return tags.filter(t => t.name.toLowerCase().includes(query))
  }, [tags, search])

  // Group tags by category
  const groupedTags = useMemo(() => {
    const groups: { category: TagCategory | null; tags: Tag[] }[] = []

    // Add categorized tags
    categories.forEach(category => {
      const categoryTags = filteredTags.filter(t => t.categoryId === category.id)
      if (categoryTags.length > 0) {
        groups.push({ category, tags: categoryTags })
      }
    })

    // Add uncategorized tags
    const uncategorized = filteredTags.filter(t => !t.categoryId)
    if (uncategorized.length > 0) {
      groups.push({ category: null, tags: uncategorized })
    }

    return groups
  }, [filteredTags, categories])

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId))
    } else {
      onTagsChange([...selectedTagIds, tagId])
    }
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const handleAddTag = async () => {
    if (!newTagName.trim()) return

    const color = TAG_COLORS[newTagColorIndex]
    const newTag = await addTag(newTagName.trim(), color.color, color.bg)

    if (newTag) {
      onTagsChange([...selectedTagIds, newTag.id])
      setNewTagName('')
      setShowNewTag(false)
      setNewTagColorIndex((prev) => (prev + 1) % TAG_COLORS.length)
    }
  }

  const selectedTags = tags.filter(t => selectedTagIds.includes(t.id))

  return (
    <div className="space-y-3">
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map(tag => (
            <TagBadge
              key={tag.id}
              tag={tag}
              size="md"
              onRemove={() => toggleTag(tag.id)}
            />
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tags..."
          className="w-full pl-8 pr-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      {/* Tag list */}
      <div className="max-h-48 overflow-y-auto space-y-2">
        {groupedTags.map(({ category, tags: groupTags }) => {
          const categoryId = category?.id || 'uncategorized'
          const isExpanded = !category || expandedCategories.has(categoryId)

          return (
            <div key={categoryId}>
              {/* Category header */}
              {category && (
                <button
                  type="button"
                  onClick={() => toggleCategory(categoryId)}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] w-full py-1"
                >
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {category.name}
                  <span className="text-[var(--text-tertiary)]">({groupTags.length})</span>
                </button>
              )}

              {/* Tags in category */}
              {isExpanded && (
                <div className="flex flex-wrap gap-1.5 pl-4">
                  {groupTags.map(tag => {
                    const isSelected = selectedTagIds.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                          isSelected ? 'ring-2 ring-offset-1 ring-[var(--accent)]' : 'hover:opacity-80'
                        }`}
                        style={{
                          backgroundColor: tag.bgColor,
                          color: tag.color,
                        }}
                      >
                        {isSelected && <Check size={10} />}
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {filteredTags.length === 0 && !showNewTag && (
          <p className="text-xs text-[var(--text-tertiary)] text-center py-2">
            No tags found
          </p>
        )}
      </div>

      {/* Add new tag */}
      {showNewTag ? (
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
          <div
            className="w-5 h-5 rounded-full cursor-pointer border border-[var(--border)]"
            style={{ backgroundColor: TAG_COLORS[newTagColorIndex].bg, borderColor: TAG_COLORS[newTagColorIndex].color }}
            onClick={() => setNewTagColorIndex((prev) => (prev + 1) % TAG_COLORS.length)}
            title="Click to change color"
          />
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTag()
              if (e.key === 'Escape') {
                setShowNewTag(false)
                setNewTagName('')
              }
            }}
            placeholder="Tag name..."
            className="flex-1 px-2 py-1 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-2 py-1 text-xs bg-[var(--accent)] text-white rounded hover:opacity-90"
          >
            Add
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => setShowNewTag(true)}
            className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <Plus size={12} />
            Create tag
          </button>
          {onOpenManager && (
            <button
              type="button"
              onClick={onOpenManager}
              className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] ml-auto"
            >
              <Settings size={12} />
              Manage
            </button>
          )}
        </div>
      )}
    </div>
  )
}
