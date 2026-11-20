export const describedBy = (fieldId: string, hint?: string, error?: string, ...extra: string[]) =>
  [...extra, hint && `${fieldId}-hint`, error && `${fieldId}-error`].filter(Boolean).join(' ') ||
  null;
