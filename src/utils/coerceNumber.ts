import { clamp } from '@/utils/clamp';

export function coerceClampedNumber(
  value: string | undefined,
  fallback: number,
  opts?: { min?: number; max?: number }
): number {
  const parsed = value == null ? Number.NaN : Number(value);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  const min = opts?.min ?? -Infinity;
  const max = opts?.max ?? Infinity;

  return clamp(safeValue, min, max);
}
