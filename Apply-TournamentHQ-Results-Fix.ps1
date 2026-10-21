$ErrorActionPreference = 'Stop'
$path = 'src/pages/public/PublicResultsPage.tsx'
if (-not (Test-Path $path)) { throw "Run this script from the TournamentHQ project root: $path not found." }
$original = [System.IO.File]::ReadAllText((Resolve-Path $path))
$pattern = '(?s)    useEffect\(\(\) => \{.*?(?=    const competitionOptions\s*=)'
$matches = [regex]::Matches($original, $pattern)
if ($matches.Count -ne 1) { throw "Expected precisely one Results loading effect; found $($matches.Count). No file changed." }
$replacement = @'
    useEffect(() => {
        let active = true;

        async function loadResults() {
            setLoading(true);
            setErrorMessage("");

            try {
                // Scope every subsequent request by competitions owned by this organisation.
                const { data: competitionData, error: competitionError } = await supabase
                    .from("competitions")
                    .select("*")
                    .eq("organisation_id", organisationId);
                if (competitionError) throw competitionError;

                const competitionRows = (competitionData ?? []) as Record<string, any>[];
                const competitionIds = competitionRows.map((row) => String(row.id));
                if (!competitionIds.length) {
                    if (active) setResults([]);
                    return;
                }

                // public_results exposes fixture_id + competition_id, NOT direct team relationships.
                const { data: resultData, error: resultError } = await supabase
                    .from("public_results")
                    .select("*")
                    .in("competition_id", competitionIds)
                    .eq("published", true)
                    .order("created_at", { ascending: false });
                if (resultError) throw resultError;

                const resultRows = (resultData ?? []) as Record<string, any>[];
                const fixtureIds = [...new Set(resultRows.map((row) => row.fixture_id).filter(Boolean))] as string[];
                if (!fixtureIds.length) {
                    if (active) setResults([]);
                    return;
                }

                const { data: fixtureData, error: fixtureError } = await supabase
                    .from("fixtures")
                    .select("*")
                    .in("id", fixtureIds)
                    .in("competition_id", competitionIds);
                if (fixtureError) throw fixtureError;

                const fixtureRows = (fixtureData ?? []) as Record<string, any>[];
                const fixturesById = new Map(fixtureRows.map((row) => [String(row.id), row]));
                const competitionTeamIds = [...new Set(fixtureRows.flatMap((row) => [
                    row.home_competition_team_id,
                    row.away_competition_team_id,
                ]).filter(Boolean))] as string[];

                let competitionTeamRows: Record<string, any>[] = [];
                if (competitionTeamIds.length) {
                    const { data, error } = await supabase
                        .from("competition_teams")
                        .select("id, team_id, competition_id")
                        .in("id", competitionTeamIds)
                        .in("competition_id", competitionIds);
                    if (error) throw error;
                    competitionTeamRows = (data ?? []) as Record<string, any>[];
                }
                const competitionTeamsById = new Map(competitionTeamRows.map((row) => [String(row.id), row]));
                const teamIds = [...new Set(competitionTeamRows.map((row) => row.team_id).filter(Boolean))] as string[];

                let teamRows: Record<string, any>[] = [];
                if (teamIds.length) {
                    const { data, error } = await supabase
                        .from("teams")
                        .select("*")
                        .in("id", teamIds);
                    if (error) throw error;
                    teamRows = (data ?? []) as Record<string, any>[];
                }
                const teamsById = new Map(teamRows.map((row) => [String(row.id), row]));

                const venueIds = [...new Set(fixtureRows.map((row) => row.venue_id).filter(Boolean))] as string[];
                let venueRows: Record<string, any>[] = [];
                if (venueIds.length) {
                    const { data, error } = await supabase
                        .from("venues")
                        .select("*")
                        .in("id", venueIds);
                    if (error) throw error;
                    venueRows = (data ?? []) as Record<string, any>[];
                }
                const venuesById = new Map(venueRows.map((row) => [String(row.id), row]));
                const competitionsById = new Map(competitionRows.map((row) => [String(row.id), row]));

                const mapped = resultRows.flatMap((row) => {
                    const fixture = fixturesById.get(String(row.fixture_id));
                    // Never expose a row if its fixture cannot be proven to belong to this organisation.
                    if (!fixture || String(fixture.competition_id) !== String(row.competition_id)) return [];
                    const homeEntry = competitionTeamsById.get(String(fixture.home_competition_team_id));
                    const awayEntry = competitionTeamsById.get(String(fixture.away_competition_team_id));
                    const homeTeam = homeEntry ? teamsById.get(String(homeEntry.team_id)) : null;
                    const awayTeam = awayEntry ? teamsById.get(String(awayEntry.team_id)) : null;
                    const competition = competitionsById.get(String(row.competition_id));
                    const venue = venuesById.get(String(fixture.venue_id));
                    const displayRow = {
                        ...row,
                        home_team: homeTeam ?? null,
                        away_team: awayTeam ?? null,
                        competition: competition ?? null,
                        venue: venue ?? null,
                        status: fixture.status ?? 'completed',
                        round_name: fixture.stage ?? null,
                        fixture: {
                            id: fixture.id,
                            kickoff_time: fixture.kickoff_time ?? null,
                            scheduled_at: fixture.kickoff_time ?? null,
                            competition: competition ?? null,
                            venue: venue ?? null,
                        },
                    } as PublicResultRow;
                    return [mapResult(displayRow)];
                });

                if (active) setResults(mapped);
            } catch (error) {
                console.error("Failed to load public results:", error);
                if (active) {
                    setResults([]);
                    setErrorMessage("Unable to load results right now.");
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        void loadResults();
        return () => { active = false; };
    }, [organisationId]);

'@
$match = $matches[0]
$updated = $original.Substring(0, $match.Index) + $replacement + $original.Substring($match.Index + $match.Length)
$backup = "$path.backup-before-results-fix-$(Get-Date -Format yyyyMMdd-HHmmss)"
Copy-Item $path $backup
[System.IO.File]::WriteAllText((Resolve-Path $path), $updated, [System.Text.UTF8Encoding]::new($false))
Write-Host "Updated $path (backup saved to $backup)" -ForegroundColor Green
Write-Host 'Next: npm run build; then node --test tests/public/publicSiteRegression.test.cjs' -ForegroundColor Cyan
