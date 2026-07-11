import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { Toast } from '../../common/Toast'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { TeamModal } from './TeamModal'
import { TeamsTable } from './TeamsTable'
import {
    deleteTeamLogo,
    replaceTeamLogo,
} from './teamService'
import type { DbTeam } from './teamTypes'

type TeamsManagerProps = {
    teams: DbTeam[]
    onTeamCreated: () => void
}

export function TeamsManager({
                                 teams,
                                 onTeamCreated,
                             }: TeamsManagerProps) {
    const [showTeamModal, setShowTeamModal] = useState(false)

    const [editingTeam, setEditingTeam] =
        useState<DbTeam | null>(null)

    const [teamToDelete, setTeamToDelete] =
        useState<DbTeam | null>(null)

    const [teamName, setTeamName] = useState('')
    const [managerName, setManagerName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [notes, setNotes] = useState('')

    const [logoUrl, setLogoUrl] = useState('')
    const [selectedLogo, setSelectedLogo] =
        useState<File | null>(null)

    const [isSaving, setIsSaving] = useState(false)

    const [toastMessage, setToastMessage] =
        useState('')

    const [toastType, setToastType] =
        useState<'success' | 'error' | 'info'>(
            'success'
        )

    function showToast(
        message: string,
        type: 'success' | 'error' | 'info' = 'success'
    ) {
        setToastMessage(message)
        setToastType(type)
    }

    function resetForm() {
        setEditingTeam(null)
        setTeamName('')
        setManagerName('')
        setEmail('')
        setPhone('')
        setNotes('')
        setLogoUrl('')
        setSelectedLogo(null)
    }

    function closeTeamModal() {
        resetForm()
        setShowTeamModal(false)
    }

    function openAddTeamModal() {
        resetForm()
        setShowTeamModal(true)
    }

    function openEditTeamModal(team: DbTeam) {
        setEditingTeam(team)
        setTeamName(team.name)
        setManagerName(team.manager_name ?? '')
        setEmail(team.contact_email ?? '')
        setPhone(team.contact_phone ?? '')
        setNotes(team.notes ?? '')
        setLogoUrl(team.logo_url ?? '')
        setSelectedLogo(null)
        setShowTeamModal(true)
    }

    async function getActiveFestivalId() {
        const { data, error } = await supabase
            .from('festivals')
            .select('id')
            .eq('status', 'active')
            .order('year', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            throw new Error(error.message)
        }

        return data?.id ?? null
    }

    async function saveTeam() {
        if (!teamName.trim()) {
            showToast(
                'Team name is required.',
                'error'
            )
            return
        }

        setIsSaving(true)

        try {
            let finalLogoUrl = logoUrl

            if (selectedLogo) {
                finalLogoUrl =
                    await replaceTeamLogo(
                        selectedLogo,
                        editingTeam?.logo_url
                    )
            }

            const payload = {
                name: teamName.trim(),
                manager_name:
                    managerName.trim() || null,
                contact_email:
                    email.trim() || null,
                contact_phone:
                    phone.trim() || null,
                logo_url:
                    finalLogoUrl || null,
                notes:
                    notes.trim() || null,
            }

            if (editingTeam) {
                const { error } = await supabase
                    .from('teams')
                    .update(payload)
                    .eq('id', editingTeam.id)

                if (error) {
                    throw new Error(error.message)
                }
            } else {
                const festivalId =
                    await getActiveFestivalId()

                if (!festivalId) {
                    throw new Error(
                        'No active festival was found.'
                    )
                }

                const { error } = await supabase
                    .from('teams')
                    .insert({
                        ...payload,
                        festival_id: festivalId,
                    })

                if (error) {
                    throw new Error(error.message)
                }
            }

            const wasEditing =
                Boolean(editingTeam)

            await onTeamCreated()
            closeTeamModal()

            showToast(
                wasEditing
                    ? 'Team updated successfully.'
                    : 'Team created successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to save team.',
                'error'
            )
        } finally {
            setIsSaving(false)
        }
    }

    async function deleteTeam() {
        if (!teamToDelete) return

        const team = teamToDelete

        try {
            const { error } = await supabase
                .from('teams')
                .delete()
                .eq('id', team.id)

            if (error) {
                throw new Error(error.message)
            }

            if (team.logo_url) {
                await deleteTeamLogo(
                    team.logo_url
                )
            }

            setTeamToDelete(null)
            await onTeamCreated()

            showToast(
                'Team deleted successfully.',
                'success'
            )
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : 'Failed to delete team.',
                'error'
            )
        }
    }

    return (
        <div>
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() =>
                    setToastMessage('')
                }
            />

            <div className="adminWorkspaceHeader">
                <div>
                    <h3>Teams</h3>

                    <p className="muted">
                        Manage participating clubs and
                        their official team logos.
                    </p>
                </div>

                <button
                    className="btn primary"
                    type="button"
                    onClick={openAddTeamModal}
                >
                    + Add Team
                </button>
            </div>

            <TeamsTable
                teams={teams}
                onEdit={openEditTeamModal}
                onDelete={setTeamToDelete}
            />

            {showTeamModal && (
                <TeamModal
                    mode={
                        editingTeam
                            ? 'edit'
                            : 'create'
                    }
                    teamName={teamName}
                    managerName={managerName}
                    email={email}
                    phone={phone}
                    notes={notes}
                    logoUrl={logoUrl}
                    isSaving={isSaving}
                    onTeamNameChange={
                        setTeamName
                    }
                    onManagerNameChange={
                        setManagerName
                    }
                    onEmailChange={setEmail}
                    onPhoneChange={setPhone}
                    onNotesChange={setNotes}
                    onLogoSelected={
                        setSelectedLogo
                    }
                    onClose={closeTeamModal}
                    onSave={saveTeam}
                />
            )}

            {teamToDelete && (
                <ConfirmDialog
                    title="Delete Team"
                    message={`Are you sure you want to delete ${teamToDelete.name}?`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onCancel={() =>
                        setTeamToDelete(null)
                    }
                    onConfirm={deleteTeam}
                />
            )}
        </div>
    )
}