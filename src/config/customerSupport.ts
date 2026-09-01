export const TOURNAMENTHQ_SUPPORT_EMAIL = 'support@tournamenthq.co.uk'

export const TOURNAMENTHQ_SUPPORT_NAME = 'TournamentHQ Support'

type SupportContext =
    | 'admin'
    | 'signup'
    | 'onboarding'

const supportSubjects: Record<SupportContext, string> = {
    admin: 'TournamentHQ admin portal support',
    signup: 'TournamentHQ signup support',
    onboarding: 'TournamentHQ onboarding support',
}

const supportBody = [
    'Hi TournamentHQ Support,',
    '',
    'I need help with:',
    '',
    'Page or screen:',
    'What I expected:',
    'What happened:',
    '',
    'Screenshots or extra details:',
].join('\n')

export function createTournamentHqSupportMailto(
    context: SupportContext = 'admin',
): string {
    const params = new URLSearchParams({
        subject: supportSubjects[context],
        body: supportBody,
    })

    return `mailto:${TOURNAMENTHQ_SUPPORT_EMAIL}?${params.toString()}`
}
