import { formatAdminRole, type AdminProfile } from '../../services/accessControl'
import { useOrganisation } from '../../context/OrganisationContext'
import { CompetitionSelector } from './CompetitionSelector'

type AdminHeaderProps = {
    profile: AdminProfile
    onLogout: () => void
}

export function AdminHeader({
                                profile,
                                onLogout,
                            }: AdminHeaderProps) {
    const { currentOrganisation } =
        useOrganisation()

    return (
        <div className="adminHeader">
            <div className="adminHeaderLeft">
                <span className="eyebrow">
                    TournamentHQ
                </span>

                <h2>
                    {currentOrganisation.name}
                </h2>

                <p className="muted">
                    Professional Tournament
                    Management Platform
                </p>

                <CompetitionSelector />

                <p className="muted">
                    {profile.full_name ??
                        'Administrator'}
                    {' · '}
                    {formatAdminRole(
                        profile.role
                    )}
                </p>
            </div>

            <div className="adminHeaderRight">
                <button
                    type="button"
                    className="btn secondary small"
                    onClick={onLogout}
                >
                    Logout
                </button>
            </div>
        </div>
    )
}