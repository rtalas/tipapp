import { getAllEvaluators, getEvaluatorTypes } from '@/actions/evaluators'
import { prisma } from '@/lib/prisma'
import { EvaluatorsContent } from '@/components/admin/evaluators/evaluators-content'

export default async function EvaluatorsPage() {
  const [evaluators, leagues, evaluatorTypes] = await Promise.all([
    getAllEvaluators(),
    prisma.league.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    }),
    getEvaluatorTypes(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scoring Rules</h1>
        <p className="text-muted-foreground">
          Manage evaluator points for match prediction scoring.
        </p>
      </div>

      <EvaluatorsContent
        evaluators={evaluators}
        leagues={leagues}
        evaluatorTypes={evaluatorTypes}
      />
    </div>
  )
}
