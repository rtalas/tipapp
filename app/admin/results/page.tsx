import { getPendingMatches, getEvaluatedMatches } from '@/actions/matches'
import { prisma } from '@/lib/prisma'
import { ResultsContent } from '@/components/admin/results/results-content'

export default async function ResultsPage() {
  // Fetch data in parallel
  const [pendingMatches, evaluatedMatches, leagues] = await Promise.all([
    getPendingMatches(),
    getEvaluatedMatches(10),
    prisma.league.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Results & Evaluation</h1>
        <p className="text-muted-foreground">
          Review match results and evaluate bets to calculate points.
        </p>
      </div>

      <ResultsContent
        pendingMatches={pendingMatches}
        evaluatedMatches={evaluatedMatches}
        leagues={leagues}
      />
    </div>
  )
}
