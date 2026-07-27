import type { ReactNode } from 'react'

type CkefaLinkProps = {
  children?: ReactNode
  className?: string
}

export function CkefaLink({
                            children = 'TournamentHQ',
                            className = '',
                          }: CkefaLinkProps) {
  return (
      <a
          href="https://tournamenthq.co.uk"
          target="_blank"
          rel="noopener noreferrer"
          className={`ckefaLink ${className}`.trim()}
      >
        {children}
      </a>
  )
}