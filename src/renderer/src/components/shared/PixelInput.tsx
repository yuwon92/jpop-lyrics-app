import React from 'react'
import './PixelInput.css'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export default function PixelInput({ label, className = '', ...rest }: Props): JSX.Element {
  return (
    <div className="pixel-input-wrap">
      {label && <label className="pixel-input-label">{label}</label>}
      <input className={`pixel-input ${className}`} {...rest} />
    </div>
  )
}
