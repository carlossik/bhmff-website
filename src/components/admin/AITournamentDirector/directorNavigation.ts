function normalise(value: string | null): string {
    return value
        ?.replace(/\s+/g, ' ')
        .trim()
        .toLowerCase() ?? ''
}

function findAdminModuleButton(
    moduleNames: readonly string[]
): HTMLButtonElement | null {
    const targets = new Set(
        moduleNames.map(normalise)
    )

    return Array.from(
        document.querySelectorAll<HTMLButtonElement>(
            'button'
        )
    ).find((button) =>
        targets.has(normalise(button.textContent))
    ) ?? null
}

export function openFixtureGenerator(): boolean {
    const targetButton = findAdminModuleButton([
        'Intelligent Fixture Generator',
        'Auto Fixture Generator',
        'Fixture Generator',
    ])

    if (!targetButton) {
        return false
    }

    targetButton.focus()
    targetButton.click()

    window.requestAnimationFrame(() => {
        document
            .querySelector('.adminWorkspace')
            ?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            })
    })

    return true
}
