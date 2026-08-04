import { ReactNode, useEffect, useId, useRef } from 'react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import './Modal.css'

interface Props {
  title: string
  icon?: string
  onClose: () => void
  /** modal-window에 추가되는 클래스 (너비·액센트 색 오버라이드용) */
  className?: string
  overlayClassName?: string
  /** 타이틀바 오른쪽(닫기 버튼 앞)에 렌더되는 요소 */
  titleExtra?: ReactNode
  children: ReactNode
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'

function getFocusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled')
  )
}

/**
 * 공통 모달 셸: 오버레이 클릭·Esc로 닫기, dialog 시맨틱,
 * Tab 포커스 트랩, 닫힐 때 이전 포커스 복원을 담당한다.
 */
export default function Modal({
  title,
  icon,
  onClose,
  className = '',
  overlayClassName = '',
  titleExtra,
  children
}: Props): JSX.Element {
  const windowRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEscapeKey(onClose)

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = windowRef.current
    // autoFocus가 지정된 모달은 React가 이미 포커스를 옮겼으므로 건드리지 않는다
    if (root && !root.contains(document.activeElement)) {
      const first = getFocusables(root)[0]
      ;(first ?? root).focus()
    }
    return () => previous?.focus()
  }, [])

  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const root = windowRef.current
      if (!root) return
      const focusables = getFocusables(root)
      if (focusables.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last || !root.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleTab)
    return () => window.removeEventListener('keydown', handleTab)
  }, [])

  return (
    <div className={`modal-overlay ${overlayClassName}`} onClick={onClose}>
      <div
        ref={windowRef}
        className={`modal-window ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-titlebar">
          {icon && (
            <span className="modal-titlebar__icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <span id={titleId} className="modal-titlebar__title">
            {title}
          </span>
          {titleExtra}
          <button className="modal-close-btn" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
