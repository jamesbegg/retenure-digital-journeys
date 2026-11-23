import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
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

  it.each(samples)('%s parses as it is, with its questions', (name) => {
    const sample = JSON.parse(read(name).toString());
    const journey = parseJourneyResponse(sample);
    if (journey.status !== 'open') throw new Error('expected an open journey');
    const questions = journey.sections.flatMap((s) =>
      s.blocks.flatMap((b) => (b.type === 'card' ? [b.question] : [])),
    );
    expect(questions.length).toBe(
      sample.sections.flatMap((s: { blocks: unknown[] }) => s.blocks).length,
    );
    if (name === 'journey.open-all-kinds.json') {
      expect(questions.some((q) => q.kind === 'confirmFacts')).toBe(true);
    }
  });
});
