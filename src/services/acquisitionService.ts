import { supabase } from '../lib/supabaseClient'

export const acquisitionService = {
    async markOnboardingCompleted(
        organisationId: string,
    ): Promise<void> {
        const { error } = await supabase.rpc(
            'mark_onboarding_complete',
            {
                p_organisation_id:
                    organisationId,
            },
        )

        if (error) {
            throw new Error(
                error.message ||
                    'Unable to record onboarding completion.',
            )
        }
    },
}
