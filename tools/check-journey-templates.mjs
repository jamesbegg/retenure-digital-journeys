import { globSync, readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { BindingType, parseTemplate, TmplAstRecursiveVisitor } from '@angular/compiler';

const PLAIN_ELEMENTS = new Set(['section', 'form', 'h2', 'h3', 'p', 'ul', 'li']);
const FORM_BINDINGS = new Set(['formGroup']);
const FORM_EVENTS = new Set(['ngSubmit']);
const BANNED_BINDINGS = new Set(['style', 'class', 'className', 'ngStyle', 'ngClass', 'innerHTML']);

class JourneyTemplateVisitor extends TmplAstRecursiveVisitor {
  errors = [];

  visitElement(element) {
    const plain = !element.name.startsWith('ret-');
    const at = `<${element.name}> line ${element.sourceSpan.start.line + 1}`;

    if (plain && !PLAIN_ELEMENTS.has(element.name)) {
      this.errors.push(
        `${at}: use a ret-* component, or one of ${[...PLAIN_ELEMENTS].join(', ')}. The shell owns the h1.`,
      );
    }
    for (const attr of element.attributes) {
      if (attr.name === 'style')
        this.errors.push(`${at}: no inline style. Put layout in the screen's SCSS.`);
      if (attr.name === 'class' && /(^|\s)ret-/.test(attr.value)) {
        this.errors.push(`${at}: ret-* classes belong to the UI library. Use a ret-* component.`);
      }
    }
    for (const input of element.inputs) {
      const prefix = { [BindingType.Style]: 'style.', [BindingType.Class]: 'class.' }[input.type];
      if (prefix || BANNED_BINDINGS.has(input.name)) {
        this.errors.push(
          `${at}: no [${prefix ?? ''}${input.name}] binding. Use a component variant input.`,
        );
      } else if (plain && !(element.name === 'form' && FORM_BINDINGS.has(input.name))) {
        this.errors.push(
          `${at}: plain elements take static attributes only. Use a ret-* component.`,
        );
      }
    }
    for (const output of element.outputs) {
      if (output.name === 'input' || output.name === 'change') {
        this.errors.push(
          `${at}: no (${output.name}) plumbing. Bind a typed reactive form control.`,
        );
      } else if (plain && !(element.name === 'form' && FORM_EVENTS.has(output.name))) {
        this.errors.push(`${at}: plain elements take no events. Use a ret-* component.`);
      }
    }
    super.visitElement(element);
  }

  visitTemplate(template) {
    this.errors.push(
      `<${template.tagName ?? 'ng-template'}> line ${template.sourceSpan.start.line + 1}: use @if, @for or @switch, not ng-template or a structural directive.`,
    );
    super.visitTemplate(template);
  }
}

export function checkJourneyTemplate(source, file) {
  const { nodes, errors } = parseTemplate(source, file, {});
  if (errors?.length) return errors.map((e) => `${file}: ${e.msg}`);
  const visitor = new JourneyTemplateVisitor();
  for (const node of nodes) node.visit(visitor);
  return visitor.errors.map((e) => `${file} ${e}`);
}

if (import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const errors = globSync('src/app/journeys/**/*.html').flatMap((file) =>
    checkJourneyTemplate(readFileSync(file, 'utf8'), file),
  );
  errors.forEach((e) => console.error(e));
  process.exit(errors.length ? 1 : 0);
}
