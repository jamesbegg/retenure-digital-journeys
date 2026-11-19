---
applyTo: "src/**"
---

# Accessibility and font scaling

WCAG 2.2 AA is the floor. Many clients are older, use larger text settings, use a phone, and may use a screen reader or magnifier. Design and test for that, not for the default.

## Font scaling and zoom

- Size all text, line heights, padding around text and text containers in `rem`. Use `px` only for borders and hairlines.
- Base body text is at least `1.0625rem` (17 px at default) with line height 1.5. Never set text below `0.875rem`.
- Respect the browser's default font size. Never set `html { font-size }` in `px`.
- Every screen works at 200% browser zoom and at 200% text-only scaling (Firefox "Zoom text only", iOS Larger Text, Android font size) with no clipped, overlapping or truncated text.
- Content reflows at 320 CSS px wide with no horizontal scroll (1.4.10). Two-column layouts stack.
- No fixed heights on anything that holds text. Buttons and cards grow with their content.
- Text spacing overrides (1.4.12) do not break layout.

## WCAG 2.2 criteria that matter most here

- **1.4.3 / 1.4.11 contrast.** 4.5:1 for text, 3:1 for large text, control borders, focus indicators and icons that carry meaning. The tenant theme is validated against these before it is accepted; a firm colour that fails is adjusted, not shipped.
- **2.4.7 / 2.4.11 / 2.4.13 focus.** A visible focus ring on every interactive element, at least 2 px, 3:1 against its background, never hidden by a sticky header or footer.
- **2.5.8 target size.** At least 24 x 24 px for every target, and 44 x 44 px for primary controls, YesNo buttons and radio cards.
- **3.3.7 redundant entry.** Never ask for something the client already gave in this journey, or that the adviser already holds; show it for confirmation instead.
- **3.3.8 accessible authentication.** Verification must not rely on a cognitive test. Allow paste into code fields and support autofill (`autocomplete="one-time-code"`).
- **3.2.6 consistent help.** The adviser contact route sits in the same place on every screen.
- **2.2.1 timing.** No session timeout shorter than 20 minutes without a warning and a way to extend. Drafts save so a timeout loses nothing.
- **1.3.1 / 4.1.2 structure.** One `h1` per screen. Radio and checkbox groups use `fieldset` and `legend`. Hints and errors are tied to their control with `aria-describedby`. Errors are announced.

## Plain language

- Short sentences, everyday words, one idea per card. Avoid jargon such as "decumulation" or "crystallise".
- Labels are questions or nouns, never placeholders. Placeholder text is not a label.
- Error messages say what to do: "Enter the amount in pounds", not "Invalid input".

## Motion and colour

- Honour `prefers-reduced-motion`. No auto-playing animation.
- Never use colour alone to show state. Pair it with text or an icon.
- Support dark mode only through tokens, and test contrast in both.

## How to check

- `e2e/a11y.spec.ts` runs axe on every route and state and fails on serious or critical issues.
- `e2e/zoom.spec.ts` renders every route at 320 px wide with 200% text and fails on horizontal scroll or clipped text.
- Keyboard-only walk-through of the changed flow.
- Screen reader spot check (VoiceOver on iOS, NVDA on Windows) for new components.
