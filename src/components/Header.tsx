const navItems = [
    ['Festival', '#festival'],
    ['Fixtures', '#fixtures'],
    ['Results', '#results'],
    ['Teams', '#teams'],
    ['Media', '#media'],
    ['Black History', '#history'],
    ['Sponsors', '#sponsors'],
    ['Admin Portal', '/admin'],
] as const

export function Header() {
    return (
        <header className="topbar">
            <nav
                className="container nav"
                style={{
                    display: 'grid',
                    gridTemplateColumns:
                        'minmax(390px, 1fr) auto minmax(620px, 1fr)',
                    alignItems: 'center',
                    gap: '1.5rem',
                    minHeight: '92px',
                }}
            >
                <a
                    className="brand"
                    href="#home"
                    style={{
                        minWidth: 0,
                    }}
                >
                    <div className="logoMark">BHM</div>

                    <div>
                        <strong>
                            Black History Month Football Festival
                        </strong>

                        <span>
              Powered by TournamentHQ
            </span>
                    </div>
                </a>

                <a
                    href="https://tournamenthq.co.uk"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Visit TournamentHQ"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textDecoration: 'none',
                    }}
                >
                    <img
                        src="/assets/tournamenthq-logo.png"
                        alt="TournamentHQ"
                        style={{
                            display: 'block',
                            width: '185px',
                            maxWidth: '100%',
                            height: 'auto',
                            maxHeight: '50px',
                            objectFit: 'contain',
                        }}
                    />
                </a>

                <div
                    className="navLinks"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '1.05rem',
                        flexWrap: 'nowrap',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {navItems.map(([label, href]) => (
                        <a
                            key={label}
                            href={href}
                            style={{
                                flexShrink: 0,
                            }}
                        >
                            {label}
                        </a>
                    ))}
                </div>
            </nav>
        </header>
    )
}