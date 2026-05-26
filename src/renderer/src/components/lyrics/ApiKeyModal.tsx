import React, { useState } from 'react'
import PixelButton from '../shared/PixelButton'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import './ApiKeyModal.css'

interface Props {
  onSubmit: (key: string) => void
  onClose: () => void
}

export default function ApiKeyModal({ onSubmit, onClose }: Props): JSX.Element {
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)

  useEscapeKey(onClose)

  const handleSubmit = async () => {
    if (!key.trim()) return
    setSaving(true)
    try {
      await onSubmit(key.trim())
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window" onClick={(e) => e.stopPropagation()}>
        <div className="modal-titlebar">
          <span className="modal-titlebar__icon">✦</span>
          <span className="modal-titlebar__title">Anthropic API 키 설정</span>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="apikey-modal__desc">
            한글 발음 변환을 위해 Anthropic API 키가 필요해요.<br />
            키는 기기에 암호화되어 저장되며 외부로 전송되지 않아요.
          </p>
          <input
            className="apikey-modal__input"
            type="password"
            placeholder="sk-ant-..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            spellCheck={false}
          />
          <div className="modal-actions">
            <PixelButton variant="ghost" size="sm" onClick={onClose}>
              취소
            </PixelButton>
            <PixelButton
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={!key.trim() || saving}
            >
              {saving ? '저장 중...' : '✦ 저장 후 변환'}
            </PixelButton>
          </div>
        </div>
      </div>
    </div>
  )
}
