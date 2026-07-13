# Feature Modules

The bot uses feature modules so app bootstrap does not import feature internals.

## Feature toggle point

Enabled features are listed in `src/app/modules.ts`.

To disable a feature:
1. Remove its import from `src/app/modules.ts`.
2. Remove its item from `createEnabledModules()`.
3. Run `pnpm run test && pnpm run build`.

To delete a feature completely:
1. Disable it first in `src/app/modules.ts`.
2. Delete `src/features/<feature>/`.
3. Delete `tests/features/<feature>/`.
4. Remove feature-specific env validation only if no enabled feature uses it.
5. Run `pnpm run test && pnpm run build`.

## Module boundary rules

- `src/app/**` may import `src/features/<feature>/index.ts` only.
- `src/app/**` must not import `src/features/<feature>/commands/**` or `application/**`.
- Feature internals may import `src/shared/**`.
- Features should not import other feature internals. If two features need shared code, move it to `src/shared/**`.
