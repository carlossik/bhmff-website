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

    const {
        currentOrganisation,
        organisationAccess,
        switchOrganisation,
    } = useOrganisation()
    const canSwitchOrganisation =
        organisationAccess.length > 1


    return (
        <header className="adminHeader">

            <div className="adminHeaderRow">

                <div className="adminBrand">

                    <a
                        href="/"
                        className="inline-block"
                        aria-label="TournamentHQ"
                    >
                        <img
                            src="/assets/tournamenthq-logo.png"
                            alt="TournamentHQ"
                            className="h-20 w-auto object-contain"
                        />
                    </a>

                    <p className="muted font-semibold">
                        The Headquarters for Sporting Tournaments
                    </p>

                    <p className="muted">
                        Manage organisations, competitions, clubs, teams, fixtures,
                        results and officials from one central platform.
                    </p>

                </div>

                <div className="adminAccount">

                    <div className="adminUser">
                        <strong>
                            {profile.full_name?.trim() || 'Administrator'}
                        </strong>

                        {profile.email && (
                            <span className="adminUserEmail">
        {profile.email}
    </span>
                        )}

                        <span className="muted">
    {formatAdminRole(profile.role).replace(
        'Super Admin',
        'Super Administrator'
    )}
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
                {canSwitchOrganisation && (
                    <div className="competitionSelector">

                        <label htmlFor="organisation-switch">
                            Organisation
                        </label>

                        <select
                            id="organisation-switch"
                            value={currentOrganisation.id}
                            onChange={(event) =>
                                switchOrganisation(
                                    event.target.value
                                )
                            }
                        >
                            {organisationAccess.map((access) => (
                                <option
                                    key={access.organisation.id}
                                    value={access.organisation.id}
                                >
                                    {access.organisation.name} (
                                    {formatAdminRole(
                                        access.membership.role
                                    )}
                                    )
                                </option>
                            ))}
                        </select>

                    </div>
                )}

                <CompetitionSelector />

            </div>

        </header>
    )
}