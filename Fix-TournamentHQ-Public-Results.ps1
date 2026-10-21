$ErrorActionPreference = 'Stop'
$file = 'src/pages/public/PublicResultsPage.tsx'
if (-not (Test-Path $file)) { throw "Run from the TournamentHQ project root; missing $file" }
$content = [System.IO.File]::ReadAllText((Resolve-Path $file))
$startToken = '    useEffect(() => {'
$endToken = '    }, [organisationId]);'
$start = $content.IndexOf($startToken)
if ($start -lt 0) { throw 'Expected useEffect beginning not found; no files changed.' }
$end = $content.IndexOf($endToken, $start)
if ($end -lt 0) { throw 'Expected useEffect ending not found; no files changed.' }
$end += $endToken.Length
if ($content.Contains('teams!results_home_team_id_fkey') -eq $false) { throw 'Original invalid query not found. Perhaps already patched? No files changed.' }
$replacement = @'
    useEffect(() => {
        let cancelled = false;

        async function loadResults() {
            setLoading(true);
            setErrorMessage("");

            try {
                // Scope the query by organisation before retrieving any published results.
                const { data: competitionData, error: competitionError } = await supabase
                    .from("competitions")
                    .select("id, name, title")
                    .eq("organisation_id", organisationId);
                if (competitionError) throw competitionError;

                const competitionRows = competitionData ?? [];
                const competitionIds = competitionRows.map((item) => item.id);
                if (!competitionIds.length) {
                    if (!cancelled) setResults([]);
                    return;
                }

                const { data: resultData, error: resultsError } = await supabase
                    .from("public_results")
                    .select("*")
                    .in("competition_id", competitionIds)
                    .eq("published", true)
                    .order("created_at", { ascending: false });
                if (resultsError) throw resultsError;

                const resultRows = (resultData ?? []) as PublicResultRow[];
                const fixtureIds = [...new Set(resultRows.map((r) => r.fixture_id).filter((id): id is string => !!id))];
                if (!fixtureIds.length) {
                    if (!cancelled) setResults([]);
                    return;
                }

                const { data: fixtureData, error: fixturesError } = await supabase
                    .from("fixtures")
                    .select("*")
                    .in("id", fixtureIds)
                    .in("competition_id", competitionIds);
                if (fixturesError) throw fixturesError;

                const fixtureRows = (fixtureData ?? []) as Array<Record<string, unknown>>;
                const fixturesById = new Map(fixtureRows.map((f) => [String(f.id), f]));
                const competitionTeamIds = [...new Set(fixtureRows.flatMap((f) => [
                    f.home_competition_team_id,
                    f.away_competition_team_id,
                ]).filter((id): id is string => typeof id === "string" && !!id))];
                const venueIds = [...new Set(fixtureRows.map((f) => f.venue_id)
                    .filter((id): id is string => typeof id === "string" && !!id))];

                const { data: competitionTeamData, error: competitionTeamsError } = competitionTeamIds.length
                    ? await supabase.from("competition_teams").select("id, team_id").in("id", competitionTeamIds)
                    : { data: [], error: null };
                if (competitionTeamsError) throw competitionTeamsError;

                const competitionTeamRows = competitionTeamData ?? [];
                const teamIds = [...new Set(competitionTeamRows.map((ct) => ct.team_id).filter((id): id is string => !!id))];
                const { data: teamData, error: teamsError } = teamIds.length
                    ? await supabase.from("teams").select("*, clubs (name, badge_url)").in("id", teamIds)
                    : { data: [], error: null };
                if (teamsError) throw teamsError;

                const { data: venueData, error: venuesError } = venueIds.length
                    ? await supabase.from("venues").select("id, name, address").in("id", venueIds)
                    : { data: [], error: null };
                if (venuesError) throw venuesError;

                const teamsById = new Map((teamData ?? []).map((team) => [team.id, team as ResultTeam]));
                const teamIdByCompetitionTeam = new Map(competitionTeamRows.map((ct) => [ct.id, ct.team_id]));
                const venuesById = new Map((venueData ?? []).map((venue) => [venue.id, venue as ResultVenue]));
                const competitionsById = new Map(competitionRows.map((competition) => [competition.id, competition]));

                const mapped = resultRows.flatMap((result) => {
                    const fixture = result.fixture_id ? fixturesById.get(result.fixture_id) : undefined;
                    if (!fixture || fixture.published === false) return [];
                    const homeTeamId = teamIdByCompetitionTeam.get(String(fixture.home_competition_team_id ?? ""));
                    const awayTeamId = teamIdByCompetitionTeam.get(String(fixture.away_competition_team_id ?? ""));
                    const competitionId = String(fixture.competition_id ?? result.competition_id ?? "");
                    const enriched: PublicResultRow = {
                        ...result,
                        competition_id: competitionId,
                        home_team: homeTeamId ? teamsById.get(homeTeamId) ?? null : null,
                        away_team: awayTeamId ? teamsById.get(awayTeamId) ?? null : null,
                        venue: venuesById.get(String(fixture.venue_id ?? "")) ?? null,
                        competition: competitionsById.get(competitionId) ?? null,
                        fixture: {
                            id: String(fixture.id),
                            kickoff_time: typeof fixture.kickoff_time === "string" ? fixture.kickoff_time : null,
                        },
                    };
                    return [mapResult(enriched)];
                });

                if (!cancelled) setResults(mapped);
            } catch (error) {
                console.error("Failed to load public results:", error);
                if (!cancelled) {
                    setResults([]);
                    setErrorMessage("Unable to load results right now.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadResults();
        return () => { cancelled = true; };
    }, [organisationId]);
'@
$backup = "$file.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $file $backup
$updated = $content.Substring(0, $start) + $replacement + $content.Substring($end)
[System.IO.File]::WriteAllText((Resolve-Path $file), $updated, [System.Text.UTF8Encoding]::new($false))
Write-Host "Patched $file" -ForegroundColor Green
Write-Host "Backup: $backup"
