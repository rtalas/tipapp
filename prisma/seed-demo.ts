import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helper function to create consistent dates
const createDate = (daysFromNow: number, hours = 0, minutes = 0): Date => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(hours, minutes, 0, 0)
  return date
}

// Helper for timestamp fields (many models don't have @default(now()))
const now = new Date()

async function main() {
  console.log('🧹 Cleaning existing data...')

  // Clean in reverse dependency order
  await prisma.message.deleteMany()
  await prisma.topScorerRankingVersion.deleteMany()
  await prisma.matchScorer.deleteMany()
  await prisma.userSpecialBetQuestion.deleteMany()
  await prisma.userSpecialBetSingle.deleteMany()
  await prisma.userSpecialBetSerie.deleteMany()
  await prisma.userBet.deleteMany()
  await prisma.leagueSpecialBetQuestion.deleteMany()
  await prisma.leagueSpecialBetSingle.deleteMany()
  await prisma.leagueSpecialBetSerie.deleteMany()
  await prisma.leagueMatch.deleteMany()
  await prisma.leaguePlayer.deleteMany()
  await prisma.leagueTeam.deleteMany()
  await prisma.leagueUser.deleteMany()
  await prisma.evaluator.deleteMany()
  await prisma.leaguePrize.deleteMany()
  await prisma.league.deleteMany()
  await prisma.player.deleteMany()
  await prisma.team.deleteMany()
  await prisma.user.deleteMany()
  await prisma.specialBetSingleType.deleteMany()
  await prisma.leaguePhase.deleteMany()
  await prisma.matchPhase.deleteMany()
  await prisma.evaluatorType.deleteMany()
  await prisma.sport.deleteMany()

  console.log('✅ Data cleaned')

  console.log('🏗️  Creating foundation data...')

  // 1. Sports
  const hockey = await prisma.sport.create({
    data: { id: 1, name: 'Hockey', createdAt: now, updatedAt: now }
  })
  const football = await prisma.sport.create({
    data: { id: 2, name: 'Football', createdAt: now, updatedAt: now }
  })

  // 2. EvaluatorTypes
  const evaluatorTypes = await Promise.all([
    prisma.evaluatorType.create({ data: { name: 'exact_score', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'score_difference', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'one_team_score', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'winner', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'scorer', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'draw', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'soccer_playoff_advance', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'series_exact', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'series_winner', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'exact_player', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'exact_team', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'exact_value', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'closest_value', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'question', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'group_stage_team', createdAt: now, updatedAt: now } }),
    prisma.evaluatorType.create({ data: { name: 'group_stage_advance', createdAt: now, updatedAt: now } }),
  ])

  // 3. MatchPhases (Hockey Playoffs)
  const quarterFinals = await prisma.matchPhase.create({
    data: { name: 'Quarter-finals', rank: 1, bestOf: 7, createdAt: now, updatedAt: now }
  })
  const semiFinals = await prisma.matchPhase.create({
    data: { name: 'Semi-finals', rank: 2, bestOf: 7, createdAt: now, updatedAt: now }
  })
  const finals = await prisma.matchPhase.create({
    data: { name: 'Finals', rank: 3, bestOf: 7, createdAt: now, updatedAt: now }
  })

  // 4. LeaguePhases (Soccer Tournament)
  const groupStage = await prisma.leaguePhase.create({
    data: { name: 'Group Stage', rank: 1, createdAt: now, updatedAt: now }
  })
  const roundOf16 = await prisma.leaguePhase.create({
    data: { name: 'Round of 16', rank: 2, createdAt: now, updatedAt: now }
  })
  const quarters = await prisma.leaguePhase.create({
    data: { name: 'Quarter-finals', rank: 3, createdAt: now, updatedAt: now }
  })
  const semis = await prisma.leaguePhase.create({
    data: { name: 'Semi-finals', rank: 4, createdAt: now, updatedAt: now }
  })
  const final = await prisma.leaguePhase.create({
    data: { name: 'Final', rank: 5, createdAt: now, updatedAt: now }
  })

  // Create evaluator type lookup map
  const evaluatorTypeMap: Record<string, number> = {
    'exact_score': evaluatorTypes[0].id,
    'score_difference': evaluatorTypes[1].id,
    'one_team_score': evaluatorTypes[2].id,
    'winner': evaluatorTypes[3].id,
    'scorer': evaluatorTypes[4].id,
    'draw': evaluatorTypes[5].id,
    'soccer_playoff_advance': evaluatorTypes[6].id,
    'series_exact': evaluatorTypes[7].id,
    'series_winner': evaluatorTypes[8].id,
    'exact_player': evaluatorTypes[9].id,
    'exact_team': evaluatorTypes[10].id,
    'exact_value': evaluatorTypes[11].id,
    'closest_value': evaluatorTypes[12].id,
    'question': evaluatorTypes[13].id,
    'group_stage_team': evaluatorTypes[14].id,
    'group_stage_advance': evaluatorTypes[15].id,
  }

  console.log('✅ Foundation data created')

  console.log('👥 Creating users...')

  // 5. Users (1 admin + 14 regular users)
  const hashedPassword = await bcrypt.hash('demo123', 12)

  const admin = await prisma.user.create({
    data: {
      username: 'demo_admin',
      email: 'demo.admin@tipapp.demo',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Demo',
      isSuperadmin: true,
      createdAt: now,
      updatedAt: now,
    }
  })

  const czechNames = [
    { username: 'demo_user1', email: 'demo.user1@tipapp.demo', firstName: 'Jakub', lastName: 'Novák' },
    { username: 'demo_user2', email: 'demo.user2@tipapp.demo', firstName: 'Petra', lastName: 'Svobodová' },
    { username: 'demo_user3', email: 'demo.user3@tipapp.demo', firstName: 'Martin', lastName: 'Dvořák' },
    { username: 'demo_user4', email: 'demo.user4@tipapp.demo', firstName: 'Anna', lastName: 'Černá' },
    { username: 'demo_user5', email: 'demo.user5@tipapp.demo', firstName: 'Tomáš', lastName: 'Procházka' },
    { username: 'demo_user6', email: 'demo.user6@tipapp.demo', firstName: 'Eva', lastName: 'Nováková' },
    { username: 'demo_user7', email: 'demo.user7@tipapp.demo', firstName: 'Jan', lastName: 'Horák' },
    { username: 'demo_user8', email: 'demo.user8@tipapp.demo', firstName: 'Lucie', lastName: 'Maršálková' },
    { username: 'demo_user9', email: 'demo.user9@tipapp.demo', firstName: 'Petr', lastName: 'Veselý' },
    { username: 'demo_user10', email: 'demo.user10@tipapp.demo', firstName: 'Hana', lastName: 'Pokorná' },
    { username: 'demo_user11', email: 'demo.user11@tipapp.demo', firstName: 'Michal', lastName: 'Král' },
    { username: 'demo_user12', email: 'demo.user12@tipapp.demo', firstName: 'Lenka', lastName: 'Němcová' },
    { username: 'demo_user13', email: 'demo.user13@tipapp.demo', firstName: 'David', lastName: 'Kučera' },
    { username: 'demo_user14', email: 'demo.user14@tipapp.demo', firstName: 'Tereza', lastName: 'Jelínková' },
  ]

  const users = await Promise.all(
    czechNames.map(user =>
      prisma.user.create({
        data: {
          ...user,
          password: hashedPassword,
          isSuperadmin: false,
          createdAt: now,
          updatedAt: now,
        }
      })
    )
  )

  const allUsers = [admin, ...users]

  console.log('✅ Created 15 users (1 admin + 14 regular)')

  console.log('🏒 Creating NHL teams and players...')

  // 6. NHL Teams (8 teams for playoff bracket)
  const nhlTeams = await Promise.all([
    prisma.team.create({
      data: {
        sportId: hockey.id,
        name: 'Florida Panthers',
        shortcut: 'FLA',
        flagIcon: '🐆',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: hockey.id,
        name: 'Edmonton Oilers',
        shortcut: 'EDM',
        flagIcon: '🛢️',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: hockey.id,
        name: 'New York Rangers',
        shortcut: 'NYR',
        flagIcon: '🗽',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: hockey.id,
        name: 'Carolina Hurricanes',
        shortcut: 'CAR',
        flagIcon: '🌀',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: hockey.id,
        name: 'Dallas Stars',
        shortcut: 'DAL',
        flagIcon: '⭐',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: hockey.id,
        name: 'Colorado Avalanche',
        shortcut: 'COL',
        flagIcon: '🏔️',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: hockey.id,
        name: 'Vancouver Canucks',
        shortcut: 'VAN',
        flagIcon: '🇨🇦',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: hockey.id,
        name: 'Nashville Predators',
        shortcut: 'NSH',
        flagIcon: '🎸',
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  // 7. NHL Players (5 per team = 40 players) - Store teamId separately for later LeaguePlayer creation
  const nhlPlayers = [
    // Florida Panthers
    { teamId: nhlTeams[0].id, firstName: 'Matthew', lastName: 'Tkachuk', position: 'LW', seasonGames: 80, seasonGoals: 35, seasonAssists: 53, topScorerRanking: 1 },
    { teamId: nhlTeams[0].id, firstName: 'Aleksander', lastName: 'Barkov', position: 'C', seasonGames: 73, seasonGoals: 23, seasonAssists: 57, topScorerRanking: 2 },
    { teamId: nhlTeams[0].id, firstName: 'Sam', lastName: 'Reinhart', position: 'RW', seasonGames: 82, seasonGoals: 57, seasonAssists: 37, topScorerRanking: 3 },
    { teamId: nhlTeams[0].id, firstName: 'Carter', lastName: 'Verhaeghe', position: 'LW', seasonGames: 78, seasonGoals: 34, seasonAssists: 38, topScorerRanking: null },
    { teamId: nhlTeams[0].id, firstName: 'Gustav', lastName: 'Forsling', position: 'D', seasonGames: 81, seasonGoals: 8, seasonAssists: 49, topScorerRanking: null },

    // Edmonton Oilers
    { teamId: nhlTeams[1].id, firstName: 'Connor', lastName: 'McDavid', position: 'C', seasonGames: 76, seasonGoals: 32, seasonAssists: 100, topScorerRanking: 1 },
    { teamId: nhlTeams[1].id, firstName: 'Leon', lastName: 'Draisaitl', position: 'C', seasonGames: 81, seasonGoals: 41, seasonAssists: 65, topScorerRanking: 2 },
    { teamId: nhlTeams[1].id, firstName: 'Zach', lastName: 'Hyman', position: 'LW', seasonGames: 80, seasonGoals: 54, seasonAssists: 23, topScorerRanking: 3 },
    { teamId: nhlTeams[1].id, firstName: 'Ryan', lastName: 'Nugent-Hopkins', position: 'C', seasonGames: 80, seasonGoals: 18, seasonAssists: 49, topScorerRanking: null },
    { teamId: nhlTeams[1].id, firstName: 'Evan', lastName: 'Bouchard', position: 'D', seasonGames: 81, seasonGoals: 18, seasonAssists: 64, topScorerRanking: null },

    // New York Rangers
    { teamId: nhlTeams[2].id, firstName: 'Artemi', lastName: 'Panarin', position: 'LW', seasonGames: 82, seasonGoals: 49, seasonAssists: 71, topScorerRanking: 1 },
    { teamId: nhlTeams[2].id, firstName: 'Vincent', lastName: 'Trocheck', position: 'C', seasonGames: 82, seasonGoals: 25, seasonAssists: 52, topScorerRanking: 2 },
    { teamId: nhlTeams[2].id, firstName: 'Chris', lastName: 'Kreider', position: 'LW', seasonGames: 82, seasonGoals: 39, seasonAssists: 36, topScorerRanking: 3 },
    { teamId: nhlTeams[2].id, firstName: 'Mika', lastName: 'Zibanejad', position: 'C', seasonGames: 82, seasonGoals: 26, seasonAssists: 49, topScorerRanking: null },
    { teamId: nhlTeams[2].id, firstName: 'Adam', lastName: 'Fox', position: 'D', seasonGames: 82, seasonGoals: 17, seasonAssists: 56, topScorerRanking: null },

    // Carolina Hurricanes
    { teamId: nhlTeams[3].id, firstName: 'Sebastian', lastName: 'Aho', position: 'C', seasonGames: 78, seasonGoals: 36, seasonAssists: 53, topScorerRanking: 1 },
    { teamId: nhlTeams[3].id, firstName: 'Andrei', lastName: 'Svechnikov', position: 'RW', seasonGames: 64, seasonGoals: 23, seasonAssists: 28, topScorerRanking: 2 },
    { teamId: nhlTeams[3].id, firstName: 'Martin', lastName: 'Necas', position: 'C', seasonGames: 77, seasonGoals: 24, seasonAssists: 29, topScorerRanking: 3 },
    { teamId: nhlTeams[3].id, firstName: 'Jake', lastName: 'Guentzel', position: 'LW', seasonGames: 67, seasonGoals: 30, seasonAssists: 47, topScorerRanking: null },
    { teamId: nhlTeams[3].id, firstName: 'Brent', lastName: 'Burns', position: 'D', seasonGames: 81, seasonGoals: 6, seasonAssists: 28, topScorerRanking: null },

    // Dallas Stars
    { teamId: nhlTeams[4].id, firstName: 'Jason', lastName: 'Robertson', position: 'LW', seasonGames: 82, seasonGoals: 29, seasonAssists: 51, topScorerRanking: 1 },
    { teamId: nhlTeams[4].id, firstName: 'Roope', lastName: 'Hintz', position: 'C', seasonGames: 80, seasonGoals: 30, seasonAssists: 35, topScorerRanking: 2 },
    { teamId: nhlTeams[4].id, firstName: 'Joe', lastName: 'Pavelski', position: 'RW', seasonGames: 82, seasonGoals: 27, seasonAssists: 40, topScorerRanking: 3 },
    { teamId: nhlTeams[4].id, firstName: 'Tyler', lastName: 'Seguin', position: 'C', seasonGames: 82, seasonGoals: 23, seasonAssists: 32, topScorerRanking: null },
    { teamId: nhlTeams[4].id, firstName: 'Miro', lastName: 'Heiskanen', position: 'D', seasonGames: 82, seasonGoals: 17, seasonAssists: 47, topScorerRanking: null },

    // Colorado Avalanche
    { teamId: nhlTeams[5].id, firstName: 'Nathan', lastName: 'MacKinnon', position: 'C', seasonGames: 82, seasonGoals: 51, seasonAssists: 89, topScorerRanking: 1 },
    { teamId: nhlTeams[5].id, firstName: 'Mikko', lastName: 'Rantanen', position: 'RW', seasonGames: 81, seasonGoals: 42, seasonAssists: 62, topScorerRanking: 2 },
    { teamId: nhlTeams[5].id, firstName: 'Cale', lastName: 'Makar', position: 'D', seasonGames: 77, seasonGoals: 21, seasonAssists: 69, topScorerRanking: 3 },
    { teamId: nhlTeams[5].id, firstName: 'Valeri', lastName: 'Nichushkin', position: 'RW', seasonGames: 54, seasonGoals: 28, seasonAssists: 25, topScorerRanking: null },
    { teamId: nhlTeams[5].id, firstName: 'Jonathan', lastName: 'Drouin', position: 'LW', seasonGames: 79, seasonGoals: 19, seasonAssists: 37, topScorerRanking: null },

    // Vancouver Canucks
    { teamId: nhlTeams[6].id, firstName: 'Elias', lastName: 'Pettersson', position: 'C', seasonGames: 82, seasonGoals: 34, seasonAssists: 55, topScorerRanking: 1 },
    { teamId: nhlTeams[6].id, firstName: 'J.T.', lastName: 'Miller', position: 'C', seasonGames: 81, seasonGoals: 37, seasonAssists: 66, topScorerRanking: 2 },
    { teamId: nhlTeams[6].id, firstName: 'Brock', lastName: 'Boeser', position: 'RW', seasonGames: 81, seasonGoals: 40, seasonAssists: 40, topScorerRanking: 3 },
    { teamId: nhlTeams[6].id, firstName: 'Quinn', lastName: 'Hughes', position: 'D', seasonGames: 82, seasonGoals: 17, seasonAssists: 75, topScorerRanking: null },
    { teamId: nhlTeams[6].id, firstName: 'Conor', lastName: 'Garland', position: 'RW', seasonGames: 82, seasonGoals: 16, seasonAssists: 36, topScorerRanking: null },

    // Nashville Predators
    { teamId: nhlTeams[7].id, firstName: 'Filip', lastName: 'Forsberg', position: 'LW', seasonGames: 82, seasonGoals: 48, seasonAssists: 46, topScorerRanking: 1 },
    { teamId: nhlTeams[7].id, firstName: 'Ryan', lastName: 'O\'Reilly', position: 'C', seasonGames: 82, seasonGoals: 26, seasonAssists: 43, topScorerRanking: 2 },
    { teamId: nhlTeams[7].id, firstName: 'Gustav', lastName: 'Nyquist', position: 'RW', seasonGames: 81, seasonGoals: 23, seasonAssists: 52, topScorerRanking: 3 },
    { teamId: nhlTeams[7].id, firstName: 'Roman', lastName: 'Josi', position: 'D', seasonGames: 82, seasonGoals: 23, seasonAssists: 62, topScorerRanking: null },
    { teamId: nhlTeams[7].id, firstName: 'Ryan', lastName: 'McDonagh', position: 'D', seasonGames: 82, seasonGoals: 5, seasonAssists: 28, topScorerRanking: null },
  ]

  const createdNHLPlayers = await Promise.all(
    nhlPlayers.map(player => prisma.player.create({
      data: {
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        createdAt: now,
        updatedAt: now,
      }
    }))
  )

  console.log('✅ Created 8 NHL teams and 40 players')

  console.log('⚽ Creating Euro 2024 teams and players...')

  // 8. Euro 2024 Teams (8 teams)
  const euroTeams = await Promise.all([
    prisma.team.create({
      data: {
        sportId: football.id,
        name: 'Spain',
        shortcut: 'ESP',
        flagIcon: '🇪🇸',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: football.id,
        name: 'England',
        shortcut: 'ENG',
        flagIcon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: football.id,
        name: 'Germany',
        shortcut: 'GER',
        flagIcon: '🇩🇪',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: football.id,
        name: 'France',
        shortcut: 'FRA',
        flagIcon: '🇫🇷',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: football.id,
        name: 'Portugal',
        shortcut: 'POR',
        flagIcon: '🇵🇹',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: football.id,
        name: 'Netherlands',
        shortcut: 'NED',
        flagIcon: '🇳🇱',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: football.id,
        name: 'Switzerland',
        shortcut: 'SUI',
        flagIcon: '🇨🇭',
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.team.create({
      data: {
        sportId: football.id,
        name: 'Turkey',
        shortcut: 'TUR',
        flagIcon: '🇹🇷',
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  // 9. Euro 2024 Players (3 per team = 24 players)
  const euroPlayers = [
    // Spain
    { teamId: euroTeams[0].id, firstName: 'Álvaro', lastName: 'Morata', position: 'ST', seasonGames: 45, seasonGoals: 21, seasonAssists: 8, topScorerRanking: null },
    { teamId: euroTeams[0].id, firstName: 'Lamine', lastName: 'Yamal', position: 'RW', seasonGames: 50, seasonGoals: 7, seasonAssists: 10, topScorerRanking: null },
    { teamId: euroTeams[0].id, firstName: 'Dani', lastName: 'Olmo', position: 'CAM', seasonGames: 25, seasonGoals: 8, seasonAssists: 5, topScorerRanking: null },

    // England
    { teamId: euroTeams[1].id, firstName: 'Harry', lastName: 'Kane', position: 'ST', seasonGames: 45, seasonGoals: 44, seasonAssists: 12, topScorerRanking: null },
    { teamId: euroTeams[1].id, firstName: 'Jude', lastName: 'Bellingham', position: 'CAM', seasonGames: 42, seasonGoals: 23, seasonAssists: 13, topScorerRanking: null },
    { teamId: euroTeams[1].id, firstName: 'Phil', lastName: 'Foden', position: 'LW', seasonGames: 53, seasonGoals: 27, seasonAssists: 12, topScorerRanking: null },

    // Germany
    { teamId: euroTeams[2].id, firstName: 'Kai', lastName: 'Havertz', position: 'ST', seasonGames: 51, seasonGoals: 14, seasonAssists: 7, topScorerRanking: null },
    { teamId: euroTeams[2].id, firstName: 'Jamal', lastName: 'Musiala', position: 'CAM', seasonGames: 38, seasonGoals: 12, seasonAssists: 8, topScorerRanking: null },
    { teamId: euroTeams[2].id, firstName: 'Florian', lastName: 'Wirtz', position: 'CAM', seasonGames: 49, seasonGoals: 18, seasonAssists: 20, topScorerRanking: null },

    // France
    { teamId: euroTeams[3].id, firstName: 'Kylian', lastName: 'Mbappé', position: 'ST', seasonGames: 48, seasonGoals: 44, seasonAssists: 10, topScorerRanking: null },
    { teamId: euroTeams[3].id, firstName: 'Antoine', lastName: 'Griezmann', position: 'CAM', seasonGames: 48, seasonGoals: 24, seasonAssists: 8, topScorerRanking: null },
    { teamId: euroTeams[3].id, firstName: 'Randal', lastName: 'Kolo Muani', position: 'ST', seasonGames: 40, seasonGoals: 12, seasonAssists: 6, topScorerRanking: null },

    // Portugal
    { teamId: euroTeams[4].id, firstName: 'Cristiano', lastName: 'Ronaldo', position: 'ST', seasonGames: 51, seasonGoals: 50, seasonAssists: 13, topScorerRanking: null },
    { teamId: euroTeams[4].id, firstName: 'Bruno', lastName: 'Fernandes', position: 'CAM', seasonGames: 59, seasonGoals: 15, seasonAssists: 13, topScorerRanking: null },
    { teamId: euroTeams[4].id, firstName: 'Rafael', lastName: 'Leão', position: 'LW', seasonGames: 47, seasonGoals: 15, seasonAssists: 12, topScorerRanking: null },

    // Netherlands
    { teamId: euroTeams[5].id, firstName: 'Memphis', lastName: 'Depay', position: 'ST', seasonGames: 42, seasonGoals: 30, seasonAssists: 2, topScorerRanking: null },
    { teamId: euroTeams[5].id, firstName: 'Cody', lastName: 'Gakpo', position: 'LW', seasonGames: 53, seasonGoals: 16, seasonAssists: 11, topScorerRanking: null },
    { teamId: euroTeams[5].id, firstName: 'Xavi', lastName: 'Simons', position: 'CAM', seasonGames: 43, seasonGoals: 10, seasonAssists: 15, topScorerRanking: null },

    // Switzerland
    { teamId: euroTeams[6].id, firstName: 'Breel', lastName: 'Embolo', position: 'ST', seasonGames: 29, seasonGoals: 7, seasonAssists: 2, topScorerRanking: null },
    { teamId: euroTeams[6].id, firstName: 'Granit', lastName: 'Xhaka', position: 'CDM', seasonGames: 49, seasonGoals: 7, seasonAssists: 13, topScorerRanking: null },
    { teamId: euroTeams[6].id, firstName: 'Ruben', lastName: 'Vargas', position: 'LW', seasonGames: 32, seasonGoals: 7, seasonAssists: 4, topScorerRanking: null },

    // Turkey
    { teamId: euroTeams[7].id, firstName: 'Arda', lastName: 'Güler', position: 'CAM', seasonGames: 12, seasonGoals: 6, seasonAssists: 1, topScorerRanking: null },
    { teamId: euroTeams[7].id, firstName: 'Hakan', lastName: 'Çalhanoğlu', position: 'CDM', seasonGames: 50, seasonGoals: 15, seasonAssists: 4, topScorerRanking: null },
    { teamId: euroTeams[7].id, firstName: 'Kerem', lastName: 'Aktürkoğlu', position: 'LW', seasonGames: 47, seasonGoals: 19, seasonAssists: 11, topScorerRanking: null },
  ]

  const createdEuroPlayers = await Promise.all(
    euroPlayers.map(player => prisma.player.create({
      data: {
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        createdAt: now,
        updatedAt: now,
      }
    }))
  )

  console.log('✅ Created 8 Euro teams and 24 players')

  console.log('🏆 Creating leagues with evaluators, prizes, and fines...')

  // 10. League 1: NHL 2025/26 Playoffs (HOCKEY - Most Active)
  const nhlPlayoffs = await prisma.league.create({
    data: {
      sportId: hockey.id,
      name: 'NHL 2025/26 Playoffs',
      seasonFrom: 2025,
      seasonTo: 2026,
      isActive: true,
      isFinished: false,
      isTheMostActive: true,
      isChatEnabled: true,
      createdAt: now,
      updatedAt: now,
    }
  })

  // NHL Evaluators with scorer rank-based config
  const nhlEvaluators = await Promise.all([
    prisma.evaluator.create({
      data: {
        leagueId: nhlPlayoffs.id,
        name: 'Exact Score',
        evaluatorTypeId: evaluatorTypeMap['exact_score'],
        points: 5,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: nhlPlayoffs.id,
        name: 'Score Difference',
        evaluatorTypeId: evaluatorTypeMap['score_difference'],
        points: 3,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: nhlPlayoffs.id,
        name: 'One Team Score',
        evaluatorTypeId: evaluatorTypeMap['one_team_score'],
        points: 2,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: nhlPlayoffs.id,
        name: 'Winner',
        evaluatorTypeId: evaluatorTypeMap['winner'],
        points: 2,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: nhlPlayoffs.id,
        name: 'Scorer',
        evaluatorTypeId: evaluatorTypeMap['scorer'],
        points: 0, // Points set to 0 when using config
        config: {
          rankedPoints: {
            '1': 2,
            '2': 4,
            '3': 5,
          },
          unrankedPoints: 8,
        },
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: nhlPlayoffs.id,
        name: 'Playoff Advance',
        evaluatorTypeId: evaluatorTypeMap['soccer_playoff_advance'],
        points: 3,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: nhlPlayoffs.id,
        name: 'Draw',
        evaluatorTypeId: evaluatorTypeMap['draw'],
        points: 1,
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  // NHL Series Evaluators
  await Promise.all([
    prisma.evaluator.create({
      data: {
        leagueId: nhlPlayoffs.id,
        name: 'Series Exact',
        evaluatorTypeId: evaluatorTypeMap['series_exact'],
        entity: 'series',
        points: 5,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: nhlPlayoffs.id,
        name: 'Series Winner',
        evaluatorTypeId: evaluatorTypeMap['series_winner'],
        entity: 'series',
        points: 2,
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  // NHL Special Bet Evaluators
  await Promise.all([
    prisma.evaluator.create({
      data: {
        leagueId: nhlPlayoffs.id,
        name: 'Exact Player',
        evaluatorTypeId: evaluatorTypeMap['exact_player'],
        entity: 'special_bet',
        points: 10,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: nhlPlayoffs.id,
        name: 'Exact Team',
        evaluatorTypeId: evaluatorTypeMap['exact_team'],
        entity: 'special_bet',
        points: 8,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: nhlPlayoffs.id,
        name: 'Exact Value',
        evaluatorTypeId: evaluatorTypeMap['exact_value'],
        entity: 'special_bet',
        points: 6,
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  // NHL Question Evaluator
  await prisma.evaluator.create({
    data: {
      leagueId: nhlPlayoffs.id,
      name: 'Question',
      evaluatorTypeId: evaluatorTypeMap['question'],
      entity: 'question',
      points: 4,
      createdAt: now,
      updatedAt: now,
    }
  })

  // NHL Prizes (3 tiers)
  await Promise.all([
    prisma.leaguePrize.create({
      data: {
        leagueId: nhlPlayoffs.id,
        rank: 1,
        type: 'prize',
        amount: 30000, // 300 Kč in halers
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.leaguePrize.create({
      data: {
        leagueId: nhlPlayoffs.id,
        rank: 2,
        type: 'prize',
        amount: 20000, // 200 Kč
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.leaguePrize.create({
      data: {
        leagueId: nhlPlayoffs.id,
        rank: 3,
        type: 'prize',
        amount: 10000, // 100 Kč
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  // NHL Fines (2 tiers)
  await Promise.all([
    prisma.leaguePrize.create({
      data: {
        leagueId: nhlPlayoffs.id,
        rank: 1, // Last place
        type: 'fine',
        amount: -10000, // -100 Kč
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.leaguePrize.create({
      data: {
        leagueId: nhlPlayoffs.id,
        rank: 2, // Second to last
        type: 'fine',
        amount: -5000, // -50 Kč
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  // 11. League 2: Euro 2024 (FOOTBALL - Finished)
  const euro2024 = await prisma.league.create({
    data: {
      sportId: football.id,
      name: 'Euro 2024',
      seasonFrom: 2024,
      seasonTo: 2024,
      isActive: true,
      isFinished: true,
      isTheMostActive: false,
      isChatEnabled: false,
      createdAt: now,
      updatedAt: now,
    }
  })

  // Euro Match Evaluators
  await Promise.all([
    prisma.evaluator.create({
      data: {
        leagueId: euro2024.id,
        name: 'Exact Score',
        evaluatorTypeId: evaluatorTypeMap['exact_score'],
        points: 5,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: euro2024.id,
        name: 'Score Difference',
        evaluatorTypeId: evaluatorTypeMap['score_difference'],
        points: 3,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: euro2024.id,
        name: 'Winner',
        evaluatorTypeId: evaluatorTypeMap['winner'],
        points: 2,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: euro2024.id,
        name: 'Draw',
        evaluatorTypeId: evaluatorTypeMap['draw'],
        points: 1,
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  // Euro Special Bet Evaluators
  await Promise.all([
    prisma.evaluator.create({
      data: {
        leagueId: euro2024.id,
        name: 'Exact Player',
        evaluatorTypeId: evaluatorTypeMap['exact_player'],
        entity: 'special_bet',
        points: 10,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: euro2024.id,
        name: 'Exact Team',
        evaluatorTypeId: evaluatorTypeMap['exact_team'],
        entity: 'special_bet',
        points: 8,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: euro2024.id,
        name: 'Closest Value',
        evaluatorTypeId: evaluatorTypeMap['closest_value'],
        entity: 'special_bet',
        points: 6,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: euro2024.id,
        name: 'Group Stage Team',
        evaluatorTypeId: evaluatorTypeMap['group_stage_team'],
        entity: 'special_bet',
        points: 4,
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  // Euro Prizes (2 tiers)
  await Promise.all([
    prisma.leaguePrize.create({
      data: {
        leagueId: euro2024.id,
        rank: 1,
        type: 'prize',
        amount: 20000,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.leaguePrize.create({
      data: {
        leagueId: euro2024.id,
        rank: 2,
        type: 'prize',
        amount: 10000,
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  // Euro Fines (1 tier)
  await prisma.leaguePrize.create({
    data: {
      leagueId: euro2024.id,
      rank: 1,
      type: 'fine',
      amount: -5000,
      createdAt: now,
      updatedAt: now,
    }
  })

  // 12. League 3: NHL 2024/25 Regular Season (HOCKEY - Inactive, Finished)
  const nhlRegular = await prisma.league.create({
    data: {
      sportId: hockey.id,
      name: 'NHL 2024/25 Regular Season',
      seasonFrom: 2024,
      seasonTo: 2025,
      isActive: false,
      isFinished: true,
      isTheMostActive: false,
      isChatEnabled: false,
      createdAt: now,
      updatedAt: now,
    }
  })

  // NHL Regular Season Evaluators (basic match evaluators only)
  await Promise.all([
    prisma.evaluator.create({
      data: {
        leagueId: nhlRegular.id,
        name: 'Exact Score',
        evaluatorTypeId: evaluatorTypeMap['exact_score'],
        points: 5,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: nhlRegular.id,
        name: 'Score Difference',
        evaluatorTypeId: evaluatorTypeMap['score_difference'],
        points: 3,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.evaluator.create({
      data: {
        leagueId: nhlRegular.id,
        name: 'Winner',
        evaluatorTypeId: evaluatorTypeMap['winner'],
        points: 2,
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  console.log('✅ Created 3 leagues with evaluators, prizes, and fines')

  console.log('👥 Assigning users to leagues...')

  // 13. Assign all users to NHL Playoffs
  const nhlPlayoffsLeagueUsers = await Promise.all(
    allUsers.map((user, index) =>
      prisma.leagueUser.create({
        data: {
          leagueId: nhlPlayoffs.id,
          userId: user.id,
          createdAt: now,
          updatedAt: now,
        }
      })
    )
  )

  // Assign 10 users to Euro 2024
  const euro2024LeagueUsers = await Promise.all(
    allUsers.slice(0, 10).map((user, index) =>
      prisma.leagueUser.create({
        data: {
          leagueId: euro2024.id,
          userId: user.id,
          createdAt: now,
          updatedAt: now,
        }
      })
    )
  )

  // Assign 8 users to NHL Regular Season
  await Promise.all(
    allUsers.slice(0, 8).map(user =>
      prisma.leagueUser.create({
        data: {
          leagueId: nhlRegular.id,
          userId: user.id,
          createdAt: now,
          updatedAt: now,
        }
      })
    )
  )

  console.log('✅ Assigned users to leagues')

  console.log('🏒 Assigning NHL teams and players to league...')

  // 14. Assign NHL teams to NHL Playoffs
  const nhlLeagueTeams = await Promise.all(
    nhlTeams.map((team, index) =>
      prisma.leagueTeam.create({
        data: {
          leagueId: nhlPlayoffs.id,
          teamId: team.id,
          createdAt: now,
          updatedAt: now,
        }
      })
    )
  )

  // 15. Assign NHL players to league teams with rankings
  const nhlLeaguePlayers = await Promise.all(
    createdNHLPlayers.map((player, index) => {
      const originalPlayer = nhlPlayers[index]
      const leagueTeam = nhlLeagueTeams.find(lt => lt.teamId === originalPlayer.teamId)!

      return prisma.leaguePlayer.create({
        data: {
          leagueTeamId: leagueTeam.id,
          playerId: player.id,
          seasonGames: originalPlayer.seasonGames,
          seasonGoals: originalPlayer.seasonGoals,
          seasonAssists: originalPlayer.seasonAssists,
          topScorerRanking: originalPlayer.topScorerRanking,
          createdAt: now,
          updatedAt: now,
        }
      })
    })
  )

  console.log('✅ Assigned NHL teams and players')

  console.log('⚽ Assigning Euro teams and players to league...')

  // 16. Assign Euro teams to Euro 2024 (with group assignments)
  const euroGroups = ['A', 'B', 'A', 'B', 'A', 'B', 'A', 'B']
  const euroLeagueTeams = await Promise.all(
    euroTeams.map((team, index) =>
      prisma.leagueTeam.create({
        data: {
          leagueId: euro2024.id,
          teamId: team.id,
          group: euroGroups[index],
          createdAt: now,
          updatedAt: now,
        }
      })
    )
  )

  // 17. Assign Euro players to league teams
  await Promise.all(
    createdEuroPlayers.map((player, index) => {
      const originalPlayer = euroPlayers[index]
      const leagueTeam = euroLeagueTeams.find(lt => lt.teamId === originalPlayer.teamId)!

      return prisma.leaguePlayer.create({
        data: {
          leagueTeamId: leagueTeam.id,
          playerId: player.id,
          seasonGames: originalPlayer.seasonGames,
          seasonGoals: originalPlayer.seasonGoals,
          seasonAssists: originalPlayer.seasonAssists,
          topScorerRanking: null,
          createdAt: now,
          updatedAt: now,
        }
      })
    })
  )

  console.log('✅ Assigned Euro teams and players')

  console.log('🏒 Creating NHL Playoff matches...')

  // 18. Create NHL Playoff Matches (20 matches in varied states)
  // Quarter-finals (12 matches: 4 series × 3 matches each for demo)
  const qf1Matches = [
    // FLA vs EDM - Game 1 (Evaluated)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[0].id, // FLA
      awayTeamId: nhlLeagueTeams[1].id, // EDM
      matchPhaseId: quarterFinals.id,
      dateTime: createDate(-10, 19, 0),
      homeScore: 3,
      awayScore: 2,
      isOvertime: true,
      isShootout: false,
      isEvaluated: true,
      isDoubled: false,
    },
    // FLA vs EDM - Game 2 (Finished, not evaluated)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[0].id,
      awayTeamId: nhlLeagueTeams[1].id,
      matchPhaseId: quarterFinals.id,
      dateTime: createDate(-8, 20, 0),
      homeScore: 2,
      awayScore: 4,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: false,
    },
    // FLA vs EDM - Game 3 (Scheduled)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[1].id, // EDM home
      awayTeamId: nhlLeagueTeams[0].id,
      matchPhaseId: quarterFinals.id,
      dateTime: createDate(2, 19, 0),
      homeScore: null,
      awayScore: null,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: false,
    },
    // NYR vs CAR - Game 1 (Evaluated)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[2].id, // NYR
      awayTeamId: nhlLeagueTeams[3].id, // CAR
      matchPhaseId: quarterFinals.id,
      dateTime: createDate(-9, 19, 30),
      homeScore: 4,
      awayScore: 3,
      isOvertime: false,
      isShootout: false,
      isEvaluated: true,
      isDoubled: false,
    },
    // NYR vs CAR - Game 2 (Finished)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[2].id,
      awayTeamId: nhlLeagueTeams[3].id,
      matchPhaseId: quarterFinals.id,
      dateTime: createDate(-7, 20, 0),
      homeScore: 2,
      awayScore: 5,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: false,
    },
    // NYR vs CAR - Game 3 (Scheduled)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[3].id, // CAR home
      awayTeamId: nhlLeagueTeams[2].id,
      matchPhaseId: quarterFinals.id,
      dateTime: createDate(3, 18, 0),
      homeScore: null,
      awayScore: null,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: false,
    },
    // DAL vs COL - Game 1 (Evaluated)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[4].id, // DAL
      awayTeamId: nhlLeagueTeams[5].id, // COL
      matchPhaseId: quarterFinals.id,
      dateTime: createDate(-10, 18, 30),
      homeScore: 3,
      awayScore: 4,
      isOvertime: true,
      isShootout: false,
      isEvaluated: true,
      isDoubled: false,
    },
    // DAL vs COL - Game 2 (Finished)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[4].id,
      awayTeamId: nhlLeagueTeams[5].id,
      matchPhaseId: quarterFinals.id,
      dateTime: createDate(-8, 19, 0),
      homeScore: 5,
      awayScore: 2,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: false,
    },
    // DAL vs COL - Game 3 (Live)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[5].id, // COL home
      awayTeamId: nhlLeagueTeams[4].id,
      matchPhaseId: quarterFinals.id,
      dateTime: createDate(0, new Date().getHours() - 1, 0), // Started 1 hour ago
      homeScore: null,
      awayScore: null,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: false,
    },
    // VAN vs NSH - Game 1 (Evaluated)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[6].id, // VAN
      awayTeamId: nhlLeagueTeams[7].id, // NSH
      matchPhaseId: quarterFinals.id,
      dateTime: createDate(-9, 18, 0),
      homeScore: 2,
      awayScore: 1,
      isOvertime: false,
      isShootout: true,
      isEvaluated: true,
      isDoubled: false,
    },
    // VAN vs NSH - Game 2 (Finished)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[6].id,
      awayTeamId: nhlLeagueTeams[7].id,
      matchPhaseId: quarterFinals.id,
      dateTime: createDate(-7, 19, 30),
      homeScore: 3,
      awayScore: 3,
      isOvertime: true,
      isShootout: false,
      isEvaluated: false,
      isDoubled: false,
    },
    // VAN vs NSH - Game 3 (Scheduled)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[7].id, // NSH home
      awayTeamId: nhlLeagueTeams[6].id,
      matchPhaseId: quarterFinals.id,
      dateTime: createDate(4, 20, 0),
      homeScore: null,
      awayScore: null,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: false,
    },
  ]

  // Semi-finals (6 matches)
  const sfMatches = [
    // FLA vs NYR - Game 1 (Finished)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[0].id,
      awayTeamId: nhlLeagueTeams[2].id,
      matchPhaseId: semiFinals.id,
      dateTime: createDate(-5, 19, 0),
      homeScore: 3,
      awayScore: 2,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: false,
    },
    // FLA vs NYR - Game 2 (Finished)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[0].id,
      awayTeamId: nhlLeagueTeams[2].id,
      matchPhaseId: semiFinals.id,
      dateTime: createDate(-3, 20, 0),
      homeScore: 4,
      awayScore: 4,
      isOvertime: true,
      isShootout: true,
      isEvaluated: false,
      isDoubled: false,
    },
    // FLA vs NYR - Game 3 (Scheduled)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[2].id,
      awayTeamId: nhlLeagueTeams[0].id,
      matchPhaseId: semiFinals.id,
      dateTime: createDate(5, 19, 30),
      homeScore: null,
      awayScore: null,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: true, // Doubled points
    },
    // COL vs VAN - Game 1 (Finished)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[5].id,
      awayTeamId: nhlLeagueTeams[6].id,
      matchPhaseId: semiFinals.id,
      dateTime: createDate(-4, 18, 30),
      homeScore: 5,
      awayScore: 3,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: false,
    },
    // COL vs VAN - Game 2 (Live)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[5].id,
      awayTeamId: nhlLeagueTeams[6].id,
      matchPhaseId: semiFinals.id,
      dateTime: createDate(0, new Date().getHours(), 0), // Just started
      homeScore: null,
      awayScore: null,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: false,
    },
    // COL vs VAN - Game 3 (Scheduled)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[6].id,
      awayTeamId: nhlLeagueTeams[5].id,
      matchPhaseId: semiFinals.id,
      dateTime: createDate(6, 20, 0),
      homeScore: null,
      awayScore: null,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: false,
    },
  ]

  // Finals (2 matches)
  const finalsMatches = [
    // Anticipated FLA vs COL - Game 1 (Scheduled)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[0].id,
      awayTeamId: nhlLeagueTeams[5].id,
      matchPhaseId: finals.id,
      dateTime: createDate(8, 19, 0),
      homeScore: null,
      awayScore: null,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: true,
    },
    // Game 2 (Scheduled)
    {
      leagueId: nhlPlayoffs.id,
      homeTeamId: nhlLeagueTeams[0].id,
      awayTeamId: nhlLeagueTeams[5].id,
      matchPhaseId: finals.id,
      dateTime: createDate(10, 20, 0),
      homeScore: null,
      awayScore: null,
      isOvertime: false,
      isShootout: false,
      isEvaluated: false,
      isDoubled: true,
    },
  ]

  // Create Match records first, then LeagueMatch records
  const allNHLMatchesData = [...qf1Matches, ...sfMatches, ...finalsMatches]
  const createdNHLMatches = []

  for (const matchData of allNHLMatchesData) {
    // Create Match
    const match = await prisma.match.create({
      data: {
        homeTeamId: matchData.homeTeamId,
        awayTeamId: matchData.awayTeamId,
        dateTime: matchData.dateTime,
        homeRegularScore: matchData.homeScore,
        awayRegularScore: matchData.awayScore,
        homeFinalScore: matchData.homeScore,
        awayFinalScore: matchData.awayScore,
        isOvertime: matchData.isOvertime,
        isShootout: matchData.isShootout,
        isEvaluated: matchData.isEvaluated,
        matchPhaseId: matchData.matchPhaseId,
        isPlayoffGame: true,
        createdAt: now,
        updatedAt: now,
      }
    })

    // Create LeagueMatch
    const leagueMatch = await prisma.leagueMatch.create({
      data: {
        leagueId: matchData.leagueId,
        matchId: match.id,
        isDoubled: matchData.isDoubled,
        createdAt: now,
        updatedAt: now,
      }
    })

    createdNHLMatches.push(leagueMatch)
  }

  console.log('✅ Created 20 NHL matches')

  console.log('⚽ Creating Euro 2024 matches...')

  // 19. Create Euro 2024 Matches (10 matches - all evaluated)
  const euroMatches = [
    // Group Stage
    {
      leagueId: euro2024.id,
      homeTeamId: euroLeagueTeams[0].id, // Spain
      awayTeamId: euroLeagueTeams[2].id, // Germany
      leaguePhaseId: groupStage.id,
      dateTime: createDate(-60, 18, 0),
      homeScore: 1,
      awayScore: 1,
      isOvertime: false,
      isShootout: false,
      isEvaluated: true,
      isDoubled: false,
    },
    {
      leagueId: euro2024.id,
      homeTeamId: euroLeagueTeams[1].id, // England
      awayTeamId: euroLeagueTeams[3].id, // France
      leaguePhaseId: groupStage.id,
      dateTime: createDate(-58, 21, 0),
      homeScore: 1,
      awayScore: 2,
      isOvertime: false,
      isShootout: false,
      isEvaluated: true,
      isDoubled: false,
    },
    // Round of 16
    {
      leagueId: euro2024.id,
      homeTeamId: euroLeagueTeams[0].id,
      awayTeamId: euroLeagueTeams[6].id, // Switzerland
      leaguePhaseId: roundOf16.id,
      dateTime: createDate(-50, 18, 0),
      homeScore: 4,
      awayScore: 1,
      isOvertime: false,
      isShootout: false,
      isEvaluated: true,
      isDoubled: false,
    },
    {
      leagueId: euro2024.id,
      homeTeamId: euroLeagueTeams[1].id,
      awayTeamId: euroLeagueTeams[5].id, // Netherlands
      leaguePhaseId: roundOf16.id,
      dateTime: createDate(-48, 21, 0),
      homeScore: 2,
      awayScore: 1,
      isOvertime: true,
      isShootout: false,
      isEvaluated: true,
      isDoubled: false,
    },
    // Quarter-finals
    {
      leagueId: euro2024.id,
      homeTeamId: euroLeagueTeams[0].id,
      awayTeamId: euroLeagueTeams[4].id, // Portugal
      leaguePhaseId: quarters.id,
      dateTime: createDate(-45, 20, 0),
      homeScore: 0,
      awayScore: 0,
      isOvertime: false,
      isShootout: true, // Spain won on penalties
      isEvaluated: true,
      isDoubled: false,
    },
    {
      leagueId: euro2024.id,
      homeTeamId: euroLeagueTeams[1].id,
      awayTeamId: euroLeagueTeams[7].id, // Turkey
      leaguePhaseId: quarters.id,
      dateTime: createDate(-44, 18, 0),
      homeScore: 2,
      awayScore: 1,
      isOvertime: false,
      isShootout: false,
      isEvaluated: true,
      isDoubled: false,
    },
    // Semi-finals
    {
      leagueId: euro2024.id,
      homeTeamId: euroLeagueTeams[0].id,
      awayTeamId: euroLeagueTeams[3].id,
      leaguePhaseId: semis.id,
      dateTime: createDate(-40, 21, 0),
      homeScore: 2,
      awayScore: 1,
      isOvertime: false,
      isShootout: false,
      isEvaluated: true,
      isDoubled: false,
    },
    {
      leagueId: euro2024.id,
      homeTeamId: euroLeagueTeams[1].id,
      awayTeamId: euroLeagueTeams[5].id,
      leaguePhaseId: semis.id,
      dateTime: createDate(-39, 21, 0),
      homeScore: 2,
      awayScore: 1,
      isOvertime: false,
      isShootout: false,
      isEvaluated: true,
      isDoubled: false,
    },
    // Final
    {
      leagueId: euro2024.id,
      homeTeamId: euroLeagueTeams[0].id,
      awayTeamId: euroLeagueTeams[1].id,
      leaguePhaseId: final.id,
      dateTime: createDate(-35, 21, 0),
      homeScore: 2,
      awayScore: 1,
      isOvertime: false,
      isShootout: false,
      isEvaluated: true,
      isDoubled: true,
    },
    // Third place (Netherlands vs France)
    {
      leagueId: euro2024.id,
      homeTeamId: euroLeagueTeams[5].id,
      awayTeamId: euroLeagueTeams[3].id,
      leaguePhaseId: final.id,
      dateTime: createDate(-36, 18, 0),
      homeScore: 2,
      awayScore: 2,
      isOvertime: true,
      isShootout: true, // Netherlands won on penalties
      isEvaluated: true,
      isDoubled: false,
    },
  ]

  // Create Match records first, then LeagueMatch records (Euro uses leaguePhaseId, not matchPhaseId)
  const createdEuroMatches = []

  for (const matchData of euroMatches) {
    // Create Match (Euro matches don't use matchPhaseId)
    const match = await prisma.match.create({
      data: {
        homeTeamId: matchData.homeTeamId,
        awayTeamId: matchData.awayTeamId,
        dateTime: matchData.dateTime,
        homeRegularScore: matchData.homeScore,
        awayRegularScore: matchData.awayScore,
        homeFinalScore: matchData.homeScore,
        awayFinalScore: matchData.awayScore,
        isOvertime: matchData.isOvertime,
        isShootout: matchData.isShootout,
        isEvaluated: matchData.isEvaluated,
        isPlayoffGame: false,
        createdAt: now,
        updatedAt: now,
      }
    })

    // Create LeagueMatch
    const leagueMatch = await prisma.leagueMatch.create({
      data: {
        leagueId: matchData.leagueId,
        matchId: match.id,
        isDoubled: matchData.isDoubled,
        createdAt: now,
        updatedAt: now,
      }
    })

    createdEuroMatches.push(leagueMatch)
  }

  console.log('✅ Created 10 Euro matches')

  console.log('🏒 Creating series bet types and series bets...')

  // Create SpecialBetSerie types (global types)
  const playoffSeriesType = await prisma.specialBetSerie.create({
    data: {
      name: 'NHL Playoff Series',
      bestOf: 7,
      createdAt: now,
      updatedAt: now,
    }
  })

  // Create SpecialBetSingleType types (global types)
  const specialBetTypes = await Promise.all([
    prisma.specialBetSingleType.create({
      data: { name: 'Top Scorer', createdAt: now, updatedAt: now }
    }),
    prisma.specialBetSingleType.create({
      data: { name: 'Tournament Winner', createdAt: now, updatedAt: now }
    }),
    prisma.specialBetSingleType.create({
      data: { name: 'Total Goals', createdAt: now, updatedAt: now }
    }),
    prisma.specialBetSingleType.create({
      data: { name: 'Golden Boot', createdAt: now, updatedAt: now }
    }),
    prisma.specialBetSingleType.create({
      data: { name: 'Group Winner', createdAt: now, updatedAt: now }
    }),
  ])

  // Create SpecialBetSingle (global records linking type + sport)
  const nhlTopScorerGlobal = await prisma.specialBetSingle.create({
    data: {
      sportId: hockey.id,
      specialBetSingleTypeId: specialBetTypes[0].id,
      name: 'NHL Top Scorer',
      createdAt: now,
      updatedAt: now,
    }
  })

  const nhlChampionGlobal = await prisma.specialBetSingle.create({
    data: {
      sportId: hockey.id,
      specialBetSingleTypeId: specialBetTypes[1].id,
      name: 'Stanley Cup Winner',
      createdAt: now,
      updatedAt: now,
    }
  })

  const nhlTotalGoalsGlobal = await prisma.specialBetSingle.create({
    data: {
      sportId: hockey.id,
      specialBetSingleTypeId: specialBetTypes[2].id,
      name: 'NHL Total Playoff Goals',
      createdAt: now,
      updatedAt: now,
    }
  })

  const euroGoldenBootGlobal = await prisma.specialBetSingle.create({
    data: {
      sportId: football.id,
      specialBetSingleTypeId: specialBetTypes[3].id,
      name: 'Euro Golden Boot',
      createdAt: now,
      updatedAt: now,
    }
  })

  const euroChampionGlobal = await prisma.specialBetSingle.create({
    data: {
      sportId: football.id,
      specialBetSingleTypeId: specialBetTypes[1].id,
      name: 'Euro Champion',
      createdAt: now,
      updatedAt: now,
    }
  })

  const euroTotalGoalsGlobal = await prisma.specialBetSingle.create({
    data: {
      sportId: football.id,
      specialBetSingleTypeId: specialBetTypes[2].id,
      name: 'Euro Total Goals',
      createdAt: now,
      updatedAt: now,
    }
  })

  const euroGroupWinnerGlobal = await prisma.specialBetSingle.create({
    data: {
      sportId: football.id,
      specialBetSingleTypeId: specialBetTypes[4].id,
      name: 'Euro Group A Winner',
      createdAt: now,
      updatedAt: now,
    }
  })

  console.log('✅ Created global special bet types')

  // NHL Series Bets (LeagueSpecialBetSerie)
  const nhlSeries = await Promise.all([
    // FLA vs EDM Quarter-final
    prisma.leagueSpecialBetSerie.create({
      data: {
        leagueId: nhlPlayoffs.id,
        specialBetSerieId: playoffSeriesType.id,
        homeTeamId: nhlLeagueTeams[0].id, // FLA
        awayTeamId: nhlLeagueTeams[1].id, // EDM
        dateTime: createDate(2, 19, 0),
        homeTeamScore: null,
        awayTeamScore: null,
        isEvaluated: false,
        createdAt: now,
        updatedAt: now,
      }
    }),
    // NYR vs CAR Quarter-final
    prisma.leagueSpecialBetSerie.create({
      data: {
        leagueId: nhlPlayoffs.id,
        specialBetSerieId: playoffSeriesType.id,
        homeTeamId: nhlLeagueTeams[2].id, // NYR
        awayTeamId: nhlLeagueTeams[3].id, // CAR
        dateTime: createDate(2, 19, 30),
        homeTeamScore: null,
        awayTeamScore: null,
        isEvaluated: false,
        createdAt: now,
        updatedAt: now,
      }
    }),
    // DAL vs COL Quarter-final (evaluated)
    prisma.leagueSpecialBetSerie.create({
      data: {
        leagueId: nhlPlayoffs.id,
        specialBetSerieId: playoffSeriesType.id,
        homeTeamId: nhlLeagueTeams[4].id, // DAL
        awayTeamId: nhlLeagueTeams[5].id, // COL
        dateTime: createDate(-10, 18, 30),
        homeTeamScore: 4,
        awayTeamScore: 2,
        isEvaluated: true,
        createdAt: now,
        updatedAt: now,
      }
    }),
    // VAN vs NSH Quarter-final (evaluated)
    prisma.leagueSpecialBetSerie.create({
      data: {
        leagueId: nhlPlayoffs.id,
        specialBetSerieId: playoffSeriesType.id,
        homeTeamId: nhlLeagueTeams[6].id, // VAN
        awayTeamId: nhlLeagueTeams[7].id, // NSH
        dateTime: createDate(-9, 18, 0),
        homeTeamScore: 4,
        awayTeamScore: 1,
        isEvaluated: true,
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  console.log('✅ Created 4 series bets')

  console.log('🎲 Creating special bets...')

  // NHL Special Bets
  const nhlSpecialBets = await Promise.all([
    prisma.leagueSpecialBetSingle.create({
      data: {
        leagueId: nhlPlayoffs.id,
        specialBetSingleId: nhlTopScorerGlobal.id,
        evaluatorId: evaluatorTypeMap['exact_player'],
        points: 10,
        dateTime: createDate(15, 20, 0),
        isEvaluated: false,
        specialBetPlayerResultId: null,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.leagueSpecialBetSingle.create({
      data: {
        leagueId: nhlPlayoffs.id,
        specialBetSingleId: nhlChampionGlobal.id,
        evaluatorId: evaluatorTypeMap['exact_team'],
        points: 15,
        dateTime: createDate(20, 20, 0),
        isEvaluated: false,
        specialBetTeamResultId: null,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.leagueSpecialBetSingle.create({
      data: {
        leagueId: nhlPlayoffs.id,
        specialBetSingleId: nhlTotalGoalsGlobal.id,
        evaluatorId: evaluatorTypeMap['exact_value'],
        points: 8,
        dateTime: createDate(20, 20, 0),
        isEvaluated: false,
        specialBetValue: null,
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  // Euro Special Bets (all evaluated)
  const euroSpecialBets = await Promise.all([
    prisma.leagueSpecialBetSingle.create({
      data: {
        leagueId: euro2024.id,
        specialBetSingleId: euroGoldenBootGlobal.id,
        evaluatorId: evaluatorTypeMap['exact_player'],
        points: 10,
        dateTime: createDate(-30, 20, 0),
        isEvaluated: true,
        specialBetPlayerResultId: nhlLeaguePlayers.find(p => p.playerId === createdEuroPlayers[3].id)?.id || null, // Harry Kane
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.leagueSpecialBetSingle.create({
      data: {
        leagueId: euro2024.id,
        specialBetSingleId: euroChampionGlobal.id,
        evaluatorId: evaluatorTypeMap['exact_team'],
        points: 15,
        dateTime: createDate(-30, 20, 0),
        isEvaluated: true,
        specialBetTeamResultId: euroLeagueTeams[0].id, // Spain
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.leagueSpecialBetSingle.create({
      data: {
        leagueId: euro2024.id,
        specialBetSingleId: euroTotalGoalsGlobal.id,
        evaluatorId: evaluatorTypeMap['closest_value'],
        points: 8,
        dateTime: createDate(-30, 20, 0),
        isEvaluated: true,
        specialBetValue: 117,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.leagueSpecialBetSingle.create({
      data: {
        leagueId: euro2024.id,
        specialBetSingleId: euroGroupWinnerGlobal.id,
        evaluatorId: evaluatorTypeMap['exact_team'],
        points: 5,
        dateTime: createDate(-35, 20, 0),
        isEvaluated: true,
        specialBetTeamResultId: euroLeagueTeams[0].id, // Spain from Group A
        group: 'A',
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  const createdSpecialBets = [...nhlSpecialBets, ...euroSpecialBets]

  console.log('✅ Created 7 special bets')

  console.log('❓ Creating questions...')

  // Create Questions (yes/no bets)
  const nhlQuestions = await Promise.all([
    prisma.leagueSpecialBetQuestion.create({
      data: {
        leagueId: nhlPlayoffs.id,
        text: 'Will the Finals series go to Game 7?',
        dateTime: createDate(20, 20, 0),
        result: null,
        isEvaluated: false,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.leagueSpecialBetQuestion.create({
      data: {
        leagueId: nhlPlayoffs.id,
        text: 'Will there be a hat trick in the Finals?',
        dateTime: createDate(20, 20, 0),
        result: null,
        isEvaluated: false,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.leagueSpecialBetQuestion.create({
      data: {
        leagueId: nhlPlayoffs.id,
        text: 'Will OT be needed in Finals Game 1?',
        dateTime: createDate(15, 19, 0),
        result: null,
        isEvaluated: false,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.leagueSpecialBetQuestion.create({
      data: {
        leagueId: nhlPlayoffs.id,
        text: 'Will Connor McDavid score in the Finals?',
        dateTime: createDate(15, 19, 0),
        result: null,
        isEvaluated: false,
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  const euroQuestions = await Promise.all([
    prisma.leagueSpecialBetQuestion.create({
      data: {
        leagueId: euro2024.id,
        text: 'Did Cristiano Ronaldo score in the tournament?',
        dateTime: createDate(-30, 20, 0),
        result: true,
        isEvaluated: true,
        createdAt: now,
        updatedAt: now,
      }
    }),
    prisma.leagueSpecialBetQuestion.create({
      data: {
        leagueId: euro2024.id,
        text: 'Was there a penalty shootout in the Final?',
        dateTime: createDate(-30, 20, 0),
        result: false,
        isEvaluated: true,
        createdAt: now,
        updatedAt: now,
      }
    }),
  ])

  const createdQuestions = [...nhlQuestions, ...euroQuestions]

  console.log('✅ Created 6 questions')

  console.log('🎰 Creating user bets...')

  // Helper to get random elements from array
  const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
  const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

  // NHL Match Bets (400+ bets)
  const nhlMatchBets = []
  for (const leagueMatch of createdNHLMatches) {
    // Fetch the Match record to get team and game info
    const match = await prisma.match.findUnique({
      where: { id: leagueMatch.matchId }
    })

    if (!match) continue

    // 12-15 users bet on each match
    const numBettors = getRandomInt(12, 15)
    const bettors = [...allUsers].sort(() => 0.5 - Math.random()).slice(0, numBettors)

    for (const user of bettors) {
      const leagueUser = nhlPlayoffsLeagueUsers.find(lu => lu.userId === user.id)!

      // Find a random scorer from one of the teams in this match
      const homeTeam = nhlLeagueTeams.find(lt => lt.id === match.homeTeamId)
      const awayTeam = nhlLeagueTeams.find(lt => lt.id === match.awayTeamId)

      if (!homeTeam || !awayTeam) continue

      const homeTeamPlayers = nhlLeaguePlayers.filter(lp => lp.leagueTeamId === homeTeam.id)
      const awayTeamPlayers = nhlLeaguePlayers.filter(lp => lp.leagueTeamId === awayTeam.id)
      const allMatchPlayers = [...homeTeamPlayers, ...awayTeamPlayers]

      if (allMatchPlayers.length === 0) continue

      const scorer = getRandomElement(allMatchPlayers)
      const betDateTime = new Date(match.dateTime.getTime() - 24 * 60 * 60 * 1000) // 1 day before match

      nhlMatchBets.push({
        leagueMatchId: leagueMatch.id,
        leagueUserId: leagueUser.id,
        dateTime: betDateTime,
        homeScore: match.homeFinalScore !== null ? getRandomInt(0, 5) : getRandomInt(2, 4),
        awayScore: match.awayFinalScore !== null ? getRandomInt(0, 5) : getRandomInt(1, 4),
        scorerId: scorer.id,
        overtime: Math.random() > 0.7,
        totalPoints: match.isEvaluated ? getRandomInt(0, 20) : 0,
        createdAt: betDateTime,
        updatedAt: betDateTime,
      })
    }
  }

  await Promise.all(
    nhlMatchBets.map(bet => prisma.userBet.create({ data: bet }))
  )

  console.log(`✅ Created ${nhlMatchBets.length} NHL match bets`)

  // Euro Match Bets (100+ bets)
  const euroMatchBets = []
  for (const leagueMatch of createdEuroMatches) {
    // Fetch the Match record to get team and game info
    const match = await prisma.match.findUnique({
      where: { id: leagueMatch.matchId }
    })

    if (!match) continue

    const numBettors = getRandomInt(8, 10)
    const bettors = [...allUsers].slice(0, 10).sort(() => 0.5 - Math.random()).slice(0, numBettors)

    for (const user of bettors) {
      const leagueUser = euro2024LeagueUsers.find(lu => lu.userId === user.id)
      if (!leagueUser) continue

      const betDateTime = new Date(match.dateTime.getTime() - 48 * 60 * 60 * 1000)

      euroMatchBets.push({
        leagueMatchId: leagueMatch.id,
        leagueUserId: leagueUser.id,
        dateTime: betDateTime,
        homeScore: getRandomInt(0, 3),
        awayScore: getRandomInt(0, 3),
        scorerId: null,
        overtime: false,
        totalPoints: match.isEvaluated ? getRandomInt(0, 10) : 0,
        createdAt: betDateTime,
        updatedAt: betDateTime,
      })
    }
  }

  await Promise.all(
    euroMatchBets.map(bet => prisma.userBet.create({ data: bet }))
  )

  console.log(`✅ Created ${euroMatchBets.length} Euro match bets`)

  // Series Bets (60+ bets)
  const seriesBets = []
  for (const series of nhlSeries) {
    const numBettors = 15
    for (let i = 0; i < numBettors; i++) {
      const user = allUsers[i]
      const leagueUser = nhlPlayoffsLeagueUsers.find(lu => lu.userId === user.id)!

      const possibleResults = [
        { homeTeamScore: 4, awayTeamScore: 0 },
        { homeTeamScore: 4, awayTeamScore: 1 },
        { homeTeamScore: 4, awayTeamScore: 2 },
        { homeTeamScore: 4, awayTeamScore: 3 },
        { homeTeamScore: 3, awayTeamScore: 4 },
        { homeTeamScore: 2, awayTeamScore: 4 },
        { homeTeamScore: 1, awayTeamScore: 4 },
        { homeTeamScore: 0, awayTeamScore: 4 },
      ]

      const result = getRandomElement(possibleResults)
      const betDateTime = createDate(-15)

      seriesBets.push({
        leagueSpecialBetSerieId: series.id,
        leagueUserId: leagueUser.id,
        homeTeamScore: result.homeTeamScore,
        awayTeamScore: result.awayTeamScore,
        dateTime: betDateTime,
        totalPoints: series.isEvaluated ? getRandomInt(0, 7) : 0,
        createdAt: betDateTime,
        updatedAt: betDateTime,
      })
    }
  }

  await Promise.all(
    seriesBets.map(bet => prisma.userSpecialBetSerie.create({ data: bet }))
  )

  console.log(`✅ Created ${seriesBets.length} series bets`)

  // Special Bets (70+ bets)
  const specialBetsData = []
  for (const specialBet of createdSpecialBets) {
    const isNHL = specialBet.leagueId === nhlPlayoffs.id
    const leagueUsers = isNHL ? nhlPlayoffsLeagueUsers : euro2024LeagueUsers
    const numBettors = isNHL ? 15 : 10

    for (let i = 0; i < numBettors; i++) {
      const leagueUser = leagueUsers[i]
      const betDateTime = createDate(-20)

      // Determine bet type by checking which fields are set on the special bet
      const betData: any = {
        leagueSpecialBetSingleId: specialBet.id,
        leagueUserId: leagueUser.id,
        dateTime: betDateTime,
        totalPoints: specialBet.isEvaluated ? getRandomInt(0, 10) : 0,
        createdAt: betDateTime,
        updatedAt: betDateTime,
      }

      // Determine type by checking result fields (player, team, or value)
      const hasPlayerResult = specialBet.specialBetPlayerResultId !== null
      const hasTeamResult = specialBet.specialBetTeamResultId !== null
      const hasValueResult = specialBet.specialBetValue !== null

      if (hasPlayerResult || (!hasTeamResult && !hasValueResult)) {
        // Player-based bet (exact_player)
        const players = isNHL ? nhlLeaguePlayers : nhlLeaguePlayers.filter(p =>
          euroLeagueTeams.some(lt => lt.id === p.leagueTeamId)
        )
        if (players.length > 0) {
          betData.playerResultId = getRandomElement(players).id
        }
      } else if (hasTeamResult) {
        // Team-based bet (exact_team)
        const teams = isNHL ? nhlLeagueTeams : euroLeagueTeams
        betData.teamResultId = getRandomElement(teams).id
      } else if (hasValueResult) {
        // Value-based bet (exact_value or closest_value)
        betData.value = getRandomInt(80, 150)
      }

      specialBetsData.push(betData)
    }
  }

  await Promise.all(
    specialBetsData.map(bet => prisma.userSpecialBetSingle.create({ data: bet }))
  )

  console.log(`✅ Created ${specialBetsData.length} special bets`)

  // Question Bets (60+ bets)
  const questionBets = []
  for (const question of createdQuestions) {
    const isNHL = question.leagueId === nhlPlayoffs.id
    const leagueUsers = isNHL ? nhlPlayoffsLeagueUsers : euro2024LeagueUsers
    const numBettors = isNHL ? 15 : 10

    for (let i = 0; i < numBettors; i++) {
      const leagueUser = leagueUsers[i]
      const betDateTime = createDate(-18)

      questionBets.push({
        leagueSpecialBetQuestionId: question.id,
        leagueUserId: leagueUser.id,
        userBet: Math.random() > 0.5,
        dateTime: betDateTime,
        totalPoints: question.isEvaluated ? getRandomInt(-2, 4) : 0,
        createdAt: betDateTime,
        updatedAt: betDateTime,
      })
    }
  }

  await Promise.all(
    questionBets.map(bet => prisma.userSpecialBetQuestion.create({ data: bet }))
  )

  console.log(`✅ Created ${questionBets.length} question bets`)

  // Create Match Scorers for evaluated NHL matches
  console.log('🎯 Creating match scorers...')

  const matchScorers = []

  for (const leagueMatch of createdNHLMatches) {
    // Fetch the Match record
    const match = await prisma.match.findUnique({
      where: { id: leagueMatch.matchId }
    })

    if (!match || !match.isEvaluated) continue

    const homeTeam = nhlLeagueTeams.find(lt => lt.id === match.homeTeamId)
    const awayTeam = nhlLeagueTeams.find(lt => lt.id === match.awayTeamId)

    if (!homeTeam || !awayTeam) continue

    const homeTeamPlayers = nhlLeaguePlayers.filter(lp => lp.leagueTeamId === homeTeam.id)
    const awayTeamPlayers = nhlLeaguePlayers.filter(lp => lp.leagueTeamId === awayTeam.id)

    // Add 2-3 scorers per match
    const numScorers = getRandomInt(2, 3)
    for (let i = 0; i < numScorers; i++) {
      const fromHome = Math.random() > 0.5
      const players = fromHome ? homeTeamPlayers : awayTeamPlayers

      if (players.length === 0) continue

      const scorer = getRandomElement(players)

      matchScorers.push({
        matchId: match.id,
        scorerId: scorer.id,
        numberOfGoals: getRandomInt(1, 2),
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  await Promise.all(
    matchScorers.map(ms => prisma.matchScorer.create({ data: ms }))
  )

  console.log(`✅ Created ${matchScorers.length} match scorers`)

  // Create chat messages
  console.log('💬 Creating chat messages...')

  const chatMessagesData = [
    { userId: users[0].id, text: 'Good luck everyone! 🏒' },
    { userId: users[1].id, text: 'FLA vs EDM is going to be epic!' },
    { userId: users[2].id, text: 'McDavid for the Conn Smythe!' },
    { userId: users[3].id, text: 'I think Panthers will sweep' },
    { userId: users[0].id, text: 'No way, Oilers in 6' },
    { userId: users[4].id, text: 'Who else picked Tkachuk for top scorer?' },
    { userId: users[5].id, text: 'Me! He\'s been on fire' },
    { userId: users[6].id, text: 'Anyone watching the game tonight?' },
    { userId: users[7].id, text: 'Yeah! Should be a great one' },
    { userId: users[1].id, text: 'My bet on Game 1 was terrible 😅' },
    { userId: users[2].id, text: 'Same here, totally missed the OT' },
    { userId: users[8].id, text: 'Who\'s leading the standings?' },
    { userId: users[9].id, text: 'Check the leaderboard, it\'s close!' },
    { userId: users[3].id, text: 'I need Game 7 for my question bet' },
    { userId: users[10].id, text: 'Let\'s go Rangers! 🗽' },
    { userId: users[11].id, text: 'Canes are looking strong though' },
    { userId: users[4].id, text: 'Colorado vs Dallas is my favorite series' },
    { userId: users[12].id, text: 'MacKinnon is unreal this playoffs' },
    { userId: users[13].id, text: 'Don\'t sleep on the Stars' },
    { userId: users[5].id, text: 'Anyone else going for VAN?' },
    { userId: users[6].id, text: 'Hughes has been amazing' },
    { userId: users[0].id, text: 'Nashville is a tough matchup' },
    { userId: users[7].id, text: 'Forsberg is clutch in playoffs' },
    { userId: users[1].id, text: 'Can\'t wait for the Finals!' },
    { userId: users[8].id, text: 'This is the best playoffs in years' },
  ]

  const chatMessages = []
  for (let i = 0; i < chatMessagesData.length; i++) {
    const msg = chatMessagesData[i]
    const leagueUser = nhlPlayoffsLeagueUsers.find(lu => lu.userId === msg.userId)!
    const msgTime = createDate(-15 + i, 10 + (i % 12), 0)

    chatMessages.push({
      leagueId: nhlPlayoffs.id,
      leagueUserId: leagueUser.id,
      text: msg.text,
      createdAt: msgTime,
      updatedAt: msgTime,
    })
  }

  await Promise.all(
    chatMessages.map(msg => prisma.message.create({ data: msg }))
  )

  console.log(`✅ Created ${chatMessages.length} chat messages`)

  // Create top scorer ranking versions
  console.log('📊 Creating top scorer rankings...')

  // Get ranked players (those with topScorerRanking set)
  const rankedPlayers = nhlLeaguePlayers.filter(p => p.topScorerRanking !== null)

  // Create current ranking version
  const currentRankings = []
  for (const player of rankedPlayers) {
    currentRankings.push({
      leagueId: nhlPlayoffs.id,
      leaguePlayerId: player.id,
      ranking: player.topScorerRanking!,
      effectiveFrom: createDate(-30),
      effectiveTo: null, // Current version
      createdAt: now,
    })
  }

  await Promise.all(
    currentRankings.map(r => prisma.topScorerRankingVersion.create({ data: r }))
  )

  // Create historical ranking version (expired)
  const historicalRankings = []
  for (const player of rankedPlayers.slice(0, 5)) { // Just first 5 for historical
    historicalRankings.push({
      leagueId: nhlPlayoffs.id,
      leaguePlayerId: player.id,
      ranking: player.topScorerRanking! + 1, // Different historical ranking
      effectiveFrom: createDate(-60),
      effectiveTo: createDate(-30),
      createdAt: createDate(-60),
    })
  }

  await Promise.all(
    historicalRankings.map(r => prisma.topScorerRankingVersion.create({ data: r }))
  )

  console.log('✅ Created top scorer ranking versions')

  console.log('✨ Demo database seeded successfully!')
  console.log('')
  console.log('📊 Summary:')
  console.log('  - 15 users (1 admin + 14 regular)')
  console.log('  - 3 leagues (NHL Playoffs, Euro 2024, NHL Regular Season)')
  console.log('  - 16 teams (8 NHL + 8 Euro)')
  console.log('  - 64 players (40 NHL + 24 Euro)')
  console.log('  - 30 matches (20 NHL + 10 Euro)')
  console.log('  - 4 series bets')
  console.log('  - 7 special bets')
  console.log('  - 6 questions')
  console.log(`  - ${nhlMatchBets.length + euroMatchBets.length} match bets`)
  console.log(`  - ${seriesBets.length} series bets`)
  console.log(`  - ${specialBetsData.length} special bets`)
  console.log(`  - ${questionBets.length} question bets`)
  console.log(`  - ${matchScorers.length} match scorers`)
  console.log(`  - ${chatMessages.length} chat messages`)
  console.log('')
  console.log('🔑 Demo Credentials:')
  console.log('  Admin: demo_admin / demo123')
  console.log('  User:  demo_user1 / demo123')
  console.log('')
}

// Export for use in cron jobs and other contexts
export { main as seedDemo, prisma }

// Only run directly when executed as a script (not when imported)
if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Error seeding database:', e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
