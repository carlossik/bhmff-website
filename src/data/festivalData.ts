import type { LucideIcon } from 'lucide-react'

export const CKEFA_MEDIA_URL = 'https://ckefamedia.com/'

export type Fixture = {
  id: number
  stage: string
  date: string
  time: string
  venue: string
  homeTeam: string
  awayTeam: string
  status: 'Upcoming' | 'Full Time'
  score?: string
}

export type Team = {
  id: number
  name: string
  manager: string
  played: number
  won: number
  drawn: number
  lost: number
  goalDifference: number
  points: number
}

export type Sponsor = {
  id: number
  name: string
  tier: string
  description: string
}

export type Article = {
  id: string
  title: string
  category: string
  summary: string
  hero: string
  readTime: string
  body: string[]
  actions?: { label: string; href: string }[]
}

export const lastYearFinalVideo = {
  title: "Last Year's Final Highlights",
  subtitle: 'Watch the previous final on CKEFA Media.',
  youtubeUrl: 'https://youtu.be/FZohdJg_8CU?is=Oc59NiC9oaQLXkDC',
  embedUrl: 'https://www.youtube.com/embed/FZohdJg_8CU',
}

export const fixtures: Fixture[] = [
  { id: 1, stage: 'Group Stage', date: 'Saturday 3 October 2026', time: '10:00', venue: 'Festival Pitch 1', homeTeam: 'Opening Match Team A', awayTeam: 'Opening Match Team B', status: 'Upcoming' },
  { id: 2, stage: 'Group Stage', date: 'Saturday 10 October 2026', time: '12:00', venue: 'Festival Pitch 2', homeTeam: 'Group A Team', awayTeam: 'Group B Team', status: 'Upcoming' },
  { id: 3, stage: 'Quarter Final', date: 'Saturday 17 October 2026', time: '11:00', venue: 'Main Pitch', homeTeam: 'Winner Group A', awayTeam: 'Runner-up Group B', status: 'Upcoming' },
  { id: 4, stage: 'Grand Final', date: 'Saturday 31 October 2026', time: '15:00', venue: 'Main Pitch', homeTeam: 'Semi-final Winner 1', awayTeam: 'Semi-final Winner 2', status: 'Upcoming' },
]

export const teams: Team[] = [
  { id: 1, name: 'Participating Club A', manager: 'To be confirmed', played: 0, won: 0, drawn: 0, lost: 0, goalDifference: 0, points: 0 },
  { id: 2, name: 'Participating Club B', manager: 'To be confirmed', played: 0, won: 0, drawn: 0, lost: 0, goalDifference: 0, points: 0 },
  { id: 3, name: 'Participating Club C', manager: 'To be confirmed', played: 0, won: 0, drawn: 0, lost: 0, goalDifference: 0, points: 0 },
  { id: 4, name: 'Participating Club D', manager: 'To be confirmed', played: 0, won: 0, drawn: 0, lost: 0, goalDifference: 0, points: 0 },
]

export const sponsors: Sponsor[] = [
  {
    id: 1,
    name: 'CKEFA Media',
    tier: 'Official Media Partner',
    description:
        'Providing professional match filming, live streaming, photography, interviews and tournament highlights throughout the festival.'
  },
  {
    id: 2,
    name: 'CKEFA Software Solutions Ltd',
    tier: 'Technology Partner',
    description:
        'Designing, developing and maintaining the official Black History Month Football Festival website and digital management platform.'
  },
  {
    id: 3,
    name: 'Become a Festival Partner',
    tier: 'Partnership Opportunities',
    description:
        'We welcome businesses and organisations that share our passion for grassroots football, community development and Black History Month celebrations. Partner with us to help deliver an outstanding festival while promoting your organisation to players, families and the wider community.'
  }
]

export const articles: Article[] = [
  {
    id: 'black-footballers-in-the-uk',
    title: 'Black Footballers in the UK',
    category: 'Football Heritage',
    summary: 'A short introduction to the players and coaches who helped shape British football and opened doors for future generations.',
    hero: 'From early pioneers to modern icons, Black footballers have changed the game in the UK on the pitch, in the dugout and across the wider football community.',
    readTime: '4 min read',
    body: [
      'The history of Black footballers in the UK is a story of talent, resilience, pride and progress. It includes early figures such as Arthur Wharton and Walter Tull, later trailblazers including Viv Anderson, Cyrille Regis, Laurie Cunningham and Brendon Batson, and influential figures in the women’s game such as Hope Powell, Kerry Davis and Rachel Yankey.',
      'For young players, these stories matter because they show that representation is not just about visibility. It is about understanding the people who challenged barriers, performed under pressure and created opportunities for others to follow.',
      'During the festival, this section can be used to publish short profiles, video explainers and learning content that connects grassroots footballers with the wider history of the game in Britain.'
    ],
    actions: [
      { label: 'National Football Museum Hall of Fame', href: 'https://nationalfootballmuseum.com/hall-of-fame/' },
      { label: 'Football Unites: Pioneering Black Footballers', href: 'https://furd.org/resources/pioneering-black-footballers' }
    ]
  },
  {
    id: 'local-heroes',
    title: 'Local Heroes',
    category: 'Community Stories',
    summary: 'Celebrating the coaches, referees, volunteers, parents and organisers who keep grassroots football alive every week.',
    hero: 'Black History Month is also about recognising the people who serve the community quietly, consistently and with purpose.',
    readTime: '3 min read',
    body: [
      'Every grassroots football community is built by people who give their time long before the first whistle and long after the final whistle. Coaches prepare sessions, volunteers mark pitches, parents organise lifts, referees manage difficult games and local organisers keep clubs moving.',
      'The festival should shine a light on these people. Local heroes may not always be household names, but they are often the reason young people stay connected to football, discipline, friendship and positive role models.',
      'This section can feature short interviews, photo stories and thank-you profiles for people making a measurable contribution to football and community life.'
    ]
  },
  {
    id: 'education-and-legacy',
    title: 'Education and Legacy',
    category: 'Learning',
    summary: 'Youth-friendly resources that connect football, identity, leadership, teamwork and Black British history.',
    hero: 'The festival should be entertaining, but it should also leave young people with knowledge, confidence and a stronger sense of belonging.',
    readTime: '3 min read',
    body: [
      'Football is one of the most powerful ways to reach young people. It creates a natural space to talk about teamwork, leadership, respect, discipline, identity and history.',
      'The education section can include short articles, quiz content, workshop ideas, classroom resources and coach-led discussion points. The aim is not to make the tournament feel like school; the aim is to make learning accessible, relevant and memorable.',
      'Over time, this hub can become a digital archive for each year of the festival, capturing stories, winners, videos, community impact and learning resources.'
    ]
  },
  {
    id: 'community-business',
    title: 'Community Business',
    category: 'Local Economy',
    summary: 'A space to highlight local businesses, sponsors and community partners supporting the festival.',
    hero: 'Grassroots football grows stronger when local businesses and local communities work together.',
    readTime: '3 min read',
    body: [
      'The festival creates an opportunity for businesses to support something visible, positive and community-led. Sponsors are not just buying logo space; they are helping create safer, better organised and more meaningful football experiences for young people and families.',
      'This section can showcase local businesses, Black-owned businesses, community partners and organisations that support youth development, sport, education and culture.',
      'Each business profile can include a short story, website link, logo, offer, interview or video feature produced by CKEFA Media.'
    ]
  }
]
