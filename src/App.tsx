import {
    Navigate,
    useLocation,
} from 'react-router-dom'

import { AdminPage } from './pages/AdminPage'
import { SetPasswordPage } from './pages/Auth/SetPasswordPage'
import { HomePage } from './pages/Home/HomePage'
import { PublicOrganisationLayout } from './pages/public/PublicOrganisationLayout'
import { SetupWizard } from './pages/onboarding/SetupWizard'

const RESERVED_PUBLIC_PATHS =
    new Set([
        'admin',
        'api',
        'assets',
        'auth',
        'favicon.ico',
        'login',
        'logout',
        'onboarding',
        'request-demo',
        'robots.txt',
        'set-password',
        'sitemap.xml',
    ])

function isBhmffCustomDomain() {
    if (typeof window === 'undefined') {
        return false
    }

    const hostname =
        window.location.hostname
            .trim()
            .toLowerCase()

    return (
        hostname === 'bhmff.co.uk' ||
        hostname ===
        'www.bhmff.co.uk'
    )
}

function getLegacyOrganisationPath(
    pathname: string,
) {
    const match =
        pathname.match(
            /^\/o\/([^/]+)(\/.*)?$/,
        )

    if (!match) {
        return null
    }

    const slug =
        decodeURIComponent(
            match[1],
        )

    const remainder =
        match[2] ?? ''

    return `/${encodeURIComponent(
        slug,
    )}${remainder}`
}

function isCleanOrganisationPath(
    pathname: string,
) {
    const match =
        pathname.match(
            /^\/([^/]+)(?:\/.*)?$/,
        )

    if (!match) {
        return false
    }

    const firstSegment =
        decodeURIComponent(
            match[1],
        )
            .trim()
            .toLowerCase()

    return (
        firstSegment.length > 0 &&
        !RESERVED_PUBLIC_PATHS.has(
            firstSegment,
        )
    )
}

function App() {
    const location =
        useLocation()

    if (
        location.pathname ===
        '/admin/set-password'
    ) {
        return <SetPasswordPage />
    }

    if (
        !isBhmffCustomDomain() &&
        (location.pathname === '/onboarding' ||
            location.pathname.startsWith('/onboarding/'))
    ) {
        return <SetupWizard />
    }

    if (
        location.pathname ===
        '/admin' ||
        location.pathname.startsWith(
            '/admin/',
        )
    ) {
        return <AdminPage />
    }

    const legacyOrganisationPath =
        getLegacyOrganisationPath(
            location.pathname,
        )

    if (legacyOrganisationPath) {
        return (
            <Navigate
                replace
                to={`${legacyOrganisationPath}${location.search}${location.hash}`}
            />
        )
    }

    if (isBhmffCustomDomain()) {
        return (
            <PublicOrganisationLayout
                organisationSlugOverride="bhmff"
                useRootPath
            />
        )
    }

    if (
        isCleanOrganisationPath(
            location.pathname,
        )
    ) {
        return (
            <PublicOrganisationLayout />
        )
    }

    if (location.pathname === '/') {
        return <Navigate replace to="/admin" />
    }

    return (
        <HomePage>
            {null}
        </HomePage>
    )
}

export default App
