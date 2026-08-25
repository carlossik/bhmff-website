import {
    supabase,
} from '../lib/supabaseClient'

import type {
    CommunicationDirectoryRecipient,
    CommunicationHistoryItem,
    CommunicationProviderStatus,
    CommunicationTemplate,
    SendCommunicationInput,
    SendCommunicationResult,
} from '../types/communicationTypes'

type FunctionErrorResponse = {
    error?: unknown
}

type StatusResponse = {
    providers: CommunicationProviderStatus[]
}

type TemplatesResponse = {
    templates: CommunicationTemplate[]
}

type HistoryResponse = {
    history: CommunicationHistoryItem[]
}

type RecipientDirectoryResponse = {
    recipients: CommunicationDirectoryRecipient[]
}

class CommunicationsTransportError extends Error {
    constructor() {
        super('TournamentHQ Communications is temporarily unavailable.')
        this.name = 'CommunicationsTransportError'
    }
}

function responseError(
    data: FunctionErrorResponse | null,
    fallback: string,
): string {
    return data && typeof data.error === 'string'
        ? data.error
        : fallback
}

async function invoke<T>(
    body: Record<string, unknown>,
): Promise<T> {
    const { data, error } =
        await supabase.functions.invoke<T & FunctionErrorResponse>(
            'communications',
            { body },
        )

    if (error) {
        const context =
            'context' in error
                ? error.context
                : null

        if (context instanceof Response) {
            try {
                const payload =
                    await context.clone().json() as FunctionErrorResponse

                if (typeof payload.error === 'string') {
                    throw new Error(payload.error)
                }
            } catch (contextError) {
                if (
                    contextError instanceof Error &&
                    contextError.name === 'Error'
                ) {
                    throw contextError
                }
            }
        }

        console.error(
            'TournamentHQ Communications function failed:',
            error,
        )

        throw new CommunicationsTransportError()
    }

    if (!data) {
        throw new Error(
            'TournamentHQ Communications returned no data.',
        )
    }

    if (typeof data.error === 'string') {
        throw new Error(
            responseError(
                data,
                'TournamentHQ Communications request failed.',
            ),
        )
    }

    return data
}

async function invokeRead<T>(
    body: Record<string, unknown>,
): Promise<T> {
    try {
        return await invoke<T>(body)
    } catch (caughtError) {
        if (!(caughtError instanceof CommunicationsTransportError)) {
            throw caughtError
        }

        await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 350)
        })

        return invoke<T>(body)
    }
}

export const communicationsService = {
    async getProviderStatus(
        organisationId: string,
    ): Promise<CommunicationProviderStatus[]> {
        const response = await invokeRead<StatusResponse>({
            action: 'provider_status',
            organisationId,
        })

        return response.providers
    },

    async getTemplates(
        organisationId: string,
    ): Promise<CommunicationTemplate[]> {
        const response = await invokeRead<TemplatesResponse>({
            action: 'list_templates',
            organisationId,
        })

        return response.templates
    },

    async getRecipientDirectory(
        organisationId: string,
    ): Promise<CommunicationDirectoryRecipient[]> {
        const response = await invokeRead<RecipientDirectoryResponse>({
            action: 'recipient_directory',
            organisationId,
        })

        return response.recipients
    },

    async getHistory(
        organisationId: string,
        limit = 50,
    ): Promise<CommunicationHistoryItem[]> {
        const response = await invokeRead<HistoryResponse>({
            action: 'history',
            organisationId,
            limit,
        })

        return response.history
    },

    async send(
        input: SendCommunicationInput,
    ): Promise<SendCommunicationResult> {
        return invoke<SendCommunicationResult>({
            action: 'send',
            ...input,
        })
    },
}
