import { supabase } from '../../../lib/supabaseClient'

const BUCKET = 'team-logos'

export async function uploadTeamLogo(file: File) {
    const extension = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${extension}`

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, file)

    if (error) {
        throw error
    }

    const { data } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(fileName)

    return data.publicUrl
}

export async function deleteTeamLogo(publicUrl: string) {
    if (!publicUrl) return

    const fileName = publicUrl.split('/').pop()

    if (!fileName) return

    await supabase.storage
        .from(BUCKET)
        .remove([fileName])
}

export async function replaceTeamLogo(
    file: File,
    existingLogo?: string | null
) {
    if (existingLogo) {
        await deleteTeamLogo(existingLogo)
    }

    return uploadTeamLogo(file)
}