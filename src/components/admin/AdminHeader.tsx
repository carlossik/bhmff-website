import {
    formatAdminRole,
    type AdminProfile,
} from '../../services/accessControl'
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
                <div className="adminBrand min-w-0">
                    <a
                        href="/"
                        className="inline-block max-w-full"
                        aria-label="TournamentHQ"
                    >
                        <img
                            src="/assets/tournamenthq-logo.png"
                            alt="TournamentHQ"
                            className="h-auto w-full max-w-[520px] object-contain sm:h-20 sm:w-auto"
                        />
                    </a>

                    <p className="muted font-semibold">
                        The Headquarters for Sporting Tournaments
                    </p>

                    <p className="muted">
                        Manage organisations, competitions, clubs, teams,
                        fixtures, results and officials from one central
                        platform.
                    </p>
                </div>

                <div className="adminAccount">
                    <div className="adminUser">
                        <strong>
                            {profile.full_name?.trim() ||
                                'Administrator'}
                        </strong>

                        {profile.email && (
                            <span className="adminUserEmail">
                                {profile.email}
                            </span>
                        )}

                        <span className="muted">
                            {formatAdminRole(
                                profile.role
                            ).replace(
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

            <div
                className="
                    adminToolbar
                    !grid
                    !grid-cols-1
                    !items-start
                    !gap-5
                    !px-4
                    !py-5
                    sm:!px-6
                    lg:!grid-cols-2
                    lg:!gap-8
                    [&_.competitionSelector]:!m-0
                    [&_.competitionSelector]:!w-full
                    [&_.competitionSelector]:!min-w-0
                    [&_.competitionSelector]:!max-w-none
                    [&_.competitionSelector]:!items-stretch
                    [&_.competitionSelector_select]:!box-border
                    [&_.competitionSelector_select]:!w-full
                    [&_.competitionSelector_select]:!min-w-0
                    [&_.competitionSelector_select]:!max-w-full
                "
            >
                {canSwitchOrganisation && (
                    <div className="competitionSelector !m-0 !w-full !min-w-0 !max-w-none !items-stretch">
                        <label htmlFor="organisation-switch">
                            Organisation
                        </label>

                        <select
                            id="organisation-switch"
                            className="!box-border !w-full !min-w-0 !max-w-full"
                            value={currentOrganisation.id}
                            onChange={(event) =>
                                switchOrganisation(
                                    event.target.value
                                )
                            }
                        >
                            {organisationAccess.map(
                                (access) => (
                                    <option
                                        key={
                                            access
                                                .organisation
                                                .id
                                        }
                                        value={
                                            access
                                                .organisation
                                                .id
                                        }
                                    >
                                        {
                                            access
                                                .organisation
                                                .name
                                        }{' '}
                                        (
                                        {formatAdminRole(
                                            access
                                                .membership
                                                .role
                                        )}
                                        )
                                    </option>
                                )
                            )}
                        </select>
                    </div>
                )}

                <CompetitionSelector />
            </div>
        </header>
    )
}