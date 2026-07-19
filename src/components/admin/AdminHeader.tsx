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

    const { currentOrganisation } = useOrganisation()

    return (
        <header className="adminHeader">

            <div className="adminHeaderRow">

                <div className="adminBrand">

                    <span className="eyebrow">
                        TournamentHQ
                    </span>

                    <h1>
                        {currentOrganisation.name}
                    </h1>

                    <p className="muted">
                        Professional Tournament Management Platform
                    </p>

                </div>

                <div className="adminAccount">

                    <div className="adminUser">

                        <strong>
                            {profile.full_name ?? 'Administrator'}
                        </strong>

                        <span className="muted">
                            {formatAdminRole(profile.role)}
                        </span>

                    </div>

                    <button
                        type="button"
                        className="btn secondary small"
                        onClick={onLogout}
                    >
                        Logout
                    </button>

                </div>

            </div>

            <div className="adminToolbar">

                <CompetitionSelector />

            </div>

        </header>
    )
}