import { globSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const FORBIDDEN = ['ret-gallery', 'Hartwell', 'Northgate', 'Priya Shah', 'Tom Shah'];

export function checkDist(dir) {
  const files = globSync('**/*.{js,html,css}', { cwd: dir });
  if (!files.some((file) => file.endsWith('.js')))
    return [`${dir}: no build output to check. Run ng build first.`];
  return files.flatMap((file) => {
    const text = readFileSync(join(dir, file), 'utf8');
    return FORBIDDEN.filter((word) => text.includes(word)).map(
      (word) =>
        `${file}: "${word}" is gallery or synthetic data and must not ship. Keep it in dev-routes.ts.`,
    );
  });
}

if (import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const errors = checkDist(process.argv[2] ?? 'dist/app/browser');
  errors.forEach((e) => console.error(e));
  process.exit(errors.length ? 1 : 0);
}
