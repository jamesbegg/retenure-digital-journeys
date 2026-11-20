export class ParseError extends Error {}

const isoTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

// Reads one JSON object field by field and throws ParseError on anything unexpected.
// Unknown fields are ignored and never copied into the result; null counts as absent.
export class Reader {
  private constructor(
    private readonly value: Record<string, unknown>,
    readonly path: string,
  ) {}

  static from(value: unknown, path: string): Reader {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ParseError(`${path}: expected an object`);
    }
    return new Reader(value as Record<string, unknown>, path);
  }

  fail(key: string, problem: string): never {
    throw new ParseError(`${this.path}.${key}: ${problem}`);
  }

  raw(key: string): unknown {
    return this.value[key];
  }

  has(key: string): boolean {
    return this.value[key] !== undefined && this.value[key] !== null;
  }

  schemaVersion(): 1 {
    return this.value['schemaVersion'] === 1 ? 1 : this.fail('schemaVersion', 'expected 1');
  }

  string(key: string): string {
    const value = this.value[key];
    return typeof value === 'string' && value.trim() !== ''
      ? value
      : this.fail(key, 'expected a non-empty string');
  }

  optionalString(key: string): string | undefined {
    return this.has(key) ? this.string(key) : undefined;
  }

  matching(key: string, pattern: RegExp): string {
    const value = this.string(key);
    return pattern.test(value) ? value : this.fail(key, `does not match ${pattern}`);
  }

  timestamp(key: string): string {
    const value = this.matching(key, isoTimestamp);
    return isNaN(Date.parse(value)) ? this.fail(key, 'unreadable time') : value;
  }

  boolean(key: string): boolean {
    const value = this.value[key];
    return typeof value === 'boolean' ? value : this.fail(key, 'expected a boolean');
  }

  number(key: string): number {
    const value = this.value[key];
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : this.fail(key, 'expected a number');
  }

  optionalNumber(key: string): number | undefined {
    return this.has(key) ? this.number(key) : undefined;
  }

  integer(key: string, min = 0): number {
    const value = this.number(key);
    return Number.isInteger(value) && value >= min
      ? value
      : this.fail(key, `expected an integer of at least ${min}`);
  }

  optionalInteger(key: string, min = 0): number | undefined {
    return this.has(key) ? this.integer(key, min) : undefined;
  }

  oneOf<T extends string>(key: string, allowed: readonly T[]): T {
    const value = this.value[key];
    return allowed.includes(value as T)
      ? (value as T)
      : this.fail(key, `expected one of ${allowed.join(', ')}`);
  }

  object(key: string): Reader {
    return Reader.from(this.value[key], `${this.path}.${key}`);
  }

  objects<T>(key: string, read: (item: Reader) => T, minLength = 0): T[] {
    const value = this.value[key];
    if (!Array.isArray(value)) return this.fail(key, 'expected an array');
    if (value.length < minLength) return this.fail(key, `expected at least ${minLength}`);
    return value.map((item, i) => read(Reader.from(item, `${this.path}.${key}[${i}]`)));
  }

  optionalObjects<T>(key: string, read: (item: Reader) => T): T[] | undefined {
    return this.has(key) ? this.objects(key, read) : undefined;
  }
}

export function unique(values: string[], path: string): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new ParseError(`${path}: duplicate ${value}`);
    seen.add(value);
  }
}
