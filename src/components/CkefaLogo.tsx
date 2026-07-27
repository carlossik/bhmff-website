import type { FC } from 'react'

type CkefaLogoProps = {
    className?: string
}

export const CkefaLogo: FC<CkefaLogoProps> = ({
                                                  className = '',
                                              }) => {
    return (
        <a
            href="https://tournamenthq.co.uk"
            target="_blank"
            rel="noopener noreferrer"
            className={`ckefaLogoLink ${className}`.trim()}
            aria-label="Visit TournamentHQ"
        >
            <img
                src="/assets/tournamenthq-logo.png"
                alt="TournamentHQ"
            />
        </a>
    )
}