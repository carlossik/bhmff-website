export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
        'authorization, x-client-info, apikey, content-type, stripe-signature',
}

export class HttpError extends Error {
    readonly status: number

    constructor(status: number, message: string) {
        super(message)
        this.name = 'HttpError'
        this.status = status
    }
}

export function jsonResponse(
    body: Record<string, unknown>,
    status = 200,
): Response {
    return new Response(
        JSON.stringify(body),
        {
            status,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
            },
        },
    )
}

export function errorResponse(error: unknown): Response {
    if (error instanceof HttpError) {
        return jsonResponse(
            { error: error.message },
            error.status,
        )
    }

    const message =
        error instanceof Error
            ? error.message
            : 'Unexpected TournamentHQ server error.'

    console.error('TournamentHQ Edge Function error:', error)

    return jsonResponse(
        { error: message },
        500,
    )
}
