# Run from TournamentHQ repository root. Changes only two URL builders.
$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$configPath = Join-Path $root 'src/config/organisationContent.ts'
$settingsPath = Join-Path $root 'src/components/admin/Organisations/ClubWebsiteSettingsManager.tsx'
foreach ($p in @($configPath, $settingsPath)) { if (!(Test-Path $p)) { throw "Missing required source file: $p" } }
$config = [System.IO.File]::ReadAllText($configPath)
$settings = [System.IO.File]::ReadAllText($settingsPath)
$configCrLf = $config.Contains("`r`n")
$settingsCrLf = $settings.Contains("`r`n")
$config = $config.Replace("`r`n", "`n")
$settings = $settings.Replace("`r`n", "`n")
$oldFunction = @'
export function getOrganisationPublicSiteUrl(
    origin: string,
    organisationSlug: string,
): string {
    const normalisedOrigin =
        origin.replace(/\/$/, "");

    const encodedSlug =
        encodeURIComponent(
            organisationSlug.trim(),
        );

    return `${normalisedOrigin}/${encodedSlug}`;
}
'@
$newFunction = @'
export function getOrganisationPublicSiteUrl(
    origin: string,
    organisationSlug: string,
): string {
    const url = new URL(origin);
    // Only local development uses the current origin. All published
    // organisation websites belong on the TournamentHQ application.
    const isLocal = ["localhost", "127.0.0.1"].includes(url.hostname);
    const publicOrigin = isLocal ? url.origin : "https://app.tournamenthq.co.uk";
    const encodedSlug = encodeURIComponent(organisationSlug.trim());
    return `${publicOrigin}/${encodedSlug}`;
}
'@
$oldUrl = @'
    const publicUrl =
        `${window.location.origin}/${encodeURIComponent(
            currentOrganisation.slug,
        )}`;
'@
$newUrl = @'
    const publicUrl = getOrganisationPublicSiteUrl(
        window.location.origin,
        currentOrganisation.slug,
    );
'@
$oldImport = @'
import {
    useOrganisation,
} from "../../../context/OrganisationContext";
'@
$newImport = @'
import {
    useOrganisation,
} from "../../../context/OrganisationContext";
import { getOrganisationPublicSiteUrl } from "../../../config/organisationContent";
'@
if (!$config.Contains($oldFunction)) { throw 'Expected URL helper not found. No files modified.' }
if (!$settings.Contains($oldUrl)) { throw 'Expected Club Website link code not found. No files modified.' }
if (!$settings.Contains($oldImport)) { throw 'Expected organisation import not found. No files modified.' }
if ($settings.Contains('import { getOrganisationPublicSiteUrl }')) { throw 'Public URL helper already imported. No files modified.' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $configPath "$configPath.backup-$stamp" -ErrorAction Stop
Copy-Item $settingsPath "$settingsPath.backup-$stamp" -ErrorAction Stop
$patchedConfig = $config.Replace($oldFunction, $newFunction)
$patchedSettings = $settings.Replace($oldImport, $newImport).Replace($oldUrl, $newUrl)
if ($configCrLf) { $patchedConfig = $patchedConfig.Replace("`n", "`r`n") }
if ($settingsCrLf) { $patchedSettings = $patchedSettings.Replace("`n", "`r`n") }
[System.IO.File]::WriteAllText($configPath, $patchedConfig)
[System.IO.File]::WriteAllText($settingsPath, $patchedSettings)
Write-Host 'Updated both public-site links. Backups created alongside source files.' -ForegroundColor Green
Write-Host 'Check: git diff -- src/config/organisationContent.ts src/components/admin/Organisations/ClubWebsiteSettingsManager.tsx'
Write-Host 'Then: npm run build'
