import type { ReactNode } from 'react'

type CompetitionRulesContentProps = {
    text: string
    className?: string
}

function isNumberedHeading(line: string): boolean {
    return /^\d+\.\s+[A-Z]/.test(line)
}

function isStandaloneHeading(line: string): boolean {
    if (!line || line.length > 72) {
        return false
    }

    if (line === 'Automatic Suspension') {
        return true
    }

    return (
        line === line.toUpperCase() &&
        /[A-Z]/.test(line) &&
        !line.startsWith('-')
    )
}

function renderLine(line: string, index: number): ReactNode {
    if (!line) {
        return <div key={`space-${index}`} className="h-2" aria-hidden="true" />
    }

    if (isNumberedHeading(line)) {
        return (
            <h3
                key={`heading-${index}`}
                className="mt-7 text-lg font-black tracking-tight first:mt-0 sm:text-xl"
            >
                {line}
            </h3>
        )
    }

    if (line.startsWith('- ')) {
        return (
            <div
                key={`bullet-${index}`}
                className="flex items-start gap-3 pl-1 text-sm leading-7 sm:text-[15px]"
            >
                <span className="mt-[0.68rem] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
                <span>{line.slice(2)}</span>
            </div>
        )
    }

    if (line === '↓') {
        return (
            <div
                key={`arrow-${index}`}
                className="py-1 text-center text-lg font-black opacity-60"
                aria-hidden="true"
            >
                ↓
            </div>
        )
    }

    if (isStandaloneHeading(line)) {
        return (
            <h4
                key={`subheading-${index}`}
                className="mt-5 text-sm font-black uppercase tracking-[0.12em]"
            >
                {line}
            </h4>
        )
    }

    return (
        <p
            key={`paragraph-${index}`}
            className="text-sm leading-7 sm:text-[15px]"
        >
            {line}
        </p>
    )
}

export function CompetitionRulesContent({
    text,
    className = '',
}: CompetitionRulesContentProps) {
    const lines = text
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map((line) => line.trim())

    return (
        <div className={`space-y-2 ${className}`.trim()}>
            {lines.map(renderLine)}
        </div>
    )
}
