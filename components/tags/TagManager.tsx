'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Edit2, Check, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { useTagsContext } from '@/contexts/TagsContext'
import { Tag, TagCategory, TAG_COLORS } from '@/lib/types'
import { TagBadge } from './TagBadge'

interface TagManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function TagManager({ isOpen, onClose }: TagManagerProps) {
  const {
    tags,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    addTag,
    updateTag,
    deleteTag,
    getTagsByCategory,
  } = useTagsContext()

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [showNewTag, setShowNewTag] = useState<string | null>(null) // category id or 'uncategorized'
  const [newTagName, setNewTagName] = useState('')
  const [newTagColorIndex, setNewTagColorIndex] = useState(0)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(categories.map(c => c.id)))
  const [editName, setEditName] = useState('')
  const [editColorIndex, setEditColorIndex] = useState(0)

  if (!isOpen) return null

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

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    await addCategory(newCategoryName.trim())
    setNewCategoryName('')
    setShowNewCategory(false)
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (confirm('Delete this category? Tags in this category will become uncategorized.')) {
      await deleteCategory(categoryId)
    }
  }

  const handleStartEditCategory = (category: TagCategory) => {
    setEditingCategoryId(category.id)
    setEditName(category.name)
  }

  const handleSaveCategory = async (categoryId: string) => {
    if (editName.trim()) {
      await updateCategory(categoryId, { name: editName.trim() })
    }
    setEditingCategoryId(null)
    setEditName('')
  }

  const handleAddTag = async (categoryId?: string) => {
    if (!newTagName.trim()) return
    const color = TAG_COLORS[newTagColorIndex]
    await addTag(newTagName.trim(), color.color, color.bg, categoryId)
    setNewTagName('')
    setShowNewTag(null)
    setNewTagColorIndex((prev) => (prev + 1) % TAG_COLORS.length)
  }

  const handleStartEditTag = (tag: Tag) => {
    setEditingTagId(tag.id)
    setEditName(tag.name)
    const colorIdx = TAG_COLORS.findIndex(c => c.color === tag.color)
    setEditColorIndex(colorIdx >= 0 ? colorIdx : 0)
  }

  const handleSaveTag = async (tagId: string) => {
    if (editName.trim()) {
      const color = TAG_COLORS[editColorIndex]
      await updateTag(tagId, {
        name: editName.trim(),
        color: color.color,
        bgColor: color.bg,
      })
    }
    setEditingTagId(null)
    setEditName('')
  }

  const handleDeleteTag = async (tagId: string) => {
    if (confirm('Delete this tag? It will be removed from all tasks.')) {
      await deleteTag(tagId)
    }
  }

  const uncategorizedTags = tags.filter(t => !t.categoryId)

  const renderTagRow = (tag: Tag) => {
    const isEditing = editingTagId === tag.id

    if (isEditing) {
      return (
        <div key={tag.id} className="flex items-center gap-2 py-1 px-2 bg-[var(--bg-tertiary)] rounded">
          <div
            className="w-5 h-5 rounded-full cursor-pointer border-2"
            style={{
              backgroundColor: TAG_COLORS[editColorIndex].bg,
              borderColor: TAG_COLORS[editColorIndex].color,
            }}
            onClick={() => setEditColorIndex((prev) => (prev + 1) % TAG_COLORS.length)}
            title="Click to change color"
          />
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTag(tag.id)
              if (e.key === 'Escape') {
                setEditingTagId(null)
                setEditName('')
              }
            }}
            className="flex-1 px-2 py-0.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
            autoFocus
          />
          <button
            onClick={() => handleSaveTag(tag.id)}
            className="p-1 text-[var(--success)] hover:bg-[var(--bg-secondary)] rounded"
          >
            <Check size={14} />
          </button>
          <button
            onClick={() => {
              setEditingTagId(null)
              setEditName('')
            }}
            className="p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-secondary)] rounded"
          >
            <X size={14} />
          </button>
        </div>
      )
    }

    return (
      <div key={tag.id} className="flex items-center gap-2 py-1 px-2 hover:bg-[var(--bg-tertiary)] rounded group">
        <GripVertical size={12} className="text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 cursor-grab" />
        <TagBadge tag={tag} size="md" />
        <div className="flex-1" />
        <button
          onClick={() => handleStartEditTag(tag)}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded opacity-0 group-hover:opacity-100"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={() => handleDeleteTag(tag.id)}
          className="p-1 text-[var(--text-tertiary)] hover:text-red-400 hover:bg-[var(--bg-secondary)] rounded opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      </div>
    )
  }

  const renderNewTagInput = (categoryId?: string) => (
    <div className="flex items-center gap-2 py-1 px-2">
      <div
        className="w-5 h-5 rounded-full cursor-pointer border-2"
        style={{
          backgroundColor: TAG_COLORS[newTagColorIndex].bg,
          borderColor: TAG_COLORS[newTagColorIndex].color,
        }}
        onClick={() => setNewTagColorIndex((prev) => (prev + 1) % TAG_COLORS.length)}
        title="Click to change color"
      />
      <input
        type="text"
        value={newTagName}
        onChange={(e) => setNewTagName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleAddTag(categoryId)
          if (e.key === 'Escape') {
            setShowNewTag(null)
            setNewTagName('')
          }
        }}
        placeholder="Tag name..."
        className="flex-1 px-2 py-0.5 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
        autoFocus
      />
      <button
        onClick={() => handleAddTag(categoryId)}
        className="px-2 py-0.5 text-xs bg-[var(--accent)] text-white rounded hover:opacity-90"
      >
        Add
      </button>
      <button
        onClick={() => {
          setShowNewTag(null)
          setNewTagName('')
        }}
        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
      >
        <X size={14} />
      </button>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[80vh] bg-[var(--bg-primary)] rounded-xl shadow-2xl border border-[var(--border)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text-primary)]">Manage Tags</h2>
          <button
            onClick={onClose}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-secondary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Categories */}
          {categories.map(category => {
            const categoryTags = getTagsByCategory(category.id)
            const isExpanded = expandedCategories.has(category.id)
            const isEditing = editingCategoryId === category.id

            return (
              <div key={category.id} className="space-y-1">
                {/* Category header */}
                <div className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCategory(category.id)
                          if (e.key === 'Escape') setEditingCategoryId(null)
                        }}
                        className="flex-1 px-2 py-0.5 text-sm font-medium bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveCategory(category.id)}
                        className="p-1 text-[var(--success)]"
                      >
                        <Check size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">
                        {category.name}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">
                        {categoryTags.length}
                      </span>
                      <button
                        onClick={() => handleStartEditCategory(category)}
                        className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-1 text-[var(--text-tertiary)] hover:text-red-400 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>

                {/* Tags in category */}
                {isExpanded && (
                  <div className="ml-5 space-y-0.5">
                    {categoryTags.map(renderTagRow)}

                    {showNewTag === category.id ? (
                      renderNewTagInput(category.id)
                    ) : (
                      <button
                        onClick={() => setShowNewTag(category.id)}
                        className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] py-1 px-2"
                      >
                        <Plus size={12} />
                        Add tag
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Uncategorized tags */}
          {(uncategorizedTags.length > 0 || showNewTag === 'uncategorized') && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--text-tertiary)]">Uncategorized</span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {uncategorizedTags.length}
                </span>
              </div>
              <div className="ml-5 space-y-0.5">
                {uncategorizedTags.map(renderTagRow)}

                {showNewTag === 'uncategorized' ? (
                  renderNewTagInput()
                ) : (
                  <button
                    onClick={() => setShowNewTag('uncategorized')}
                    className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] py-1 px-2"
                  >
                    <Plus size={12} />
                    Add tag
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Add new category */}
          {showNewCategory ? (
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategory()
                  if (e.key === 'Escape') {
                    setShowNewCategory(false)
                    setNewCategoryName('')
                  }
                }}
                placeholder="Category name..."
                className="flex-1 px-3 py-1.5 text-sm bg-[var(--bg-secondary)] border border-[var(--border)] rounded focus:outline-none focus:border-[var(--accent)]"
                autoFocus
              />
              <button
                onClick={handleAddCategory}
                className="px-3 py-1.5 text-sm bg-[var(--accent)] text-white rounded hover:opacity-90"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowNewCategory(false)
                  setNewCategoryName('')
                }}
                className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewCategory(true)}
              className="flex items-center gap-2 text-sm text-[var(--accent)] hover:opacity-80 pt-2 border-t border-[var(--border)]"
            >
              <Plus size={14} />
              Add category
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
