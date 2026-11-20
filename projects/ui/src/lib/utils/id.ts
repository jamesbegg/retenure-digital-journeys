let last = 0;

export const nextId = (prefix: string) => `${prefix}-${++last}`;
