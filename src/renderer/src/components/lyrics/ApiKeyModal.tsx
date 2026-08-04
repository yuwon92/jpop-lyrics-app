import React, { useState } from 'react'
import Modal from '../shared/Modal'
import PixelButton from '../shared/PixelButton'
import './ApiKeyModal.css'

interface Props {
  onSubmit: (key: string) => void
  onClose: () => void
  description?: string
  submitLabel?: string
}

export default function ApiKeyModal({
  onSubmit,
  onClose,
  description = '한글 발음 변환을 위해 Anthropic API 키가 필요해요.',
  submitLabel = '✦ 저장 후 변환'
}: Props): JSX.Element {
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)

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
    <Modal
      title="Anthropic API 키 설정"
      icon="✦"
      onClose={onClose}
      className="apikey-modal-window"
    >
      <div className="modal-body">
        <p className="apikey-modal__desc">
          {description}<br />
          키는 기기에 암호화되어 저장되며 외부로 전송되지 않아요.
        </p>
        <input
          className="apikey-modal__input"
          type="password"
          placeholder="sk-ant-..."
          aria-label="Anthropic API 키"
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
            {saving ? '저장 중...' : submitLabel}
          </PixelButton>
        </div>
      </div>
    </Modal>
  )
}
