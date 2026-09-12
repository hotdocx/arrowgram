export const ARROWGRAM_INTERNAL_ID_PREFIX = '__arrowgram_internal__';

export function computedArrowKey(sourceIndex: number): string {
  return `${ARROWGRAM_INTERNAL_ID_PREFIX}arrow_${sourceIndex}`;
}

export function isReservedLogicalId(value: string): boolean {
  return value.startsWith(ARROWGRAM_INTERNAL_ID_PREFIX);
}
