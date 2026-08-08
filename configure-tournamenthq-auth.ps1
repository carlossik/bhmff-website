param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRef,

    [Parameter(Mandatory = $true)]
    [string]$ApplicationUrl,

    [string]$FunctionName = "invite-admin-user"
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Normalize-ApplicationUrl {
    param([string]$Url)

    $normalized = $Url.Trim().TrimEnd("/")

    try {
        $uri = [System.Uri]$normalized
    }
    catch {
        throw "ApplicationUrl must be a valid absolute URL."
    }

    if (-not $uri.IsAbsoluteUri) {
        throw "ApplicationUrl must be an absolute URL."
    }

    if ($uri.Scheme -ne "https") {
        throw "ApplicationUrl must use HTTPS."
    }

    if ($uri.Host -eq "localhost" -or $uri.Host -eq "127.0.0.1") {
        throw "ApplicationUrl must be a production domain, not localhost."
    }

    return $normalized
}

$ApplicationUrl = Normalize-ApplicationUrl -Url $ApplicationUrl

if (-not $env:SUPABASE_ACCESS_TOKEN) {
    $secureToken = Read-Host "Enter your Supabase Personal Access Token" -AsSecureString
    $tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)

    try {
        $env:SUPABASE_ACCESS_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($tokenPointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($tokenPointer)
    }
}

$authEndpoint = "https://api.supabase.com/v1/projects/$ProjectRef/config/auth"
$headers = @{
    Authorization = "Bearer $($env:SUPABASE_ACCESS_TOKEN)"
    "Content-Type" = "application/json"
}

Write-Step "Reading the current Supabase Auth configuration"
$currentConfig = Invoke-RestMethod -Method Get -Uri $authEndpoint -Headers $headers

$existingRedirects = @()
if ($currentConfig.uri_allow_list) {
    $existingRedirects = $currentConfig.uri_allow_list -split "," |
        ForEach-Object { $_.Trim() } |
        Where-Object { $_ }
}

$requiredRedirects = @(
    "$ApplicationUrl/admin/set-password",
    "$ApplicationUrl/admin/set-password?invitation=true",
    "$ApplicationUrl/**",
    "http://localhost:5173/**"
)

$redirects = @($existingRedirects + $requiredRedirects) | Sort-Object -Unique
$authPayload = @{
    site_url = $ApplicationUrl
    uri_allow_list = ($redirects -join ",")
} | ConvertTo-Json

Write-Step "Setting the production Site URL and redirect allow-list"
Invoke-RestMethod -Method Patch -Uri $authEndpoint -Headers $headers -Body $authPayload | Out-Null

Write-Step "Storing the production application URL as an Edge Function secret"
& npx supabase secrets set "TOURNAMENTHQ_APP_URL=$ApplicationUrl" --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) {
    throw "Failed to set TOURNAMENTHQ_APP_URL."
}

Write-Step "Deploying the $FunctionName Edge Function"
& npx supabase functions deploy $FunctionName --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) {
    throw "Failed to deploy $FunctionName."
}

Write-Step "Configuration completed successfully"
Write-Host ""
Write-Host "Application URL: $ApplicationUrl" -ForegroundColor Green
Write-Host "Invitation URL: $ApplicationUrl/admin/set-password?invitation=true" -ForegroundColor Green
Write-Host ""
Write-Host "Send a fresh invitation to verify the final link." -ForegroundColor Yellow