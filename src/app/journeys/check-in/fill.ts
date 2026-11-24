// Fills {adviser}, {name}, {step} and the like in copy. An unknown placeholder is left as written.
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => String(values[key] ?? whole));
}
