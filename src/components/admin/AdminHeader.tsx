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

    const currentRoleLabel =
        profile.isPlatformAdmin
            ? 'Platform Administrator'
            : profile.role === 'super_admin'
                ? currentOrganisation.organisation_type === 'club'
                    ? 'Club Administrator'
                    : 'Organisation Administrator'
                : formatAdminRole(profile.role)

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
                        The Headquarters for Sporting Competitions & Clubs
                    </p>

                    <p className="muted">
                        Run competitions or manage club seasons, fixtures, results,
                        officials and content from one central platform.
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
    {currentRoleLabel}
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
                                    {profile.isPlatformAdmin
                                        ? 'Platform Administrator'
                                        : access.membership.role === 'super_admin'
                                            ? access.organisation.organisation_type === 'club'
                                                ? 'Club Administrator'
                                                : 'Organisation Administrator'
                                            : formatAdminRole(
                                                access.membership.role
                                            )}
                                    )
                                </option>
                            ))}
                        </select>

                    </div>
                )}

                {currentOrganisation.organisation_type !== 'club' && (
                    <CompetitionSelector />
                )}

            </div>

        </header>
    )
}