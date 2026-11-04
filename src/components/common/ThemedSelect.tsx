import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'

type SelectOption = { value: string; label: string }

type ThemedSelectProps = {
    label: string
    value: string
    options: readonly SelectOption[]
    onChange: (value: string) => void
    disabled?: boolean
    placeholder?: string
}

/** Custom menu avoids OS-native option popup colours on Windows/Chrome. */
export function ThemedSelect({
    label, value, options, onChange, disabled = false, placeholder = 'Select an option',
}: ThemedSelectProps) {
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(0)
    const rootRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const listId = useId()
    const selectedIndex = options.findIndex((option) => option.value === value)
    const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

    useEffect(() => {
        if (!open) return
        function onPointerDown(event: PointerEvent) {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [open])

    function choose(index: number) {
        const option = options[index]
        if (!option) return
        onChange(option.value)
        setOpen(false)
        triggerRef.current?.focus()
    }

    function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        if (disabled || options.length === 0) return
        if (event.key === 'Escape' && open) {
            event.preventDefault()
            event.stopPropagation()
            setOpen(false)
            return
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            if (!open) {
                setActiveIndex(Math.max(0, selectedIndex))
                setOpen(true)
            } else {
                setActiveIndex((index) => (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
            }
        } else if (event.key === 'Home' && open) {
            event.preventDefault()
            setActiveIndex(0)
        } else if (event.key === 'End' && open) {
            event.preventDefault()
            setActiveIndex(options.length - 1)
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (open) choose(activeIndex)
            else {
                setActiveIndex(Math.max(0, selectedIndex))
                setOpen(true)
            }
        } else if (event.key === 'Tab') {
            setOpen(false)
        }
    }

    return (
        <div className="relative mt-2" ref={rootRef}>
            <button
                ref={triggerRef}
                type="button"
                aria-label={label}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
                disabled={disabled}
                onKeyDown={handleKeyDown}
                onClick={() => {
                    setActiveIndex(Math.max(0, selectedIndex))
                    setOpen((previous) => !previous)
                }}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/40 bg-[#071006] px-4 py-3 text-left text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-lime-400 disabled:opacity-60"
            >
                <span>{selected?.label ?? placeholder}</span>
                <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
            </button>
            {open && (
                <div
                    id={listId}
                    role="listbox"
                    aria-label={label}
                    className="absolute left-0 right-0 top-full z-[1100] mt-1 max-h-56 overflow-y-auto rounded-xl border border-lime-700 bg-[#10190f] p-1 text-white shadow-2xl"
                >
                    {options.map((option, index) => (
                        <div
                            id={`${listId}-${index}`}
                            key={`${option.value}-${index}`}
                            role="option"
                            aria-selected={option.value === value}
                            onMouseEnter={() => setActiveIndex(index)}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => choose(index)}
                            className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${index === activeIndex ? 'bg-lime-900/80 text-white' : 'text-slate-100 hover:bg-lime-900/60'}`}
                        >
                            {option.label}
                            {option.value === value && <Check aria-hidden="true" className="h-4 w-4" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
