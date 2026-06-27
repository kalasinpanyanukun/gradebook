export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export function isSchemaCacheErrorFor(error: unknown, fieldName: string): boolean {
  const message = getErrorMessage(error, '').toLowerCase();
  const field = fieldName.toLowerCase();
  return (
    message.includes(field) &&
    (
      message.includes('schema cache') ||
      message.includes('relationship') ||
      message.includes('column') ||
      message.includes('could not find')
    )
  );
}
