import { CkefaLogo } from './CkefaLogo'

const navItems = [
  ['Festival', '#festival'],
  ['Fixtures', '#fixtures'],
  ['Teams', '#teams'],
  ['Media', '#media'],
  ['Black History', '#history'],
  ['Sponsors', '#sponsors'],
  ['Admin Portal', '/admin'],
]

export function Header() {
  return (
    <header className="topbar">
      <nav className="container nav">
        <a className="brand" href="#home">
          <div className="logoMark">BHM</div>
          <div>
            <strong>Black History Month Football Festival</strong>
            <span>Powered by CKEFA Media</span>
          </div>
        </a>
        <CkefaLogo className="headerLogo" />
        <div className="navLinks">
          {navItems.map(([label, href]) => <a key={label} href={href}>{label}</a>)}
        </div>
      </nav>
    </header>
  )
}
