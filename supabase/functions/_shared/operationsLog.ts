import type {
    SupabaseClient,
} from 'npm:@supabase/supabase-js@2'

import {
    createAdminClient,
} from './auth.ts'

export type OperationsEventSource =
    | 'stripe_webhook'
    | 'client'
    | 'edge_function'
    | 'system'

export type OperationsEventSeverity =
    | 'info'
    | 'warning'
    | 'error'
    | 'critical'

export type OperationsProcessingStatus =
    | 'received'
    | 'processed'
    | 'failed'
    | 'recovered'

export type OperationsEventInput = {
    source: OperationsEventSource
    category: string
    eventType: string
    severity: OperationsEventSeverity
    processingStatus: OperationsProcessingStatus
    organisationId?: string | null
    userId?: string | null
    externalId?: string | null
    correlationId?: string | null
    message: string
    details?: Record<string, unknown>
    durationMs?: number | null
    occurredAt?: string
}

function trimText(
    value: string,
    maxLength: number,
): string {
    return value.length <= maxLength
        ? value
        : value.slice(0, maxLength)
}

export async function recordOperationsEvent(
    input: OperationsEventInput,
    client?: SupabaseClient,
): Promise<void> {
    const admin =
        client ?? createAdminClient()

    const {
        error,
    } = await admin
        .from('platform_operations_events')
        .insert({
            source: input.source,
            category:
                trimText(input.category, 80),
            event_type:
                trimText(input.eventType, 160),
            severity: input.severity,
            processing_status:
                input.processingStatus,
            organisation_id:
                input.organisationId ?? null,
            user_id:
                input.userId ?? null,
            external_id:
                input.externalId
                    ? trimText(
                          input.externalId,
                          255,
                      )
                    : null,
            correlation_id:
                input.correlationId
                    ? trimText(
                          input.correlationId,
                          255,
                      )
                    : null,
            message:
                trimText(input.message, 1200),
            details:
                input.details ?? {},
            duration_ms:
                input.durationMs ?? null,
            occurred_at:
                input.occurredAt ??
                new Date().toISOString(),
        })

    if (error) {
        // Operational logging must never break the production workflow
        // that it is trying to observe.
        console.error(
            'TournamentHQ operational event logging failed:',
            error.message,
        )
    }
}
