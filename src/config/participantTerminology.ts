// Generic terminology layer. Internal clubs/teams/competition IDs do not change.
export type ParticipantTerminology = 'club' | 'school' | 'university' | 'academy' | 'participant'
export type ParticipantLabels = { singular: string; plural: string; lower: string }
const labels: Record<ParticipantTerminology, ParticipantLabels> = {
    club: { singular: 'Club', plural: 'Clubs', lower: 'club' },
    school: { singular: 'School', plural: 'Schools', lower: 'school' },
    university: { singular: 'University', plural: 'Universities', lower: 'university' },
    academy: { singular: 'Academy', plural: 'Academies', lower: 'academy' },
    participant: { singular: 'Participant', plural: 'Participants', lower: 'participant' },
}
export function getParticipantLabels(value: string | null | undefined): ParticipantLabels {
    return value && Object.prototype.hasOwnProperty.call(labels, value)
        ? labels[value as ParticipantTerminology]
        : labels.club
}
