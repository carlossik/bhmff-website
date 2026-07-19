import {
    useEffect,
    useState,
} from 'react'
import { useOrganisation } from '../../../context/OrganisationContext'
import { useCompetition } from '../../../contexts/CompetitionContext'
import { Toast } from '../../common/Toast'
import { ConfirmDialog } from '../../common/ConfirmDialog'
import { CompetitionTeamsTable } from './CompetitionTeamsTable'
import { CompetitionTeamModal } from './CompetitionTeamModal'
import { competitionTeamService } from './competitionTeamService'
import type {
    CompetitionTeam,
    CompetitionTeamForm,
    GroupOption,
    TeamOption,
} from './competitionTeamTypes'

const emptyForm: CompetitionTeamForm = {
    team_id: '',
    group_id: '',
    squad_number: '',
    seed: '',
    status: 'invited',
    published: false,
}

export function CompetitionTeamsManager() {
    const { currentOrganisation } =
        useOrganisation()

    const {
        currentCompetitionId,
    } = useCompetition()

    const [
        competitionTeams,
        setCompetitionTeams,
    ] = useState<CompetitionTeam[]>([])

    const [teams, setTeams] =
        useState<TeamOption[]>([])

    const [groups, setGroups] =
        useState<GroupOption[]>([])

    const [form, setForm] =
        useState(emptyForm)

    const [editing, setEditing] =
        useState<CompetitionTeam | null>(null)

    const [showModal, setShowModal] =
        useState(false)

    const [deleteItem, setDeleteItem] =
        useState<CompetitionTeam | null>(null)

    const [isSaving, setIsSaving] =
        useState(false)

    const [toast, setToast] =
        useState('')

    async function loadData() {
        if (!currentCompetitionId) return

        const [
            loadedTeams,
            loadedGroups,
            loadedCompetitionTeams,
        ] = await Promise.all([
            competitionTeamService.getAvailableTeams(
                currentOrganisation.id
            ),
            competitionTeamService.getGroups(
                currentCompetitionId
            ),
            competitionTeamService.getCompetitionTeams(
                currentCompetitionId
            ),
        ])

        setTeams(loadedTeams)
        setGroups(loadedGroups)
        setCompetitionTeams(
            loadedCompetitionTeams
        )
    }

    useEffect(() => {
        void loadData()
    }, [currentCompetitionId])

    function openCreate() {
        setEditing(null)
        setForm(emptyForm)
        setShowModal(true)
    }

    function openEdit(
        item: CompetitionTeam
    ) {
        setEditing(item)

        setForm({
            team_id: item.team_id,
            group_id:
                item.group_id ?? '',
            squad_number:
                item.squad_number?.toString() ??
                '',
            seed:
                item.seed?.toString() ??
                '',
            status: item.status,
            published: item.published,
        })

        setShowModal(true)
    }

    function closeModal() {
        setEditing(null)
        setForm(emptyForm)
        setShowModal(false)
    }

    function updateField(
        field: keyof CompetitionTeamForm,
        value: string | boolean
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }))
    }

    async function save() {
        if (!currentCompetitionId) {
            return
        }

        if (!form.team_id) {
            setToast(
                'Please select a team.'
            )
            return
        }

        setIsSaving(true)

        try {
            if (editing) {
                await competitionTeamService.update(
                    editing.id,
                    form
                )
            } else {
                await competitionTeamService.create(
                    currentOrganisation.id,
                    currentCompetitionId,
                    form
                )
            }

            await loadData()

            closeModal()

            setToast(
                editing
                    ? 'Competition Team updated.'
                    : 'Competition Team added.'
            )
        } finally {
            setIsSaving(false)
        }
    }

    async function remove() {
        if (!deleteItem) return

        await competitionTeamService.remove(
            deleteItem.id
        )

        setDeleteItem(null)

        await loadData()

        setToast(
            'Competition Team removed.'
        )
    }

    if (!currentCompetitionId) {
        return (
            <div className="teamsEmptyState">
                <h3>
                    No Competition Selected
                </h3>

                <p>
                    Select a competition
                    first.
                </p>
            </div>
        )
    }

    return (
        <>
            <Toast
                message={toast}
                type="success"
                onClose={() =>
                    setToast('')
                }
            />

            <div className="adminWorkspaceHeader">
                <div>
                    <h3>
                        Competition Teams
                    </h3>

                    <p className="muted">
                        Select which teams
                        participate in this
                        competition.
                    </p>
                </div>

                <button
                    className="btn primary"
                    onClick={openCreate}
                >
                    + Add Team
                </button>
            </div>

            <CompetitionTeamsTable
                competitionTeams={
                    competitionTeams
                }
                onEdit={openEdit}
                onDelete={
                    setDeleteItem
                }
            />

            {showModal && (
                <CompetitionTeamModal
                    mode={
                        editing
                            ? 'edit'
                            : 'create'
                    }
                    form={form}
                    teams={teams}
                    groups={groups}
                    isSaving={isSaving}
                    onChange={
                        updateField
                    }
                    onClose={
                        closeModal
                    }
                    onSave={save}
                />
            )}

            {deleteItem && (
                <ConfirmDialog
                    title="Remove Team"
                    message={`Remove ${deleteItem.team?.name} from this competition?`}
                    confirmText="Remove"
                    cancelText="Cancel"
                    onCancel={() =>
                        setDeleteItem(
                            null
                        )
                    }
                    onConfirm={remove}
                />
            )}
        </>
    )
}