import { stat } from 'node:fs/promises';

export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)) {
    for (const extension of ['.ts', '.tsx']) {
      try {
        const candidate = new URL(`${specifier}${extension}`, context.parentURL);
        await stat(candidate);
        return next(candidate.href, context);
      } catch {
      }
    }
  }

  return next(specifier, context);
}
