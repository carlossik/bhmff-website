import {
    supabase,
} from '../lib/supabaseClient'

type TelemetryContext = {
    organisationId: string | null
    component: string
}

type TelemetryMetadataValue =
    | string
    | number
    | boolean
    | null

type TelemetryMetadata = Record<
    string,
    TelemetryMetadataValue
>

type ClientErrorPayload = {
    organisationId: string | null
    message: string
    errorName: string | null
    stack: string | null
    route: string
    component: string
    correlationId: string
    userAgent: string
    metadata: TelemetryMetadata
}

const correlationId =
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `thq-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`

let activeContext: TelemetryContext = {
    organisationId: null,
    component: 'TournamentHQ',
}

const recentFingerprints =
    new Map<string, number>()

function isProductionBrowser(): boolean {
    if (typeof window === 'undefined') {
        return false
    }

    const hostname =
        window.location.hostname.toLowerCase()

    return (
        hostname !== 'localhost' &&
        hostname !== '127.0.0.1' &&
        hostname !== '::1'
    )
}

function truncate(
    value: string,
    maxLength: number,
): string {
    return value.length <= maxLength
        ? value
        : value.slice(0, maxLength)
}

function normaliseError(
    error: unknown,
): {
    errorName: string | null
    message: string
    stack: string | null
} {
    if (error instanceof Error) {
        return {
            errorName:
                truncate(error.name, 120),
            message:
                truncate(error.message, 1000),
            stack: error.stack
                ? truncate(error.stack, 5000)
                : null,
        }
    }

    if (typeof error === 'string') {
        return {
            errorName: null,
            message: truncate(error, 1000),
            stack: null,
        }
    }

    return {
        errorName: null,
        message: 'Unknown client error',
        stack: null,
    }
}

function shouldSend(
    payload: ClientErrorPayload,
): boolean {
    const fingerprint = [
        payload.organisationId ?? 'none',
        payload.component,
        payload.message,
        payload.stack?.slice(0, 240) ?? '',
    ].join('|')

    const now = Date.now()
    const previous =
        recentFingerprints.get(fingerprint)

    if (
        previous !== undefined &&
        now - previous < 30_000
    ) {
        return false
    }

    recentFingerprints.set(
        fingerprint,
        now,
    )

    if (recentFingerprints.size > 100) {
        for (
            const [key, timestamp]
            of recentFingerprints
        ) {
            if (now - timestamp > 60_000) {
                recentFingerprints.delete(key)
            }
        }
    }

    return true
}

async function sendTelemetry(
    payload: ClientErrorPayload,
): Promise<void> {
    if (
        !isProductionBrowser() ||
        !shouldSend(payload)
    ) {
        return
    }

    try {
        const {
            error,
        } = await supabase.functions.invoke(
            'log-client-error',
            {
                body: payload,
            },
        )

        if (error) {
            console.warn(
                'TournamentHQ production telemetry could not be recorded.',
            )
        }
    } catch {
        // Telemetry is deliberately best-effort and must never interrupt
        // the user workflow that it is observing.
    }
}

export async function captureProductionIssue(
    message: string,
    error: unknown,
    metadata: TelemetryMetadata = {},
): Promise<void> {
    const normalised =
        normaliseError(error)

    await sendTelemetry({
        organisationId:
            activeContext.organisationId,
        message:
            truncate(
                message || normalised.message,
                1000,
            ),
        errorName:
            normalised.errorName,
        stack:
            normalised.stack,
        route:
            typeof window === 'undefined'
                ? ''
                : truncate(
                      window.location.pathname,
                      500,
                  ),
        component:
            truncate(
                activeContext.component,
                160,
            ),
        correlationId,
        userAgent:
            typeof navigator === 'undefined'
                ? ''
                : truncate(
                      navigator.userAgent,
                      500,
                  ),
        metadata,
    })
}

export function installProductionTelemetry(
    context: TelemetryContext,
): () => void {
    activeContext = context

    if (
        typeof window === 'undefined' ||
        !isProductionBrowser()
    ) {
        return () => undefined
    }

    const handleError = (
        event: ErrorEvent,
    ) => {
        void captureProductionIssue(
            event.message ||
                'Unhandled browser error',
            event.error,
            {
                eventType: 'window.error',
            },
        )
    }

    const handleUnhandledRejection = (
        event: PromiseRejectionEvent,
    ) => {
        void captureProductionIssue(
            'Unhandled promise rejection',
            event.reason,
            {
                eventType:
                    'unhandledrejection',
            },
        )
    }

    window.addEventListener(
        'error',
        handleError,
    )
    window.addEventListener(
        'unhandledrejection',
        handleUnhandledRejection,
    )

    return () => {
        window.removeEventListener(
            'error',
            handleError,
        )
        window.removeEventListener(
            'unhandledrejection',
            handleUnhandledRejection,
        )
    }
}
