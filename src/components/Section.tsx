import type { ReactNode } from 'react'

type SectionProps = { id: string; title: string; intro?: string; children: ReactNode }
export function Section({ id, title, intro, children }: SectionProps) {
  return <section id={id} className="section"><div className="container"><h2>{title}</h2>{intro && <p className="lead">{intro}</p>}{children}</div></section>
}
