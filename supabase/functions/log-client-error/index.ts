import {
    corsHeaders,
    errorResponse,
    HttpError,
    jsonResponse,
} from '../_shared/http.ts'
import {
    requireOrganisationMember,
} from '../_shared/auth.ts'
import {
    recordOperationsEvent,
} from '../_shared/operationsLog.ts'

type ClientErrorRequest = {
    organisationId: string | null
    message: string
    errorName: string | null
    stack: string | null
    route: string
    component: string
    correlationId: string
    userAgent: string
    metadata: Record<
        string,
        string | number | boolean | null
    >
}

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null
    )
}

function optionalText(
    value: unknown,
    maxLength: number,
): string | null {
    if (value === null || value === undefined) {
        return null
    }

    if (typeof value !== 'string') {
        throw new HttpError(
            400,
            'Invalid telemetry payload.',
        )
    }

    return value
        .trim()
        .slice(0, maxLength)
}

function requiredText(
    value: unknown,
    fieldName: string,
    maxLength: number,
): string {
    if (typeof value !== 'string') {
        throw new HttpError(
            400,
            `${fieldName} is required.`,
        )
    }

    const trimmed =
        value.trim()

    if (!trimmed) {
        throw new HttpError(
            400,
            `${fieldName} is required.`,
        )
    }

    return trimmed.slice(0, maxLength)
}

function parseMetadata(
    value: unknown,
): Record<
    string,
    string | number | boolean | null
> {
    if (!isRecord(value)) {
        return {}
    }

    const output: Record<
        string,
        string | number | boolean | null
    > = {}

    Object.entries(value)
        .slice(0, 20)
        .forEach(([key, item]) => {
            const safeKey =
                key.trim().slice(0, 80)

            if (!safeKey) {
                return
            }

            if (
                typeof item === 'string'
            ) {
                output[safeKey] =
                    item.slice(0, 500)
                return
            }

            if (
                typeof item === 'number' &&
                Number.isFinite(item)
            ) {
                output[safeKey] = item
                return
            }

            if (typeof item === 'boolean') {
                output[safeKey] = item
                return
            }

            if (item === null) {
                output[safeKey] = null
            }
        })

    return output
}

function parseRequest(
    value: unknown,
): ClientErrorRequest {
    if (!isRecord(value)) {
        throw new HttpError(
            400,
            'Invalid telemetry payload.',
        )
    }

    const organisationId =
        optionalText(
            value.organisationId,
            80,
        )

    if (!organisationId) {
        throw new HttpError(
            400,
            'Organisation ID is required.',
        )
    }

    return {
        organisationId,
        message: requiredText(
            value.message,
            'Message',
            1000,
        ),
        errorName: optionalText(
            value.errorName,
            120,
        ),
        stack: optionalText(
            value.stack,
            5000,
        ),
        route:
            optionalText(
                value.route,
                500,
            ) ?? '',
        component:
            optionalText(
                value.component,
                160,
            ) ?? 'TournamentHQ',
        correlationId:
            optionalText(
                value.correlationId,
                255,
            ) ?? '',
        userAgent:
            optionalText(
                value.userAgent,
                500,
            ) ?? '',
        metadata:
            parseMetadata(value.metadata),
    }
}

Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', {
            headers: corsHeaders,
        })
    }

    if (request.method !== 'POST') {
        return jsonResponse(
            { error: 'Method not allowed.' },
            405,
        )
    }

    try {
        const body =
            parseRequest(
                await request.json(),
            )

        const {
            admin,
            user,
        } = await requireOrganisationMember(
            request,
            body.organisationId,
        )

        await recordOperationsEvent(
            {
                source: 'client',
                category: 'ui',
                eventType: 'client.error',
                severity: 'error',
                processingStatus: 'failed',
                organisationId:
                    body.organisationId,
                userId: user.id,
                correlationId:
                    body.correlationId || null,
                message: body.message,
                details: {
                    errorName:
                        body.errorName,
                    stack:
                        body.stack,
                    route:
                        body.route,
                    component:
                        body.component,
                    userAgent:
                        body.userAgent,
                    ...body.metadata,
                },
            },
            admin,
        )

        return jsonResponse({
            recorded: true,
        })
    } catch (error) {
        return errorResponse(error)
    }
})
