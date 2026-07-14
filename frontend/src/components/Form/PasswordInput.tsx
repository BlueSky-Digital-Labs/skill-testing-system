import { forwardRef, InputHTMLAttributes, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@components/atoms/Input'
import './PasswordInput.css'

export interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, ref) => {
    const [visible, setVisible] = useState(false)

    return (
      <div className="password-input-field">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          {...props}
        />
        <button
          type="button"
          className="password-input-field__toggle"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    )
  },
)

PasswordInput.displayName = 'PasswordInput'
