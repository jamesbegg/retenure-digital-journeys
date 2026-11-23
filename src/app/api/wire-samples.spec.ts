import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { copy } from './fixtures';
import { parseJourneyResponse } from './journey';

const dir = 'src/app/api/wire-samples';
const read = (name: string) => readFileSync(`${dir}/${name}`);
const manifest: Record<string, string> = JSON.parse(read('manifest.json').toString());
const samples = readdirSync(dir).filter((name) => /^journey\..*\.json$/.test(name));

describe("the backend's wire samples", () => {
  it('lists every journey sample in the manifest, and nothing else', () => {
    expect(samples.length).toBeGreaterThan(0);
    expect(Object.keys(manifest).sort()).toEqual([...samples].sort());
  });

  it.each(samples)('%s is byte-identical to the backend copy', (name) => {
    expect(createHash('sha256').update(read(name)).digest('hex')).toBe(manifest[name]);
  });

  // The samples predate the check-in copy keys, so the fixture copy fills the gaps. Re-copy the
  // samples when the backend sends them and this fallback does nothing.
  it.each(samples)('%s parses', (name) => {
    const sample = JSON.parse(read(name).toString());
    sample.journey.copy = { ...copy, ...sample.journey.copy };
    expect(parseJourneyResponse(sample).status).toBe('open');
  });
});
