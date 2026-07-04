import type { Team } from '../data/festivalData'
export function TeamTable({ teams }: { teams: Team[] }) {
  return <div className="tableWrap"><table><thead><tr><th>Team</th><th>Manager</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>{teams.map((team) => <tr key={team.id}><td>{team.name}</td><td>{team.manager}</td><td>{team.played}</td><td>{team.won}</td><td>{team.drawn}</td><td>{team.lost}</td><td>{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td><td><strong>{team.points}</strong></td></tr>)}</tbody></table></div>
}
