# Validation Error Translation (i18n) Guide

## Overview

The TipApp validation system supports multi-language error messages using Zod schemas and the next-intl library. All validation errors are automatically translated to the user's selected language.

## Architecture

### Components

1. **Zod Schemas** (`src/lib/validation/`)
   - Define data validation rules
   - Use simple error messages (no translation needed at schema definition time)

2. **Translation Keys** (`messages/en.json`, `messages/cs.json`)
   - Nested under `validation.admin.*` namespaces
   - One namespace per feature (evaluators, leagues, matches, etc.)

3. **Error Translator** (`src/lib/validation-error-translator.ts`)
   - Maps Zod error messages to translation keys
   - Translates errors on-demand during validation

4. **Validated Schema Wrapper** (`src/lib/validated-schema.ts`)
   - Provides type-safe validation with built-in translation
   - Simplifies error handling in server actions

## Usage in Server Actions

### Basic Example

```typescript
'use server'

import { getTranslations } from 'next-intl/server'
import { validateWithTranslation } from '@/lib/validated-schema'
import { createEvaluatorSchema } from '@/lib/validation/admin'

export async function createEvaluator(input: unknown) {
  // Get translation function for current locale
  const t = await getTranslations('validation')

  // Validate input with automatic translation
  const result = await validateWithTranslation(
    createEvaluatorSchema,
    input,
    t
  )

  if (!result.success) {
    return {
      success: false,
      error: result.message,
      fieldErrors: result.fieldErrors,
    }
  }

  const validatedInput = result.data

  // Use validatedInput safely here
  // Type is fully inferred from schema
}
```

### Advanced: Custom Error Handling

```typescript
'use server'

import { getTranslations } from 'next-intl/server'
import { validate } from '@/lib/validated-schema'
import { createLeagueSchema } from '@/lib/validation/admin'

export async function createLeague(input: unknown) {
  const t = await getTranslations('validation')

  const result = await validate(createLeagueSchema, input, t)

  if (!result.success) {
    // Access translated errors by field
    console.error('Field errors:', result.fieldErrors)
    // {
    //   'name': ['League name is required'],
    //   'seasonTo': ['Season end must be greater than or equal to season start']
    // }

    return {
      success: false,
      message: result.message, // First error message for UI toast
      fieldErrors: result.fieldErrors, // All errors by field
    }
  }

  const { data } = result
  // data is fully typed as CreateLeagueInput

  try {
    // Create league in database
    await db.league.create({ data })
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to create league' }
  }
}
```

## Adding New Validation Errors

### Step 1: Define Schema

```typescript
// src/lib/validation/admin.ts

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  city: z.string().min(1, 'City is required').max(100),
})
```

### Step 2: Add Translation Keys

```json
// messages/en.json
{
  "validation": {
    "admin": {
      "team": {
        "nameRequired": "Team name is required",
        "cityRequired": "City is required"
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
        "nameRequired": "Název týmu je povinný",
        "cityRequired": "Město je povinné"
      }
    }
  }
}
```

### Step 3: Update Error Patterns

In `src/lib/validation-error-translator.ts`, add patterns to match your error messages:

```typescript
const errorPatterns: Array<{
  pattern: RegExp
  keyPath: string
  fieldKey?: string
}> = [
  { pattern: /Team name is required/, keyPath: 'admin.team.nameRequired' },
  { pattern: /City is required/, keyPath: 'admin.team.cityRequired' },
  // ... other patterns
]
```

### Step 4: Use in Server Action

```typescript
'use server'

import { getTranslations } from 'next-intl/server'
import { validateWithTranslation } from '@/lib/validated-schema'
import { createTeamSchema } from '@/lib/validation/admin'

export async function createTeam(input: unknown) {
  const t = await getTranslations('validation')

  const result = await validateWithTranslation(
    createTeamSchema,
    input,
    t
  )

  if (!result.success) {
    return {
      success: false,
      error: result.message,
      fieldErrors: result.fieldErrors,
    }
  }

  // Validation passed - errors are automatically translated
}
```

## Error Pattern Matching

The error translator uses pattern matching to map Zod error messages to translation keys. Patterns are checked in order of specificity.

### Current Patterns

**Admin Evaluator:**
- "Name is required" → `validation.admin.evaluator.nameRequired`
- "League is required" → `validation.admin.evaluator.leagueRequired`
- "Points cannot be negative" → `validation.admin.evaluator.pointsNegative`

**Admin League:**
- "League name is required" → `validation.admin.league.nameRequired`
- "Sport is required" → `validation.admin.league.sportRequired`
- "Season end must be greater than or equal to season start" → `validation.admin.league.seasonEndGreater`

**Admin Match:**
- "Match date must be in the future" → `validation.admin.match.dateFuture`
- "Home and away teams must be different" → `validation.admin.match.teamsDifferent`
- "Game number requires a match phase" → `validation.admin.match.gameNumberRequiresPhase`

**Admin Match Phase:**
- "Rank must be non-negative" → `validation.admin.matchPhase.rankNegative`
- "Best of must be between 1 and 7" → `validation.admin.matchPhase.bestOfInvalid`

### Adding New Patterns

Pattern matching is case-sensitive and uses regex. Add patterns to the `errorPatterns` array in `validation-error-translator.ts`:

```typescript
// Specific pattern (checked first)
{ pattern: /My custom error message/, keyPath: 'validation.admin.custom.error' },

// Generic pattern (checked last)
{ pattern: /must contain/, keyPath: 'validation.tooSmall' },
```

## Translation Namespaces

All validation translations are organized under the `validation` key:

```
validation/
├── required: "{field} is required"
├── admin/
│   ├── evaluator/
│   │   ├── nameRequired
│   │   ├── pointsNegative
│   │   └── ...
│   ├── league/
│   │   ├── nameRequired
│   │   ├── seasonEndGreater
│   │   └── ...
│   ├── match/
│   ├── matchPhase/
│   ├── series/
│   ├── specialBet/
│   ├── question/
│   └── user/
└── user/
    ├── firstNameRequired
    └── ...
```

## Testing Validation Errors

### Test Czech Translations

1. Set browser language to Czech (or use developer tools)
2. Trigger validation error in admin page
3. Error message should appear in Czech

### Manual Testing

```typescript
// In Node REPL or test file
import { getTranslations } from 'next-intl/server'
import { validateWithTranslation } from '@/lib/validated-schema'
import { createEvaluatorSchema } from '@/lib/validation/admin'

const t = await getTranslations('validation')

const result = await validateWithTranslation(
  createEvaluatorSchema,
  { name: '', points: -5 }, // Invalid data
  t
)

console.log(result.fieldErrors)
// {
//   'name': ['Name is required'],
//   'points': ['Points cannot be negative']
// }
```

## Supported Languages

- **English**: `messages/en.json`
- **Czech**: `messages/cs.json`

To add a new language:

1. Create `messages/{lang}.json` with all validation keys
2. Update `src/i18n/config.ts` to include the new locale
3. Ensure all error patterns are documented for future contributors

## Best Practices

1. **Keep Error Messages Consistent**: Use the same error message wording across all schemas for the same validation rule

2. **Add Patterns Before Deployment**: Update error patterns in `validation-error-translator.ts` before releasing new validation rules

3. **Test All Languages**: Always test validation errors in both English and Czech before merging

4. **Use Simple Messages in Schemas**: Keep Zod error messages simple and descriptive (they're used for pattern matching)

5. **Namespace Translation Keys**: Always nest validation keys under feature namespaces (e.g., `admin.evaluator.*`, `admin.league.*`)

6. **Document New Patterns**: When adding error patterns, document them in this file

## Troubleshooting

### Validation Errors Not Translating

**Problem**: Error message appears in English even when Czech is selected

**Solution**:
1. Check that the pattern is added to `errorPatterns` in `validation-error-translator.ts`
2. Ensure the translation key exists in `messages/cs.json`
3. Verify the translation function `t()` is passed correctly

### Translation Key Not Found

**Problem**: Error message falls back to original message

**Solution**:
1. Add the translation key to `messages/en.json` and `messages/cs.json`
2. Ensure the keyPath in the pattern matches the JSON structure
3. Check for typos in the keyPath

### Type Errors with validateWithTranslation

**Problem**: TypeScript error when using validate function

**Solution**:
1. Ensure the schema is properly typed with `z.infer<typeof schema>`
2. Import types from the validation module
3. Use the `validate` function for better type inference

## Performance Considerations

- Error translation happens **after** validation fails
- No performance impact on successful validations
- Error patterns are checked in order (most specific first)
- Pattern matching uses regex which is efficient for small error message sets

## Related Files

- `/src/lib/validation-error-translator.ts` - Error message pattern matching
- `/src/lib/validated-schema.ts` - Type-safe validation wrapper
- `/src/lib/validation/admin.ts` - Admin validation schemas
- `/src/lib/validation/user.ts` - User validation schemas
- `/messages/en.json` - English translations
- `/messages/cs.json` - Czech translations
