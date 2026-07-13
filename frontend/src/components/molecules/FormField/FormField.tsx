import { ReactNode } from 'react'
import { Input } from '@components/atoms/Input'
import { clsx } from 'clsx'
import './FormField.css'

interface FormFieldProps {
  label: string
  name: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  helperText?: string
  icon?: ReactNode
}

export const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  helperText,
  icon,
}: FormFieldProps) => {
  return (
    <div className="form-field">
      <div className={clsx('form-field__input-wrapper', { 'form-field__input-wrapper--with-icon': icon })}>
        {icon && <div className="form-field__icon">{icon}</div>}
        <Input
          label={label}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          error={error}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          helperText={helperText}
          fullWidth
        />
      </div>
    </div>
  )
}
