import {
    Menu,
    X,
} from 'lucide-react'
import { useState } from 'react'

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
    const [menuOpen, setMenuOpen] =
        useState(false)

    function closeMenu() {
        setMenuOpen(false)
    }

    return (
        <header className="topbar">
            <style>
                {`
                    .bhmffHeaderNav {
                        display: grid;
                        grid-template-columns:
                            minmax(340px, 1fr)
                            190px
                            minmax(0, 1.65fr);
                        align-items: center;
                        column-gap: 2.75rem;
                        min-height: 92px;
                    }

                    .bhmffHeaderBrand {
                        min-width: 0;
                    }

                    .bhmffHeaderPlatformLogo {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        width: 190px;
                        text-decoration: none;
                    }

                    .bhmffHeaderPlatformLogo img {
                        display: block;
                        width: 185px;
                        max-width: 100%;
                        height: auto;
                        max-height: 50px;
                        object-fit: contain;
                    }

                    .bhmffHeaderDesktopLinks {
                        display: flex;
                        align-items: center;
                        justify-content: flex-start;
                        gap: 1rem;
                        min-width: 0;
                        flex-wrap: nowrap;
                        white-space: nowrap;
                    }

                    .bhmffHeaderDesktopLinks a {
                        flex-shrink: 0;
                    }

                    .bhmffHeaderMenuButton,
                    .bhmffHeaderMobileMenu {
                        display: none;
                    }

                    @media (max-width: 1100px) {
                        .bhmffHeaderNav {
                            grid-template-columns: minmax(0, 1fr) auto auto;
                            column-gap: 1rem;
                            min-height: 82px;
                        }

                        .bhmffHeaderDesktopLinks {
                            display: none;
                        }

                        .bhmffHeaderMenuButton {
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            width: 44px;
                            height: 44px;
                            padding: 0;
                            border: 1px solid rgba(132, 204, 22, 0.35);
                            border-radius: 10px;
                            background: rgba(132, 204, 22, 0.08);
                            color: #ffffff;
                            cursor: pointer;
                        }

                        .bhmffHeaderMobileMenu {
                            display: grid;
                            grid-template-columns: repeat(2, minmax(0, 1fr));
                            gap: 0.6rem;
                            padding: 0 1rem 1rem;
                            border-top: 1px solid rgba(132, 204, 22, 0.2);
                            background: rgba(4, 12, 4, 0.98);
                        }

                        .bhmffHeaderMobileMenu a {
                            display: flex;
                            align-items: center;
                            min-height: 44px;
                            padding: 0.7rem 0.85rem;
                            border: 1px solid rgba(132, 204, 22, 0.2);
                            border-radius: 9px;
                            color: inherit;
                            text-decoration: none;
                            font-weight: 800;
                        }
                    }

                    @media (max-width: 700px) {
                        .bhmffHeaderNav {
                            grid-template-columns: minmax(0, 1fr) auto;
                            gap: 0.75rem;
                            min-height: 76px;
                        }

                        .bhmffHeaderPlatformLogo {
                            display: none;
                        }

                        .bhmffHeaderBrand strong {
                            font-size: 0.82rem;
                            line-height: 1.15;
                        }

                        .bhmffHeaderBrand span {
                            font-size: 0.66rem;
                        }

                        .bhmffHeaderMobileMenu {
                            grid-template-columns: 1fr;
                        }
                    }
                `}
            </style>

            <nav className="container nav bhmffHeaderNav">
                <a
                    className="brand bhmffHeaderBrand"
                    href="#home"
                    onClick={closeMenu}
                >
                    <div className="logoMark">
                        BHM
                    </div>

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
                    className="bhmffHeaderPlatformLogo"
                    href="https://tournamenthq.co.uk"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Visit TournamentHQ"
                >
                    <img
                        src="/assets/tournamenthq-logo.png"
                        alt="TournamentHQ"
                    />
                </a>

                <div className="navLinks bhmffHeaderDesktopLinks">
                    {navItems.map(([label, href]) => (
                        <a
                            key={label}
                            href={href}
                        >
                            {label}
                        </a>
                    ))}
                </div>

                <button
                    type="button"
                    className="bhmffHeaderMenuButton"
                    aria-label={
                        menuOpen
                            ? 'Close navigation menu'
                            : 'Open navigation menu'
                    }
                    aria-expanded={menuOpen}
                    onClick={() =>
                        setMenuOpen(
                            (current) =>
                                !current,
                        )
                    }
                >
                    {menuOpen ? (
                        <X size={22} />
                    ) : (
                        <Menu size={22} />
                    )}
                </button>
            </nav>

            {menuOpen ? (
                <div className="bhmffHeaderMobileMenu">
                    {navItems.map(([label, href]) => (
                        <a
                            key={label}
                            href={href}
                            onClick={closeMenu}
                        >
                            {label}
                        </a>
                    ))}
                </div>
            ) : null}
        </header>
    )
}