import { useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { Modal } from '../../common/Modal'
import { Toast } from '../../common/Toast'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import type { DbTeam } from './teamTypes'
import { TeamsTable } from './TeamsTable'


type TeamsManagerProps = {
    teams: DbTeam[]
    onTeamCreated: () => void
}

export function TeamsManager({ teams, onTeamCreated }: TeamsManagerProps) {
    const [showAddModal, setShowAddModal] = useState(false)
    const [editingTeam, setEditingTeam] = useState<DbTeam | null>(null)
    const [teamToDelete, setTeamToDelete] = useState<DbTeam | null>(null)

    const [teamName, setTeamName] = useState('')
    const [managerName, setManagerName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [notes, setNotes] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [toastMessage, setToastMessage] = useState('')
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')

    function resetForm() {
        setEditingTeam(null)
        setTeamName('')
        setManagerName('')
        setEmail('')
        setPhone('')
        setNotes('')
    }

    function openAddTeamModal() {
        resetForm()
        setShowAddModal(true)
    }

    function openEditTeamModal(team: DbTeam) {
        setEditingTeam(team)
        setTeamName(team.name)
        setManagerName(team.manager_name ?? '')
        setEmail(team.contact_email ?? '')
        setPhone(team.contact_phone ?? '')
        setNotes(team.notes ?? '')
        setShowAddModal(true)
    }

    function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
        setToastMessage(message)
        setToastType(type)
    }

    async function saveTeam() {
        if (!teamName.trim()) {
            showToast('Team name is required.', 'error')
            return
        }

        setIsSaving(true)

        const payload = {
            name: teamName.trim(),
            manager_name: managerName.trim() || null,
            contact_email: email.trim() || null,
            contact_phone: phone.trim() || null,
            notes: notes.trim() || null,
        }

        const { error } = editingTeam
            ? await supabase.from('teams').update(payload).eq('id', editingTeam.id)
            : await supabase.from('teams').insert(payload)

        setIsSaving(false)

        if (error) {
            showToast(error.message, 'error')
            return
        }

        await onTeamCreated()
        resetForm()
        setShowAddModal(false)
        showToast(editingTeam ? 'Team updated successfully.' : 'Team created successfully.', 'success')
    }

    async function deleteTeam() {
        if (!teamToDelete) return

        const { error } = await supabase
            .from('teams')
            .delete()
            .eq('id', teamToDelete.id)

        if (error) {
            showToast(error.message, 'error')
            return
        }

        setTeamToDelete(null)
        await onTeamCreated()
        showToast('Team deleted successfully.', 'success')
    }

    return (
        <div>
            <Toast
                message={toastMessage}
                type={toastType}
                onClose={() => setToastMessage('')}
            />

            <div className="adminWorkspaceHeader">
                <div>
                    <h3>Teams</h3>
                    <p className="muted">
                        Manage participating clubs for the Black History Month Football Festival.
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

            {showAddModal && (
                <Modal
                    title={editingTeam ? 'Edit Team' : 'Add Team'}
                    onClose={() => {
                        resetForm()
                        setShowAddModal(false)
                    }}
                >
                    <div className="adminFormGrid">
                        <label>
                            <span>Team Name</span>
                            <input
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                            />
                        </label>

                        <label>
                            <span>Manager Name</span>
                            <input
                                value={managerName}
                                onChange={(e) => setManagerName(e.target.value)}
                            />
                        </label>

                        <label>
                            <span>Email</span>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </label>

                        <label>
                            <span>Phone</span>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </label>

                        <label>
                            <span>Notes</span>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </label>

                        <div className="modalActions">
                            <button
                                className="btn secondary"
                                type="button"
                                onClick={() => {
                                    resetForm()
                                    setShowAddModal(false)
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                className="btn primary"
                                type="button"
                                onClick={saveTeam}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : editingTeam ? 'Update' : 'Save'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {teamToDelete && (
                <ConfirmDialog
                    title="Delete Team"
                    message={`Are you sure you want to delete ${teamToDelete.name}?`}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onCancel={() => setTeamToDelete(null)}
                    onConfirm={deleteTeam}
                />
            )}
        </div>
    )
}