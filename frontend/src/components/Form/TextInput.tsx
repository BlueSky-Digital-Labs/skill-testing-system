import { forwardRef, InputHTMLAttributes } from 'react'
import { Input } from '@components/atoms/Input'

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ type = 'text', ...props }, ref) => (
    <Input ref={ref} type={type} {...props} />
  ),
)

TextInput.displayName = 'TextInput'
