import { CKEFA_MEDIA_URL } from '../data/festivalData'

type CkefaLogoProps = { className?: string }

export function CkefaLogo({ className = '' }: CkefaLogoProps) {
  return (
    <a href={CKEFA_MEDIA_URL} target="_blank" rel="noopener noreferrer" className={`ckefaLogoLink ${className}`.trim()} aria-label="Visit CKEFA Media website">
      <img src="/assets/ckefa-media-logo.jpeg" alt="CKEFA Media" />
    </a>
  )
}
