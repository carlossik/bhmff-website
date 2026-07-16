import type { ReactNode } from 'react'

type HomePageProps = {
    children: ReactNode
}

export function HomePage({
                             children,
                         }: HomePageProps) {
    return <>{children}</>
}