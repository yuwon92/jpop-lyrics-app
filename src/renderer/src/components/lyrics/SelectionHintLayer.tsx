import { useState, useEffect } from 'react'

type SelectionHint = { x: number; y: number } | null

function getSelectedText(): string {
  const active = document.activeElement
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    const start = active.selectionStart
    const end = active.selectionEnd
    if (start != null && end != null && end > start) {
      return active.value.slice(start, end).trim()
    }
  }
  return window.getSelection()?.toString().trim() ?? ''
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function getSelectionHintPosition(): SelectionHint {
  const active = document.activeElement
  const hintWidth = 160

  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    const start = active.selectionStart
    const end = active.selectionEnd
    if (start == null || end == null || end <= start) return null

    const rect = active.getBoundingClientRect()
    const x = clamp(rect.right - hintWidth, 8, window.innerWidth - hintWidth - 8)
    const aboveY = rect.top - 34
    const y = aboveY >= 8 ? aboveY : rect.bottom + 8
    return { x, y: clamp(y, 8, window.innerHeight - 40) }
  }

  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const rect = selection.getRangeAt(0).getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null

  const x = clamp(rect.left + rect.width / 2 - hintWidth / 2, 8, window.innerWidth - hintWidth - 8)
  const aboveY = rect.top - 34
  const y = aboveY >= 8 ? aboveY : rect.bottom + 8
  return { x, y: clamp(y, 8, window.innerHeight - 40) }
}

interface Props {
  active: boolean
  onAddWord: (word: string) => void
}

/**
 * 텍스트 선택 시 "Ctrl+E로 단어 추가" 힌트와 단축키를 담당한다.
 * selection 이벤트마다 바뀌는 상태를 이 컴포넌트 안에 가둬
 * 에디터 전체(모든 LyricsRow)가 리렌더되지 않게 한다.
 */
export default function SelectionHintLayer({ active, onAddWord }: Props): JSX.Element | null {
  const [hint, setHint] = useState<SelectionHint>(null)

  useEffect(() => {
    if (!active) {
      setHint(null)
      return
    }

    const updateHint = () => {
      window.setTimeout(() => {
        if (!getSelectedText()) {
          setHint(null)
          return
        }
        setHint(getSelectionHintPosition())
      }, 0)
    }

    document.addEventListener('selectionchange', updateHint)
    window.addEventListener('mouseup', updateHint)
    window.addEventListener('keyup', updateHint)
    window.addEventListener('scroll', updateHint, true)

    return () => {
      document.removeEventListener('selectionchange', updateHint)
      window.removeEventListener('mouseup', updateHint)
      window.removeEventListener('keyup', updateHint)
      window.removeEventListener('scroll', updateHint, true)
    }
  }, [active])

  useEffect(() => {
    if (!active) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey || e.metaKey || e.key.toLowerCase() !== 'e') return

      const selectedText = getSelectedText()
      if (!selectedText) return

      e.preventDefault()
      onAddWord(selectedText)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, onAddWord])

  if (!hint) return null

  return (
    <div className="editor-selection-hint" style={{ left: hint.x, top: hint.y }}>
      Ctrl+E로 단어 추가
    </div>
  )
}
