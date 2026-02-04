import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper for timestamp fields
const now = new Date()

// Sport ID for Hockey
const HOCKEY_SPORT_ID = 1

// Team data with flag emojis
const teamsData = [
  // Group A
  { name: 'Canada', shortcut: 'CAN', flagIcon: '🇨🇦', group: 'A' },
  { name: 'Czechia', shortcut: 'CZE', flagIcon: '🇨🇿', group: 'A' },
  { name: 'Switzerland', shortcut: 'SUI', flagIcon: '🇨🇭', group: 'A' },
  { name: 'France', shortcut: 'FRA', flagIcon: '🇫🇷', group: 'A' },
  // Group B
  { name: 'Finland', shortcut: 'FIN', flagIcon: '🇫🇮', group: 'B' },
  { name: 'Sweden', shortcut: 'SWE', flagIcon: '🇸🇪', group: 'B' },
  { name: 'Slovakia', shortcut: 'SVK', flagIcon: '🇸🇰', group: 'B' },
  { name: 'Italy', shortcut: 'ITA', flagIcon: '🇮🇹', group: 'B' },
  // Group C
  { name: 'USA', shortcut: 'USA', flagIcon: '🇺🇸', group: 'C' },
  { name: 'Germany', shortcut: 'GER', flagIcon: '🇩🇪', group: 'C' },
  { name: 'Latvia', shortcut: 'LAT', flagIcon: '🇱🇻', group: 'C' },
  { name: 'Denmark', shortcut: 'DEN', flagIcon: '🇩🇰', group: 'C' },
]

// Matches data: [date, time, homeTeam, awayTeam]
// Timezone: CET (Central European Time) - matches are in Milan, Italy
const matchesData: [string, string, string, string][] = [
  ['2026-02-11', '16:40', 'Slovakia', 'Finland'],
  ['2026-02-11', '21:10', 'Sweden', 'Italy'],
  ['2026-02-12', '12:10', 'Switzerland', 'France'],
  ['2026-02-12', '16:40', 'Czechia', 'Canada'],
  ['2026-02-12', '21:10', 'Latvia', 'USA'],
  ['2026-02-12', '21:10', 'Germany', 'Denmark'],
  ['2026-02-13', '12:10', 'Finland', 'Sweden'],
  ['2026-02-13', '12:10', 'Italy', 'Slovakia'],
  ['2026-02-13', '16:40', 'France', 'Czechia'],
  ['2026-02-13', '21:10', 'Canada', 'Switzerland'],
  ['2026-02-14', '12:10', 'Sweden', 'Slovakia'],
  ['2026-02-14', '12:10', 'Germany', 'Latvia'],
  ['2026-02-14', '16:40', 'Finland', 'Italy'],
  ['2026-02-14', '21:10', 'USA', 'Denmark'],
  ['2026-02-15', '12:10', 'Switzerland', 'Czechia'],
  ['2026-02-15', '16:40', 'Canada', 'France'],
  ['2026-02-15', '19:10', 'Denmark', 'Latvia'],
  ['2026-02-15', '21:10', 'USA', 'Germany'],
]

// Player rosters by country
// Format: [jerseyNumber | null, firstName, lastName, position]
// Position: G = Goaltender, D = Defenseman, F = Forward
type PlayerData = [number | null, string, string, string]

const rostersData: Record<string, PlayerData[]> = {
  Canada: [
    [6, 'Travis', 'Sanheim', 'D'],
    [7, 'Devon', 'Toews', 'D'],
    [8, 'Cale', 'Makar', 'D'],
    [9, 'Sam', 'Bennett', 'F'],
    [10, 'Nick', 'Suzuki', 'F'],
    [13, 'Sam', 'Reinhart', 'F'],
    [14, 'Bo', 'Horvat', 'F'],
    [17, 'Macklin', 'Celebrini', 'F'],
    [20, 'Thomas', 'Harley', 'D'],
    [21, 'Brayden', 'Point', 'F'],
    [27, 'Shea', 'Theodore', 'D'],
    [29, 'Nathan', 'MacKinnon', 'F'],
    [35, 'Darcy', 'Kuemper', 'G'],
    [38, 'Brandon', 'Hagel', 'F'],
    [43, 'Tom', 'Wilson', 'F'],
    [44, 'Josh', 'Morrissey', 'D'],
    [48, 'Logan', 'Thompson', 'G'],
    [50, 'Jordan', 'Binnington', 'G'],
    [55, 'Colton', 'Parayko', 'D'],
    [61, 'Mark', 'Stone', 'F'],
    [63, 'Brad', 'Marchand', 'F'],
    [87, 'Sidney', 'Crosby', 'F'],
    [89, 'Drew', 'Doughty', 'D'],
    [93, 'Mitch', 'Marner', 'F'],
    [97, 'Connor', 'McDavid', 'F'],
  ],
  Czechia: [
    [1, 'Lukáš', 'Dostál', 'G'],
    [3, 'Radko', 'Gudas', 'D'],
    [6, 'Michal', 'Kempný', 'D'],
    [7, 'David', 'Špaček', 'D'],
    [10, 'Roman', 'Červenka', 'F'],
    [12, 'Radek', 'Faksa', 'F'],
    [14, 'Pavel', 'Zacha', 'F'],
    [17, 'Filip', 'Hronek', 'D'],
    [18, 'Ondřej', 'Palát', 'F'],
    [19, 'Jakub', 'Flek', 'F'],
    [23, 'Lukáš', 'Sedlák', 'F'],
    [26, 'Jiří', 'Ticháček', 'D'],
    [44, 'Jan', 'Rutta', 'D'],
    [48, 'Tomáš', 'Hertl', 'F'],
    [50, 'Karel', 'Vejmelka', 'G'],
    [51, 'Radim', 'Šimek', 'D'],
    [64, 'David', 'Kämpf', 'F'],
    [70, 'Daniel', 'Vladař', 'G'],
    [73, 'Ondřej', 'Kaše', 'F'],
    [81, 'Dominik', 'Kubalík', 'F'],
    [84, 'Tomáš', 'Kundrátek', 'D'],
    [88, 'David', 'Pastrňák', 'F'],
    [93, 'Matěj', 'Stránský', 'F'],
    [96, 'David', 'Tomášek', 'F'],
    [98, 'Martin', 'Nečas', 'F'],
  ],
  France: [
    [3, 'Charles', 'Bertrand', 'F'],
    [5, 'Enzo', 'Guebey', 'D'],
    [7, 'Pierre', 'Crinon', 'D'],
    [8, 'Hugo', 'Gallet', 'D'],
    [9, 'Alexandre', 'Texier', 'F'],
    [14, 'Stéphane', 'Da Costa', 'F'],
    [18, 'Yohann', 'Auvitu', 'D'],
    [24, 'Justin', 'Addamo', 'F'],
    [25, 'Nicolas', 'Ritz', 'F'],
    [27, 'Jules', 'Boscq', 'D'],
    [29, 'Louis', 'Boudon', 'F'],
    [30, 'Antoine', 'Keller', 'G'],
    [33, 'Julian', 'Junca', 'G'],
    [37, 'Martin', 'Neckar', 'G'],
    [41, 'Pierre-Édouard', 'Bellemare', 'F'],
    [62, 'Florian', 'Chakiachvili', 'D'],
    [72, 'Jordann', 'Perret', 'F'],
    [74, 'Thomas', 'Thiry', 'D'],
    [77, 'Sacha', 'Treille', 'F'],
    [78, 'Dylan', 'Fabre', 'F'],
    [81, 'Anthony', 'Rech', 'F'],
    [90, 'Aurélien', 'Dair', 'F'],
    [91, 'Floran', 'Douay', 'F'],
    [95, 'Kevin', 'Bozon', 'F'],
    [null, 'Enzo', 'Cantagallo', 'D'],
  ],
  Switzerland: [
    [13, 'Nico', 'Hischier', 'F'],
    [22, 'Kevin', 'Fiala', 'F'],
    [28, 'Timo', 'Meier', 'F'],
    [59, 'Roman', 'Josi', 'D'],
    [62, 'Nino', 'Niederreiter', 'F'],
    [71, 'Jonas', 'Siegenthaler', 'D'],
    [96, 'Philipp', 'Kurashev', 'F'],
    [90, 'J. J.', 'Moser', 'D'],
    [40, 'Akira', 'Schmid', 'G'],
    [null, 'Sven', 'Andrighetto', 'F'],
    [null, 'Tim', 'Berni', 'D'],
    [null, 'Reto', 'Berra', 'G'],
    [null, 'Christoph', 'Bertschy', 'F'],
    [null, 'Michael', 'Fora', 'D'],
    [null, 'Leonardo', 'Genoni', 'G'],
    [null, 'Andrea', 'Glauser', 'D'],
    [null, 'Ken', 'Jäger', 'F'],
    [null, 'Simon', 'Knak', 'F'],
    [null, 'Dean', 'Kukan', 'D'],
    [null, 'Denis', 'Malgin', 'F'],
    [null, 'Christian', 'Marti', 'D'],
    [null, 'Damien', 'Riat', 'F'],
    [null, 'Sandro', 'Schmid', 'F'],
    [null, 'Pius', 'Suter', 'F'],
    [null, 'Calvin', 'Thürkauf', 'F'],
  ],
  Finland: [
    [3, 'Olli', 'Määttä', 'D'],
    [4, 'Mikko', 'Lehtonen', 'D'],
    [10, 'Henri', 'Jokiharju', 'D'],
    [15, 'Anton', 'Lundell', 'F'],
    [20, 'Sebastian', 'Aho', 'F'],
    [23, 'Esa', 'Lindell', 'D'],
    [24, 'Roope', 'Hintz', 'F'],
    [27, 'Eetu', 'Luostarinen', 'F'],
    [32, 'Kevin', 'Lankinen', 'G'],
    [33, 'Nikolas', 'Matinpalo', 'D'],
    [40, 'Joel', 'Armia', 'F'],
    [41, 'Miro', 'Heiskanen', 'D'],
    [55, 'Rasmus', 'Ristolainen', 'D'],
    [56, 'Erik', 'Haula', 'F'],
    [62, 'Artturi', 'Lehkonen', 'F'],
    [64, 'Mikael', 'Granlund', 'F'],
    [70, 'Joonas', 'Korpisalo', 'G'],
    [74, 'Juuse', 'Saros', 'G'],
    [77, 'Niko', 'Mikkola', 'D'],
    [84, 'Kaapo', 'Kakko', 'F'],
    [86, 'Teuvo', 'Teräväinen', 'F'],
    [91, 'Oliver', 'Kapanen', 'F'],
    [94, 'Joel', 'Kiviranta', 'F'],
    [96, 'Mikko', 'Rantanen', 'F'],
    [null, 'Eeli', 'Tolvanen', 'F'],
  ],
  Italy: [
    [9, 'Daniel', 'Mantenuto', 'F'],
    [20, 'Damian', 'Clara', 'G'],
    [22, 'Diego', 'Kostner', 'F'],
    [27, 'Thomas', 'Larkin', 'D'],
    [34, 'Tommy', 'Purdeller', 'F'],
    [45, 'Luca', 'Zanatta', 'D'],
    [null, 'Matt', 'Bradley', 'F'],
    [null, 'Tommaso', 'De Luca', 'F'],
    [null, 'Cristiano', 'DiGiacinto', 'F'],
    [null, 'Dylan', 'Di Perna', 'D'],
    [null, 'Greg', 'DiTomaso', 'D'],
    [null, 'Davide', 'Fadani', 'G'],
    [null, 'Luca', 'Frigo', 'F'],
    [null, 'Mikael', 'Frycklund', 'F'],
    [null, 'Dustin', 'Gazley', 'F'],
    [null, 'Daniel', 'Glira', 'D'],
    [null, 'Giovanni', 'Morini', 'F'],
    [null, 'Alex', 'Petan', 'F'],
    [null, 'Phil', 'Pietroniro', 'D'],
    [null, 'Nick', 'Saracino', 'F'],
    [null, 'Jason', 'Seed', 'D'],
    [null, 'Alessandro', 'Segafredo', 'F'],
    [null, 'Alex', 'Trivellato', 'D'],
    [null, 'Gianluca', 'Vallini', 'G'],
    [null, 'Marco', 'Zanetti', 'F'],
  ],
  Slovakia: [
    [17, 'Šimon', 'Nemec', 'D'],
    [20, 'Juraj', 'Slafkovský', 'F'],
    [42, 'Martin', 'Fehérváry', 'D'],
    [76, 'Martin', 'Pospíšil', 'F'],
    [81, 'Erik', 'Černák', 'D'],
    [90, 'Tomáš', 'Tatar', 'F'],
    [null, 'Peter', 'Cehlárik', 'F'],
    [null, 'Peter', 'Čerešňák', 'D'],
    [null, 'Dalibor', 'Dvorský', 'F'],
    [null, 'Adam', 'Gajan', 'G'],
    [null, 'Martin', 'Gernát', 'D'],
    [null, 'Samuel', 'Hlavaj', 'G'],
    [null, 'Marek', 'Hrivík', 'F'],
    [null, 'Libor', 'Hudáček', 'F'],
    [null, 'Michal', 'Ivan', 'D'],
    [null, 'Miloš', 'Kelemen', 'F'],
    [null, 'Patrik', 'Koch', 'D'],
    [null, 'Adam', 'Liška', 'F'],
    [null, 'Martin', 'Marinčin', 'D'],
    [null, 'Oliver', 'Okuliar', 'F'],
    [null, 'Pavol', 'Regenda', 'F'],
    [null, 'Adam', 'Ružička', 'F'],
    [null, 'Stanislav', 'Škorvánek', 'G'],
    [null, 'Matúš', 'Sukeľ', 'F'],
    [null, 'Samuel', 'Takáč', 'F'],
  ],
  Sweden: [
    [3, 'Oliver', 'Ekman-Larsson', 'D'],
    [4, 'Rasmus', 'Andersson', 'D'],
    [6, 'Philip', 'Broberg', 'D'],
    [9, 'Filip', 'Forsberg', 'F'],
    [10, 'Alexander', 'Wennberg', 'F'],
    [14, 'Joel', 'Eriksson Ek', 'F'],
    [19, 'Adrian', 'Kempe', 'F'],
    [23, 'Lucas', 'Raymond', 'F'],
    [25, 'Jacob', 'Markström', 'G'],
    [26, 'Rasmus', 'Dahlin', 'D'],
    [27, 'Hampus', 'Lindholm', 'D'],
    [28, 'Elias', 'Lindholm', 'F'],
    [29, 'Pontus', 'Holmberg', 'F'],
    [30, 'Jesper', 'Wallstedt', 'G'],
    [32, 'Filip', 'Gustavsson', 'G'],
    [40, 'Elias', 'Pettersson', 'F'],
    [42, 'Gustav', 'Forsling', 'D'],
    [63, 'Jesper', 'Bratt', 'F'],
    [65, 'Erik', 'Karlsson', 'D'],
    [67, 'Rickard', 'Rakell', 'F'],
    [77, 'Victor', 'Hedman', 'D'],
    [88, 'William', 'Nylander', 'F'],
    [90, 'Marcus', 'Johansson', 'F'],
    [92, 'Gabriel', 'Landeskog', 'F'],
    [93, 'Mika', 'Zibanejad', 'F'],
  ],
  Denmark: [
    [20, 'Lars', 'Eller', 'F'],
    [22, 'Oliver', 'Bjorkstrand', 'F'],
    [24, 'Nikolaj', 'Ehlers', 'F'],
    [31, 'Frederik', 'Andersen', 'G'],
    [41, 'Jesper', 'Jensen Aabo', 'D'],
    [46, 'Jonas', 'Røndbjerg', 'F'],
    [null, 'Mikkel', 'Aagaard', 'F'],
    [null, 'Mathias', 'Bau Hansen', 'F'],
    [null, 'Joachim', 'Blichfeld', 'F'],
    [null, 'Phillip', 'Bruggisser', 'D'],
    [null, 'Frederik', 'Dichow', 'G'],
    [null, 'Nicklas', 'Jensen', 'F'],
    [null, 'Nicholas B.', 'Jensen', 'D'],
    [null, 'Anders', 'Koch', 'D'],
    [null, 'Matias', 'Lassen', 'D'],
    [null, 'Markus', 'Lauridsen', 'D'],
    [null, 'Oliver', 'Lauridsen', 'D'],
    [null, 'Oscar Fisker', 'Mølgaard', 'F'],
    [null, 'Nick', 'Olesen', 'F'],
    [null, 'Morten', 'Poulsen', 'F'],
    [null, 'Patrick', 'Russell', 'F'],
    [null, 'Mads', 'Søgaard', 'G'],
    [null, 'Frederik', 'Storm', 'F'],
    [null, 'Alexander', 'True', 'F'],
    [null, 'Christian', 'Wejse', 'F'],
  ],
  Germany: [
    [11, 'Korbinian', 'Geibel', 'D'],
    [14, 'Josh', 'Samanski', 'F'],
    [18, 'Tim', 'Stützle', 'F'],
    [19, 'Wojciech', 'Stachowiak', 'F'],
    [29, 'Leon', 'Draisaitl', 'F'],
    [30, 'Philipp', 'Grubauer', 'G'],
    [35, 'Mathias', 'Niederberger', 'G'],
    [38, 'Fabio', 'Wagner', 'D'],
    [40, 'Alexander', 'Ehl', 'F'],
    [41, 'Jonas', 'Müller', 'D'],
    [49, 'Lukas', 'Kälble', 'D'],
    [53, 'Moritz', 'Seider', 'D'],
    [65, 'Marc', 'Michaelis', 'F'],
    [72, 'Dominik', 'Kahun', 'F'],
    [73, 'Lukas', 'Reichel', 'F'],
    [74, 'Justin', 'Schütz', 'F'],
    [77, 'JJ', 'Peterka', 'F'],
    [78, 'Nico', 'Sturm', 'F'],
    [95, 'Frederik', 'Tiffels', 'F'],
    [null, 'Leon', 'Gawanke', 'D'],
    [null, 'Moritz', 'Müller', 'D'],
    [null, 'Kai', 'Wissmann', 'D'],
    [null, 'Tobias', 'Rieder', 'F'],
    [null, 'Parker', 'Tuomie', 'F'],
    [null, 'Maximilian', 'Franzreb', 'G'],
  ],
  Latvia: [
    [3, 'Alberts', 'Šmits', 'D'],
    [9, 'Renārs', 'Krastenbergs', 'F'],
    [11, 'Dans', 'Ločmelis', 'F'],
    [13, 'Rihards', 'Bukarts', 'F'],
    [16, 'Kaspars', 'Daugaviņš', 'F'],
    [17, 'Mārtiņš', 'Dzierkals', 'F'],
    [21, 'Rūdolfs', 'Balcers', 'F'],
    [22, 'Sandis', 'Vilmanis', 'F'],
    [23, 'Teddy', 'Blueger', 'F'],
    [26, 'Uvis', 'Balinskis', 'D'],
    [27, 'Oskars', 'Cibuļskis', 'D'],
    [28, 'Zemgus', 'Girgensons', 'F'],
    [29, 'Ralfs', 'Freibergs', 'D'],
    [30, 'Elvis', 'Merzļikins', 'G'],
    [31, 'Artūrs', 'Šilovs', 'G'],
    [34, 'Eduards', 'Tralmaks', 'F'],
    [43, 'Anrī', 'Ravinskis', 'F'],
    [50, 'Kristers', 'Gudļevskis', 'G'],
    [55, 'Roberts', 'Mamčics', 'D'],
    [71, 'Roberts', 'Bukarts', 'F'],
    [72, 'Jānis', 'Jaks', 'D'],
    [77, 'Kristaps', 'Zīle', 'D'],
    [94, 'Kristiāns', 'Rubīns', 'D'],
    [95, 'Oskars', 'Batņa', 'F'],
    [97, 'Haralds', 'Egle', 'F'],
  ],
  USA: [
    [1, 'Jeremy', 'Swayman', 'G'],
    [2, 'Jackson', 'LaCombe', 'D'],
    [7, 'Brady', 'Tkachuk', 'F'],
    [8, 'Zach', 'Werenski', 'D'],
    [9, 'Jack', 'Eichel', 'F'],
    [10, 'J. T.', 'Miller', 'F'],
    [12, 'Matt', 'Boldy', 'F'],
    [14, 'Brock', 'Faber', 'D'],
    [15, 'Noah', 'Hanifin', 'D'],
    [16, 'Vincent', 'Trocheck', 'F'],
    [19, 'Matthew', 'Tkachuk', 'F'],
    [21, 'Dylan', 'Larkin', 'F'],
    [25, 'Charlie', 'McAvoy', 'D'],
    [29, 'Brock', 'Nelson', 'F'],
    [30, 'Jake', 'Oettinger', 'G'],
    [34, 'Auston', 'Matthews', 'F'],
    [37, 'Connor', 'Hellebuyck', 'G'],
    [43, 'Quinn', 'Hughes', 'D'],
    [59, 'Jake', 'Guentzel', 'F'],
    [72, 'Tage', 'Thompson', 'F'],
    [74, 'Jaccob', 'Slavin', 'D'],
    [81, 'Kyle', 'Connor', 'F'],
    [85, 'Jake', 'Sanderson', 'D'],
    [86, 'Jack', 'Hughes', 'F'],
    [91, 'Clayton', 'Keller', 'F'],
  ],
}

// Default evaluators for hockey leagues
const defaultHockeyEvaluators = [
  // Match evaluators
  { name: 'Přesný výsledek', type: 'exact_score', entity: 'match', points: 5 },
  { name: 'Skóre rozdíl', type: 'score_difference', entity: 'match', points: 3 },
  { name: 'Skóre jednoho týmu', type: 'one_team_score', entity: 'match', points: 1 },
  { name: 'Vítěz zápasu', type: 'winner', entity: 'match', points: 5 },
  {
    name: 'Střelec',
    type: 'scorer',
    entity: 'match',
    points: 0,
    config: {
      rankedPoints: { '1': 2, '2': 3, '3': 4, '4': 6 },
      unrankedPoints: 8,
    },
  },
  // Question evaluator
  { name: 'Otázka', type: 'question', entity: 'question', points: 6 },
]

async function main() {
  console.log('🏒 Starting Milano 2026 import...')

  // 1. Get existing evaluator types
  console.log('📋 Fetching evaluator types...')
  const evaluatorTypes = await prisma.evaluatorType.findMany({
    where: { deletedAt: null },
  })

  const evaluatorTypeMap: Record<string, number> = {}
  for (const et of evaluatorTypes) {
    evaluatorTypeMap[et.name] = et.id
  }

  console.log(`   Found ${evaluatorTypes.length} evaluator types`)

  // 2. Check if league already exists
  console.log('🔍 Checking if league exists...')
  const existingLeague = await prisma.league.findFirst({
    where: {
      name: 'Milano 2026',
      deletedAt: null,
    },
    include: {
      LeagueTeam: true,
      LeagueMatch: true,
    },
  })

  let league: { id: number; name: string } | null | undefined

  if (existingLeague) {
    console.log('   Found existing league: Milano 2026 (ID: ' + existingLeague.id + ')')
    console.log(`   Teams: ${existingLeague.LeagueTeam.length}, Matches: ${existingLeague.LeagueMatch.length}`)

    // Check if league already has data
    if (existingLeague.LeagueTeam.length > 0 || existingLeague.LeagueMatch.length > 0) {
      console.log('')
      console.log('⚠️  League already has data. To re-import, first delete the league teams/matches.')
      return
    }

    console.log('   League is empty, adding data...')
    league = existingLeague
  }

  // 3. Find or create teams
  console.log('🏳️  Processing teams...')
  const teamIdMap: Record<string, number> = {}

  for (const teamData of teamsData) {
    // Check if team already exists by shortcut and sport
    let team = await prisma.team.findFirst({
      where: {
        shortcut: teamData.shortcut,
        sportId: HOCKEY_SPORT_ID,
        deletedAt: null,
      },
    })

    if (team) {
      console.log(`   Found existing team: ${teamData.name} (${teamData.shortcut})`)
    } else {
      // Create the team
      team = await prisma.team.create({
        data: {
          name: teamData.name,
          shortcut: teamData.shortcut,
          flagIcon: teamData.flagIcon,
          flagType: 'icon',
          sportId: HOCKEY_SPORT_ID,
          createdAt: now,
          updatedAt: now,
        },
      })
      console.log(`   Created team: ${teamData.name} (${teamData.shortcut})`)
    }

    teamIdMap[teamData.name] = team.id
  }

  // 4. Find or create players
  console.log('👥 Processing players...')
  const playerIdMap: Record<string, Record<string, number>> = {} // country -> "firstName lastName" -> playerId

  for (const [country, roster] of Object.entries(rostersData)) {
    playerIdMap[country] = {}

    for (const [, firstName, lastName, position] of roster) {
      const fullName = `${firstName} ${lastName}`

      // Check if player already exists
      let player = await prisma.player.findFirst({
        where: {
          firstName: firstName,
          lastName: lastName,
          deletedAt: null,
        },
      })

      if (player) {
        // Player exists - don't log every player, just count
      } else {
        // Create the player
        player = await prisma.player.create({
          data: {
            firstName: firstName,
            lastName: lastName,
            position: position,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        })
      }

      playerIdMap[country][fullName] = player.id
    }
  }

  // Count total players
  const totalPlayers = Object.values(playerIdMap).reduce((sum, countryPlayers) => sum + Object.keys(countryPlayers).length, 0)
  console.log(`   Processed ${totalPlayers} players across ${Object.keys(playerIdMap).length} countries`)

  // 5. Clear isTheMostActive from all other leagues
  console.log('🔄 Clearing isTheMostActive from other leagues...')
  await prisma.league.updateMany({
    where: { isTheMostActive: true },
    data: { isTheMostActive: false },
  })

  // 6. Create or update the league
  if (!league) {
    console.log('🏆 Creating league...')
    league = await prisma.league.create({
      data: {
        name: 'Milano 2026',
        sportId: HOCKEY_SPORT_ID,
        seasonFrom: 2026,
        seasonTo: 2026,
        isActive: true,
        isFinished: false,
        isTheMostActive: true,
        isPublic: true,
        isChatEnabled: true,
        createdAt: now,
        updatedAt: now,
      },
    })
    console.log(`   Created league: Milano 2026 (ID: ${league.id})`)
  } else {
    // Update existing league to be most active
    await prisma.league.update({
      where: { id: league.id },
      data: {
        isTheMostActive: true,
        isPublic: true,
        updatedAt: now,
      },
    })
    console.log(`   Updated league: Milano 2026 (ID: ${league.id})`)
  }

  // 7. Create evaluators for the league
  console.log('⚙️  Creating evaluators...')
  for (const evalData of defaultHockeyEvaluators) {
    const typeId = evaluatorTypeMap[evalData.type]
    if (!typeId) {
      console.log(`   ⚠️  Evaluator type not found: ${evalData.type}`)
      continue
    }

    await prisma.evaluator.create({
      data: {
        leagueId: league.id,
        name: evalData.name,
        evaluatorTypeId: typeId,
        entity: evalData.entity,
        points: evalData.points,
        config: evalData.config || undefined,
        createdAt: now,
        updatedAt: now,
      },
    })
  }
  console.log(`   Created ${defaultHockeyEvaluators.length} evaluators`)

  // 8. Create league teams
  console.log('🏳️  Creating league teams...')
  const leagueTeamIdMap: Record<string, number> = {} // team name -> leagueTeamId

  for (const teamData of teamsData) {
    const teamId = teamIdMap[teamData.name]

    const leagueTeam = await prisma.leagueTeam.create({
      data: {
        leagueId: league.id,
        teamId: teamId,
        group: teamData.group,
        createdAt: now,
        updatedAt: now,
      },
    })

    leagueTeamIdMap[teamData.name] = leagueTeam.id
  }
  console.log(`   Created ${teamsData.length} league teams`)

  // 9. Create league players
  console.log('👥 Creating league players...')
  let leaguePlayerCount = 0

  for (const [country, roster] of Object.entries(rostersData)) {
    const leagueTeamId = leagueTeamIdMap[country]

    for (const [, firstName, lastName] of roster) {
      const fullName = `${firstName} ${lastName}`
      const playerId = playerIdMap[country][fullName]

      await prisma.leaguePlayer.create({
        data: {
          leagueTeamId: leagueTeamId,
          playerId: playerId,
          createdAt: now,
          updatedAt: now,
        },
      })
      leaguePlayerCount++
    }
  }
  console.log(`   Created ${leaguePlayerCount} league players`)

  // 10. Create matches
  console.log('📅 Creating matches...')

  for (const [dateStr, timeStr, homeTeamName, awayTeamName] of matchesData) {
    const homeLeagueTeamId = leagueTeamIdMap[homeTeamName]
    const awayLeagueTeamId = leagueTeamIdMap[awayTeamName]

    if (!homeLeagueTeamId || !awayLeagueTeamId) {
      console.log(`   ⚠️  Team not found: ${homeTeamName} or ${awayTeamName}`)
      continue
    }

    // Parse date and time (CET timezone for Milan)
    const [year, month, day] = dateStr.split('-').map(Number)
    const [hours, minutes] = timeStr.split(':').map(Number)

    // Create date in CET (UTC+1)
    const matchDate = new Date(Date.UTC(year, month - 1, day, hours - 1, minutes))

    // Create the match
    const match = await prisma.match.create({
      data: {
        homeTeamId: homeLeagueTeamId,
        awayTeamId: awayLeagueTeamId,
        dateTime: matchDate,
        isPlayoffGame: false,
        isEvaluated: false,
        createdAt: now,
        updatedAt: now,
      },
    })

    // Create league match
    await prisma.leagueMatch.create({
      data: {
        leagueId: league.id,
        matchId: match.id,
        isDoubled: false,
        createdAt: now,
        updatedAt: now,
      },
    })
  }
  console.log(`   Created ${matchesData.length} matches`)

  // 11. Summary
  console.log('')
  console.log('✅ Import completed successfully!')
  console.log('')
  console.log('📊 Summary:')
  console.log(`   League ID: ${league.id}`)
  console.log(`   Teams: ${teamsData.length}`)
  console.log(`   Players: ${leaguePlayerCount}`)
  console.log(`   Matches: ${matchesData.length}`)
  console.log(`   Evaluators: ${defaultHockeyEvaluators.length}`)
  console.log('')
  console.log('🔗 Access the league at: /admin/' + league.id + '/matches')
}

main()
  .catch((e) => {
    console.error('❌ Import failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
