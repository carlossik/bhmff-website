import type { ReactNode } from 'react'
import { CKEFA_MEDIA_URL } from '../data/festivalData'

type CkefaLinkProps = {
  children?: ReactNode
  className?: string
}

export function CkefaLink({ children = 'CKEFA Media', className = '' }: CkefaLinkProps) {
  return (
    <a href={CKEFA_MEDIA_URL} target="_blank" rel="noopener noreferrer" className={`ckefaLink ${className}`.trim()}>
      {children}
    </a>
  )
}
