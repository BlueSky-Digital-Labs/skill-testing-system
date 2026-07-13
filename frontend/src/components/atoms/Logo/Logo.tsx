import logoImageLg from '@/assets/images/horizon-digital-logo-lg.png'
import logoSvg from '@/assets/images/HD_LOGO.05c83a78cc145c1d05b98dc498e68ee5.svg'
import './Logo.css'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  variant?: 'svg' | 'png'
  className?: string
}

export const Logo = ({ size = 'lg', variant = 'png', className = '' }: LogoProps) => {
  const logoSrc = variant === 'svg' ? logoSvg : logoImageLg
  
  return (
    <div className={`logo logo--${size} ${className}`}>
      <img 
        src={logoSrc} 
        alt="Horizon Digital" 
        className="logo-image"
      />
    </div>
  )
}
