import React from 'react'
import './PixelButton.css'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export default function PixelButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: Props): JSX.Element {
  return (
    <button className={`pixel-btn pixel-btn--${variant} pixel-btn--${size} ${className}`} {...rest}>
      {children}
    </button>
  )
}
