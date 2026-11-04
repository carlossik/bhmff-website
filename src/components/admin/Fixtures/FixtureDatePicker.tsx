import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
    value: string // ISO YYYY-MM-DD, empty if not chosen
    onChange: (isoDate: string) => void
    className?: string
}

const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]

function parseIso(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
    const [year, month, day] = value.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
        ? d : null
}

function isoFromParts(year: number, month: number, day: number): string | null {
    if (!Number.isInteger(year) || year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null
    const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return parseIso(iso) ? iso : null
}

function formatDate(value: string): string {
    const d = parseIso(value)
    if (!d) return ''
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function parseBritishDate(text: string): string | null {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim())
    if (!match) return null
    return isoFromParts(Number(match[3]), Number(match[2]), Number(match[1]))
}

export function FixtureDatePicker({ value, onChange, className = '' }: Props) {
    const [text, setText] = useState(() => formatDate(value))
    const [open, setOpen] = useState(false)
    const [error, setError] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const [month, setMonth] = useState(() => {
        const d = parseIso(value) ?? new Date()
        return new Date(d.getFullYear(), d.getMonth(), 1)
    })

    // Only synchronise when the parent's ISO value actually changes.
    // Do not erase partially typed day/month/year on ordinary rerenders.
    useEffect(() => {
        setText(formatDate(value))
        setError(false)
    }, [value])

    useEffect(() => {
        if (!open) return
        const onPointer = (event: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
        }
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', onPointer)
        document.addEventListener('keydown', onEscape)
        return () => {
            document.removeEventListener('pointerdown', onPointer)
            document.removeEventListener('keydown', onEscape)
        }
    }, [open])

    const cells = useMemo(() => {
        const offset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7
        const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
        return [...Array.from({ length: offset }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
    }, [month])

    function editText(next: string) {
        // Controlled text field retains partial input; only emit fully valid dates.
        setText(next)
        const iso = parseBritishDate(next)
        setError(false)
        if (iso && iso !== value) onChange(iso)
    }

    function validateOnBlur() {
        if (!text.trim()) {
            setError(true)
            return
        }
        setError(!parseBritishDate(text))
    }

    function chooseDay(day: number) {
        const iso = isoFromParts(month.getFullYear(), month.getMonth() + 1, day)
        if (!iso) return
        setText(formatDate(iso))
        setError(false)
        onChange(iso)
        setOpen(false)
    }

    function moveMonth(delta: number) {
        setMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1))
    }

    return (
        <div ref={rootRef} className="relative mt-2">
            <div className="relative">
                <input
                    aria-label="Fixture date (day/month/year)"
                    aria-invalid={error}
                    aria-describedby={error ? 'fixture-date-error' : undefined}
                    className={`${className} mt-0 pr-14`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="DD/MM/YYYY"
                    value={text}
                    onChange={event => editText(event.target.value)}
                    onBlur={validateOnBlur}
                />
                <button
                    aria-label="Open fixture calendar"
                    aria-expanded={open}
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-lime-300 hover:bg-lime-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-400"
                    onClick={() => {
                        const current = parseIso(value)
                        if (current) setMonth(new Date(current.getFullYear(), current.getMonth(), 1))
                        setOpen(previous => !previous)
                    }}
                >
                    <CalendarDays className="h-5 w-5" />
                </button>
            </div>
            {error && <p id="fixture-date-error" role="alert" className="mt-1 text-xs text-red-300">Enter a valid date as DD/MM/YYYY.</p>}
            {open && (
                <div className="absolute left-0 top-full z-[1100] mt-2 w-[min(21rem,calc(100vw-4rem))] rounded-xl border border-lime-700 bg-[#10190f] p-3 text-white shadow-2xl" role="group" aria-label="Fixture calendar">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <button type="button" aria-label="Previous month" className="rounded-md p-2 hover:bg-lime-400/10" onClick={() => moveMonth(-1)}><ChevronLeft className="h-4 w-4" /></button>
                        <span className="font-semibold">{months[month.getMonth()]} {month.getFullYear()}</span>
                        <button type="button" aria-label="Next month" className="rounded-md p-2 hover:bg-lime-400/10" onClick={() => moveMonth(1)}><ChevronRight className="h-4 w-4" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                        {['Mo','Tu','We','Th','Fr','Sa','Su'].map(day => <span key={day} className="py-1 text-slate-400">{day}</span>)}
                        {cells.map((day, index) => day === null
                            ? <span key={`blank-${index}`} />
                            : <button key={day} type="button" aria-label={`${day} ${months[month.getMonth()]} ${month.getFullYear()}`} aria-pressed={isoFromParts(month.getFullYear(), month.getMonth()+1, day) === value} className={`rounded-md p-2 text-sm hover:bg-lime-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-400 ${isoFromParts(month.getFullYear(), month.getMonth()+1, day) === value ? 'bg-lime-500 text-black font-bold' : ''}`} onClick={() => chooseDay(day)}>{day}</button>
                        )}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">Choose a day or type a date in DD/MM/YYYY format.</p>
                </div>
            )}
        </div>
    )
}
