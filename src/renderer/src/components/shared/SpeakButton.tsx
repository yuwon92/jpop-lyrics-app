import { useSpeech } from '../../hooks/useSpeech'
import { stopSpeaking, TTS_UNAVAILABLE_HINT } from '../../lib/tts'
import './SpeakButton.css'

interface Props {
  text: string // 실제 발화할 텍스트 (보통 reading || word)
  label: string // aria/title에 표시할 단어
  className?: string
}

export default function SpeakButton({ text, label, className }: Props): JSX.Element {
  const { speak, speaking, available } = useSpeech(text)

  return (
    <button
      type="button"
      className={`speak-btn${speaking ? ' speaking' : ''}${className ? ` ${className}` : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        if (speaking) stopSpeaking()
        else speak()
      }}
      disabled={!available}
      title={available ? '발음 듣기' : TTS_UNAVAILABLE_HINT}
      aria-label={`'${label}' 발음 듣기`}
    >
      ♪
    </button>
  )
}
