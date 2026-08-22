import {
    useEffect,
    useMemo,
    useState,
} from 'react'
import {
    Mail,
    MessageCircle,
    MessagesSquare,
    Send,
    Smartphone,
    X,
} from 'lucide-react'

import { communicationsService } from '../../../services/communicationsService'
import type {
    CommunicationChannel,
    CommunicationProviderStatus,
    CommunicationRecipientDraft,
    CommunicationTemplate,
    SendCommunicationResult,
} from '../../../types/communicationTypes'

export type CommunicationComposerModalProps = {
    open: boolean
    organisationId: string
    organisationName: string
    recipients: CommunicationRecipientDraft[]
    defaultTemplateCode?: string | null
    sourceType?: string | null
    sourceId?: string | null
    title?: string
    initialMessageBody?: string
    onClose: () => void
    onSent?: (result: SendCommunicationResult) => void
}

const channelOrder: readonly CommunicationChannel[] = [
    'email',
    'whatsapp',
    'sms',
]

const channelMeta: Record<
    CommunicationChannel,
    {
        label: string
        icon: typeof Mail
        contactLabel: string
    }
> = {
    email: {
        label: 'Email',
        icon: Mail,
        contactLabel: 'email address',
    },
    whatsapp: {
        label: 'WhatsApp',
        icon: MessageCircle,
        contactLabel: 'mobile number',
    },
    sms: {
        label: 'SMS',
        icon: Smartphone,
        contactLabel: 'mobile number',
    },
}

function renderTemplate(
    template: string | null,
    variables: Record<string, string>,
): string {
    if (!template) return ''

    return template.replace(
        /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
        (_match, key: string) =>
            variables[key] ?? '',
    )
}

function firstName(value: string): string {
    return value.trim().split(/\s+/)[0] ?? value.trim()
}

function variableStrings(
    recipient: CommunicationRecipientDraft,
    organisationName: string,
    messageBody: string,
): Record<string, string> {
    const extra = Object.fromEntries(
        Object.entries(recipient.variables ?? {}).map(
            ([key, value]) => [
                key,
                value === null || value === undefined
                    ? ''
                    : String(value),
            ],
        ),
    )

    return {
        organisation_name: organisationName,
        recipient_name: recipient.recipientName,
        recipient_first_name:
            firstName(recipient.recipientName),
        message_body: messageBody,
        ...extra,
    }
}

function recipientHasChannel(
    channel: CommunicationChannel,
    recipient: CommunicationRecipientDraft,
): boolean {
    if (channel === 'email') {
        return Boolean(recipient.email?.trim())
    }

    if (channel === 'whatsapp') {
        return Boolean(
            recipient.whatsappPhone?.trim() ||
            recipient.phone?.trim(),
        )
    }

    return Boolean(recipient.phone?.trim())
}

function coverageCount(
    channel: CommunicationChannel,
    recipients: CommunicationRecipientDraft[],
): number {
    return recipients.filter((recipient) =>
        recipientHasChannel(channel, recipient),
    ).length
}

function isLiveProvider(
    provider: CommunicationProviderStatus | undefined,
): boolean {
    return Boolean(
        provider?.configured &&
        !provider.dryRun &&
        provider.provider !== 'mock' &&
        provider.provider !== 'unconfigured',
    )
}

function templateDisplayName(
    template: CommunicationTemplate,
): string {
    if (template.code === 'general_operational_message') {
        return 'General message'
    }

    return template.name
}

export function CommunicationComposerModal({
    open,
    organisationId,
    organisationName,
    recipients,
    defaultTemplateCode = null,
    sourceType = null,
    sourceId = null,
    title = 'Send message',
    initialMessageBody = '',
    onClose,
    onSent,
}: CommunicationComposerModalProps) {
    const [templates, setTemplates] =
        useState<CommunicationTemplate[]>([])
    const [providers, setProviders] =
        useState<CommunicationProviderStatus[]>([])
    const [templateCode, setTemplateCode] =
        useState(defaultTemplateCode ?? '')
    const [messageBody, setMessageBody] =
        useState(initialMessageBody)
    const [selectedChannel, setSelectedChannel] =
        useState<CommunicationChannel | null>(null)
    const [loading, setLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    useEffect(() => {
        if (!open) return

        setTemplateCode(defaultTemplateCode ?? '')
        setMessageBody(initialMessageBody)
        setSelectedChannel(null)
        setError(null)
        setSuccess(null)
        setLoading(true)

        void Promise.allSettled([
            communicationsService.getTemplates(
                organisationId,
            ),
            communicationsService.getProviderStatus(
                organisationId,
            ),
        ]).then(([templateResult, providerResult]) => {
            if (templateResult.status === 'fulfilled') {
                setTemplates(templateResult.value)
            } else {
                setTemplates([])
            }

            if (providerResult.status === 'fulfilled') {
                setProviders(providerResult.value)
            } else {
                setProviders([])
            }
        }).finally(() => {
            setLoading(false)
        })
    }, [
        defaultTemplateCode,
        initialMessageBody,
        open,
        organisationId,
    ])

    const selectedTemplate = useMemo(
        () => templates.find(
            (template) => template.code === templateCode,
        ) ?? null,
        [templateCode, templates],
    )

    const isGeneralMessage =
        defaultTemplateCode === 'general_operational_message' ||
        templateCode === 'general_operational_message'

    const previewVariables = useMemo(
        () => recipients.length > 0
            ? variableStrings(
                recipients[0],
                organisationName,
                messageBody || 'Your message will appear here.',
            )
            : {
                organisation_name: organisationName,
                recipient_name: 'Recipient',
                recipient_first_name: 'Recipient',
                message_body:
                    messageBody || 'Your message will appear here.',
            },
        [messageBody, organisationName, recipients],
    )

    const previewSubject = renderTemplate(
        selectedTemplate?.subjectTemplate ?? null,
        previewVariables,
    )

    const previewBody = selectedTemplate
        ? renderTemplate(
            selectedTemplate.bodyTemplate,
            previewVariables,
        )
        : messageBody.trim()

    function providerFor(
        channel: CommunicationChannel,
    ): CommunicationProviderStatus | undefined {
        return providers.find(
            (provider) => provider.channel === channel,
        )
    }

    function channelIsSelectable(
        channel: CommunicationChannel,
    ): boolean {
        const covered = coverageCount(
            channel,
            recipients,
        )

        if (covered === 0) return false

        const provider = providerFor(channel)

        // Email is already the proven live TournamentHQ channel. If the
        // status lookup is temporarily unavailable, keep Email usable but
        // do not expose SMS/WhatsApp until their provider is confirmed live.
        if (!provider) return channel === 'email'

        return isLiveProvider(provider)
    }

    function channelStatusText(
        channel: CommunicationChannel,
    ): string {
        const covered = coverageCount(
            channel,
            recipients,
        )
        const provider = providerFor(channel)
        const meta = channelMeta[channel]

        if (covered === 0) {
            return recipients.length === 1
                ? `No ${meta.contactLabel}`
                : `0/${recipients.length} players`
        }

        if (!provider && channel !== 'email') {
            return 'Not available yet'
        }

        if (provider && !isLiveProvider(provider)) {
            return 'Not available yet'
        }

        if (recipients.length === 1) {
            return `${meta.contactLabel} available`
        }

        return `${covered}/${recipients.length} players`
    }

    const selectedCoverage = selectedChannel
        ? coverageCount(selectedChannel, recipients)
        : 0

    async function send(): Promise<void> {
        if (recipients.length === 0) {
            setError('Add at least one recipient.')
            return
        }

        if (!selectedChannel) {
            setError('Choose how you want to send the message.')
            return
        }

        if (selectedCoverage === 0) {
            setError(
                `None of the selected recipients has the contact details required for ${channelMeta[selectedChannel].label}.`,
            )
            return
        }

        const selectedProvider = providerFor(selectedChannel)
        if (
            selectedProvider &&
            !isLiveProvider(selectedProvider)
        ) {
            setError(
                `${channelMeta[selectedChannel].label} is not available yet. Choose another method.`,
            )
            return
        }

        if (isGeneralMessage && !messageBody.trim()) {
            setError('Enter the message you want to send.')
            return
        }

        if (
            !isGeneralMessage &&
            templateCode &&
            !selectedTemplate
        ) {
            setError('The selected message template is unavailable.')
            return
        }

        setSending(true)
        setError(null)
        setSuccess(null)

        try {
            const result = await communicationsService.send({
                organisationId,
                templateCode:
                    selectedTemplate?.code ?? null,
                messageClass: 'service',
                sourceType,
                sourceId,
                routingMode: 'explicit',
                channels: [selectedChannel],
                recipients: recipients.map((recipient) => ({
                    ...recipient,
                    variables: {
                        ...(recipient.variables ?? {}),
                        ...(isGeneralMessage
                            ? { message_body: messageBody.trim() }
                            : {}),
                    },
                })),
                body:
                    !selectedTemplate && isGeneralMessage
                        ? messageBody.trim()
                        : null,
            })

            const unsuccessful =
                result.skipped + result.failed

            setSuccess(
                unsuccessful > 0
                    ? `${result.accepted} message${result.accepted === 1 ? '' : 's'} submitted by ${channelMeta[selectedChannel].label}. ${unsuccessful} recipient${unsuccessful === 1 ? '' : 's'} could not be sent. Delivery status will update in Message history.`
                    : `${result.accepted} message${result.accepted === 1 ? '' : 's'} submitted by ${channelMeta[selectedChannel].label}. Delivery status will update in Message history.`,
            )

            onSent?.(result)
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Unable to send the message.',
            )
        } finally {
            setSending(false)
        }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#07110b] shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-[#8cf566]/10 p-2.5 text-[#8cf566]">
                            <MessagesSquare className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8cf566]">
                                TournamentHQ Communications
                            </p>
                            <h2 className="mt-1 font-['Space_Grotesk'] text-2xl font-black text-white">
                                {title}
                            </h2>
                            <p className="mt-2 text-xs text-slate-400">
                                {recipients.length} recipient{recipients.length === 1 ? '' : 's'} · {organisationName}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={sending}
                        className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="space-y-5 p-5 sm:p-6">
                    {error && (
                        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
                            {success}
                        </div>
                    )}

                    {loading ? (
                        <div className="py-10 text-center text-sm font-semibold text-slate-400">
                            Preparing your message…
                        </div>
                    ) : (
                        <>
                            {!isGeneralMessage && (
                                <section>
                                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                        Message template
                                    </label>
                                    <select
                                        value={templateCode}
                                        onChange={(event) => {
                                            setTemplateCode(event.target.value)
                                            setError(null)
                                        }}
                                        className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1710] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-[#8cf566]/60"
                                    >
                                        <option value="">
                                            Select template
                                        </option>
                                        {templates.map((template) => (
                                            <option
                                                key={template.id}
                                                value={template.code}
                                            >
                                                {templateDisplayName(template)}
                                            </option>
                                        ))}
                                    </select>
                                </section>
                            )}

                            {isGeneralMessage && (
                                <section>
                                    <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                        Message
                                    </label>
                                    <textarea
                                        value={messageBody}
                                        onChange={(event) =>
                                            setMessageBody(event.target.value)
                                        }
                                        rows={5}
                                        maxLength={1600}
                                        placeholder="Write your message…"
                                        className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#0b1710] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-[#8cf566]/60"
                                    />
                                </section>
                            )}

                            <section>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                    Send by
                                </p>
                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                    {channelOrder.map((channel) => {
                                        const meta = channelMeta[channel]
                                        const Icon = meta.icon
                                        const selectable =
                                            channelIsSelectable(channel)
                                        const selected =
                                            selectedChannel === channel

                                        return (
                                            <button
                                                key={channel}
                                                type="button"
                                                disabled={!selectable}
                                                onClick={() => {
                                                    setSelectedChannel(channel)
                                                    setError(null)
                                                }}
                                                className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                                    selected
                                                        ? 'border-[#8cf566] bg-[#8cf566]/10'
                                                        : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon
                                                        className={`h-5 w-5 ${
                                                            selected
                                                                ? 'text-[#8cf566]'
                                                                : 'text-slate-400'
                                                        }`}
                                                    />
                                                    <span className="font-black text-white">
                                                        {meta.label}
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                                    {channelStatusText(channel)}
                                                </p>
                                            </button>
                                        )
                                    })}
                                </div>

                                {selectedChannel && recipients.length > 1 && (
                                    <p className="mt-3 text-xs leading-5 text-slate-400">
                                        {selectedCoverage} of {recipients.length} selected players can receive this message by {channelMeta[selectedChannel].label}.
                                    </p>
                                )}
                            </section>

                            {(selectedTemplate || isGeneralMessage) && (
                                <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                        Preview · first recipient
                                    </p>
                                    {previewSubject && (
                                        <p className="mt-3 text-sm font-black text-white">
                                            {previewSubject}
                                        </p>
                                    )}
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                                        {previewBody || 'Complete the message above to preview it here.'}
                                    </p>
                                </section>
                            )}
                        </>
                    )}
                </div>

                <footer className="flex flex-col-reverse gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center sm:justify-end sm:p-6">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={sending}
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => void send()}
                        disabled={
                            loading ||
                            sending ||
                            !selectedChannel ||
                            selectedCoverage === 0 ||
                            (
                                Boolean(providerFor(selectedChannel)) &&
                                !isLiveProvider(
                                    providerFor(selectedChannel),
                                )
                            )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#8cf566] px-5 py-2.5 text-sm font-black text-[#061008] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Send className="h-4 w-4" />
                        {sending ? 'Sending…' : 'Send message'}
                    </button>
                </footer>
            </div>
        </div>
    )
}
