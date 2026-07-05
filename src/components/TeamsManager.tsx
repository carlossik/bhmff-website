import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Modal } from './common/Modal'
import { Toast } from './common/Toast'
type DbTeam = {
    id: string
    name: string
    manager_name: string | null
    contact_email: string | null
    contact_phone: string | null
    notes: string | null
}

type TeamsManagerProps = {
    teams: DbTeam[]
    onTeamCreated: () => void
}

export function TeamsManager({ teams, onTeamCreated }: TeamsManagerProps) {
    const [showAddModal, setShowAddModal] = useState(false)

    const [teamName, setTeamName] = useState('')
    const [managerName, setManagerName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [notes, setNotes] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [toastMessage, setToastMessage] = useState('')

    async function saveTeam() {
        if (!teamName.trim()) {
            setToastMessage('Team name is required.')
            return
        }
        setIsSaving(true)
        const { error } = await supabase.from('teams').insert({
            name: teamName,
            manager_name: managerName,
            contact_email: email,
            contact_phone: phone,
            notes
        })

        if (error) {
            alert(error.message)
            return
        }
        onTeamCreated()

        setTeamName('')
        setManagerName('')
        setEmail('')
        setPhone('')
        setNotes('')

        setShowAddModal(false)


        setIsSaving(false)
    }

    return (
        <div>
            <Toast
                message={toastMessage}
                type="error"
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
                    onClick={() => setShowAddModal(true)}
                >
                    + Add Team
                </button>
            </div>

            <table className="adminTable">
                <thead>
                <tr>
                    <th>Team</th>
                    <th>Manager</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th></th>
                </tr>
                </thead>

                <tbody>
                {teams.map((team) => (
                    <tr key={team.id}>
                        <td>{team.name}</td>
                        <td>{team.manager_name ?? '-'}</td>
                        <td>{team.contact_email ?? '-'}</td>
                        <td>{team.contact_phone ?? '-'}</td>
                        <td>
                            <button className="btn secondary small">
                                Edit
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
            {showAddModal && (
                <Modal
                    title="Add Team"
                    onClose={() => setShowAddModal(false)}
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
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancel
                            </button>

                            <button
                                className="btn primary"
                                type="button"
                                onClick={saveTeam}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving Team...' : 'Save Team'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}