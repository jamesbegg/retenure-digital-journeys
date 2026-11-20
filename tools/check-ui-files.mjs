import { existsSync, globSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const COMPONENT_LAYERS = ['primitives', 'composites', 'layouts'];

const code = (file) =>
  readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

export function checkUiFiles(root) {
  const registry = code(join(root, 'projects/ui/src/stories.ts'));
  const folders = COMPONENT_LAYERS.flatMap((layer) =>
    globSync(`projects/ui/src/lib/${layer}/*/`, { cwd: root }),
  );

  return folders.flatMap((folder) => {
    const name = basename(folder);
    const file = (suffix) => join(folder, `${name}${suffix}`);
    const has = (suffix) => existsSync(join(root, file(suffix)));
    if (!has('.ts')) return [`${folder}: add ${file('.ts')}, named after its folder.`];

    const className = code(join(root, file('.ts'))).match(/export class (\w+)/)?.[1];
    if (!className) return [`${file('.ts')}: export the component class.`];

    const errors = [];
    if (!has('.spec.ts')) {
      errors.push(`${folder}: add ${file('.spec.ts')} covering every variant and state.`);
    }
    if (!has('.story.ts')) {
      errors.push(`${folder}: add ${file('.story.ts')} showing every variant from its issue.`);
    } else if (
      !new RegExp(`:\\s*Variants<${className}>\\s*=`).test(code(join(root, file('.story.ts'))))
    ) {
      errors.push(
        `${file('.story.ts')}: declare Variants<${className}> so a missing variant fails.`,
      );
    }

    const storyImport = `./${join(dirname(file('.ts')).replace(/^projects\/ui\/src\//, ''), `${name}.story`)}`;
    const entry = new RegExp(
      `['"]?${name}['"]?\\s*:\\s*\\(\\)\\s*=>\\s*import\\(\\s*'${storyImport}'\\s*\\)`,
    );
    if (!entry.test(registry)) {
      errors.push(
        `projects/ui/src/stories.ts: register '${name}': () => import('${storyImport}').`,
      );
    }
    return errors;
  });
}

if (import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const errors = checkUiFiles(process.cwd());
  errors.forEach((e) => console.error(e));
  process.exit(errors.length ? 1 : 0);
}
