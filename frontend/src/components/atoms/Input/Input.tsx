import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'
import './Input.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, fullWidth = false, className, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

    return (
      <div className={clsx('input-group', { 'input-group--full-width': fullWidth })}>
        {label && (
          <label htmlFor={inputId} className="input__label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'input',
            {
              'input--error': error,
            },
            className
          )}
          {...props}
        />
        {error && <span className="input__error">{error}</span>}
        {helperText && !error && <span className="input__helper">{helperText}</span>}
      </div>
    )
  }
)
