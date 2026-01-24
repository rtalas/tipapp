# Validation Error Translation - Quick Reference

## Using Validation with Automatic Translation

### Simplest Usage

```typescript
'use server'

import { getTranslations } from 'next-intl/server'
import { validateWithTranslation } from '@/lib/validated-schema'
import { createEvaluatorSchema } from '@/lib/validation/admin'

export async function createEvaluator(input: unknown) {
  const t = await getTranslations('validation')
  const result = await validateWithTranslation(createEvaluatorSchema, input, t)

  if (!result.success) {
    return { success: false, message: result.message } // Translated error!
  }

  // Use result.data safely
}
```

### Get All Field Errors

```typescript
if (!result.success) {
  return {
    success: false,
    fieldErrors: result.fieldErrors, // { field1: ['error1', 'error2'], ... }
  }
}
```

## Adding New Validation Error

### 1. Define in Schema

```typescript
// src/lib/validation/admin.ts
export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
})
```

### 2. Add Translation Keys

```json
// messages/en.json
{
  "validation": {
    "admin": {
      "team": {
        "nameRequired": "Team name is required"
      }
    }
  }
}
```

```json
// messages/cs.json
{
  "validation": {
    "admin": {
      "team": {
        "nameRequired": "Název týmu je povinný"
      }
    }
  }
}
```

### 3. Add Pattern

```typescript
// src/lib/validation-error-translator.ts
const errorPatterns = [
  { pattern: /Team name is required/, keyPath: 'admin.team.nameRequired' },
]
```

## Available Validation Errors

### Evaluators
- `validation.admin.evaluator.nameRequired` - Name is required
- `validation.admin.evaluator.pointsNegative` - Points cannot be negative
- `validation.admin.evaluator.leagueRequired` - League is required
- `validation.admin.evaluator.typeRequired` - Evaluator type is required

### Leagues
- `validation.admin.league.nameRequired` - League name is required
- `validation.admin.league.sportRequired` - Sport is required
- `validation.admin.league.seasonEndGreater` - Season end ≥ season start

### Matches
- `validation.admin.match.dateFuture` - Match date must be in the future
- `validation.admin.match.teamsDifferent` - Teams must be different
- `validation.admin.match.gameNumberRequiresPhase` - Game number requires phase

### Match Phases
- `validation.admin.matchPhase.rankNegative` - Rank must be non-negative
- `validation.admin.matchPhase.bestOfInvalid` - Best of must be 1-7

## Common Patterns

| Pattern | Translation |
|---------|-------------|
| `{field} is required` | Use key `{namespace}.{field}Required` |
| `must be at least {n}` | Use key `{namespace}.{field}TooSmall` |
| `must be at most {n}` | Use key `{namespace}.{field}TooBig` |
| `{field} cannot be negative` | Use key `{namespace}.{field}Negative` |

## Testing

### In Development
1. Add validation error to form
2. Select "Czech" in admin menu
3. Trigger validation
4. Error should display in Czech

### Test Data
```typescript
// Invalid evaluator (will trigger translation)
{
  name: '',           // Name is required
  points: -5,         // Points cannot be negative
  leagueId: 0,        // League is required
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Error not translating | Check pattern in `validation-error-translator.ts` |
| Czech key missing | Add key to `messages/cs.json` under `validation.{namespace}` |
| Type error | Import type: `import type { CreateEvaluatorInput } from '@/lib/validation/admin'` |
| Wrong error message | Verify pattern regex matches exact error text |

## File Locations

| Purpose | File |
|---------|------|
| Validation schemas | `src/lib/validation/admin.ts`, `src/lib/validation/user.ts` |
| Translation keys | `messages/en.json`, `messages/cs.json` |
| Error translator | `src/lib/validation-error-translator.ts` |
| Validation wrapper | `src/lib/validated-schema.ts` |
| Documentation | `VALIDATION_I18N.md` |

## Checklist for New Validation

- [ ] Add error message to schema
- [ ] Add English translation key to `messages/en.json`
- [ ] Add Czech translation key to `messages/cs.json`
- [ ] Add pattern to `validation-error-translator.ts`
- [ ] Test in English
- [ ] Test in Czech
- [ ] Document in `VALIDATION_I18N.md`
