import { useState } from 'react'
import Modal from '../shared/Modal'
import PixelButton from '../shared/PixelButton'
import PixelInput from '../shared/PixelInput'
import './AddNoteModal.css'

interface Props {
  songId: number | null
  songTitle?: string
  initialPoint?: string
  initialExplanation?: string
  initialExample?: string
  onAdd: (point: string, explanation: string, example: string) => Promise<void>
  onClose: () => void
}

export default function AddNoteModal({
  songTitle,
  initialPoint = '',
  initialExplanation = '',
  initialExample = '',
  onAdd,
  onClose
}: Props): JSX.Element {
  const isEditing = initialExplanation !== ''

  const [point, setPoint] = useState(initialPoint)
  const [explanation, setExplanation] = useState(initialExplanation)
  const [example, setExample] = useState(initialExample)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleSubmit = async () => {
    if (!point.trim() || !explanation.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      await onAdd(point.trim(), explanation.trim(), example.trim())
      onClose()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '저장에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEditing ? '노트 수정' : '문법 노트 추가'}
      icon={isEditing ? '✎' : '✦'}
      onClose={onClose}
      className="note-modal-window"
    >
      <div className="modal-body">
        {songTitle && (
          <div className="modal-song-tag">
            <span className="modal-song-tag__icon">♪</span>
            <span>{songTitle}</span>
          </div>
        )}
        <PixelInput
          label="문법 포인트"
          placeholder="예) 〜ている、〜から"
          value={point}
          onChange={(e) => setPoint(e.target.value)}
          autoFocus
          style={{ fontFamily: 'var(--font-pixel-cjk)' }}
        />
        <div className="note-modal__explanation-wrap">
          <label className="note-modal__label" htmlFor="note-modal-explanation">설명</label>
          <textarea
            id="note-modal-explanation"
            className="note-modal__textarea"
            placeholder="예) '~하고 있다'에 해당하며 동작의 진행을 나타냄"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            rows={3}
          />
        </div>
        <PixelInput
          label="예문 (선택)"
          placeholder="가사 원문 또는 예시 문장"
          value={example}
          onChange={(e) => setExample(e.target.value)}
          style={{ fontFamily: 'var(--font-pixel-cjk)' }}
        />
        {saveError && <div className="modal-save-error">{saveError}</div>}
        <div className="modal-actions">
          <PixelButton variant="ghost" size="sm" onClick={onClose}>취소</PixelButton>
          <PixelButton
            variant="secondary"
            size="sm"
            onClick={handleSubmit}
            disabled={!point.trim() || !explanation.trim() || saving}
          >
            {saving ? '저장 중...' : isEditing ? '✎ 저장' : '✦ 저장'}
          </PixelButton>
        </div>
      </div>
    </Modal>
  )
}
