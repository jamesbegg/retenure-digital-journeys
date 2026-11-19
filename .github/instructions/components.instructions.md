---
applyTo: "src/app/ui/**"
---

# Shared components

Every component here is configurable and globally reusable. It must work unchanged in every journey, for every firm, at every font size, and inside the adviser studio's preview.

## Rules

1. **One component per job.** Before adding a component, search `src/app/ui/`. Before adding a variant, check whether an existing one covers it. A second screen that needs a slightly different version gets a typed variant on the existing component, never a copy.
2. **Configure through typed inputs.** Content (labels, hints, options, values), variant, size and state are `input()` signals with literal union types. Events are `output()`s. No component reads a route, a service that loads data, or global state.
3. **No context knowledge.** A component never knows which journey, screen, firm or client it is in. No firm names, journey names or screen copy inside a component template. Default copy, where any is needed, comes from inputs with neutral defaults.
4. **Brand through tokens only.** Colours, radius, font family and spacing come from CSS custom properties set by the tenant theme. No colour literals, logo paths or firm checks in a component.
5. **Forms through `ControlValueAccessor`.** Input components (TextField, RadioGroup, CheckboxGroup, YesNo, Select, Toggle) implement `ControlValueAccessor` so screens bind them with typed reactive forms.
6. **Every state is an input, not a CSS hack.** Default, hover, focus, disabled, error, pending and selected are all reachable and rendered from inputs or native state.
7. **Accessible by construction.** Correct native element or ARIA pattern, visible label, programmatic description for hints and errors, keyboard support, 44 x 44 px target for primary controls, `rem` sizing. See `accessibility.instructions.md`.
8. **Specs and stories for every variant.** Each variant has a component spec for behaviour and a story or demo entry that shows it at default and 200% text size.

## Input naming

Use the same names across components so screens read the same way everywhere:

| Concept | Input name |
| --- | --- |
| Visible label | `label` |
| Supporting text under the label | `hint` |
| Error message | `error` |
| Visual style | `variant` |
| Size | `size` (`md`, `lg`) |
| Options for a choice | `options` (`{ value, label, hint?, input? }[]`) |
| Disabled | `disabled` |
| Busy | `pending` |

## Adding or changing a component

1. Write or update the component's GitHub issue with its variants and states.
2. Add the variant to the component, with the spec and story.
3. Update every caller in the same change if an input changes. Nothing is live, so delete the old input.
4. Run the accessibility checks in `verify-change`.
