# Check-in journey: client screens, renderer and services

Builds the client side of `docs/features/questions-engine.md` from the user's approved design on the "Digital check-in flows" canvas (row 2: C0 to C12, and the desktop D- boards). The design gate is passed: the user approved these boards and said build (2026-11-22).

## Scope

1. **Questions on screen** (`@retenure/ui`):
   - `FactCard`, a new composite, renders `confirmFacts`.
   - `QuestionRenderer`, a new composite, renders one section with progressive disclosure.
   - The parser accepts `confirmFacts`.
   - A sync of the backend's wire samples, with a spec that parses every one.
2. **Services** (`src/app`):
   - `TenantService` with its interceptor.
   - `JourneyService` covering verification, load, session, answers in memory, and submit once.
3. **Screens** (`src/app/journeys/check-in`):
   - verify, welcome, one route per section, Check your answers, done
   - the calm pages: already completed, expired, generic error, urgent help
   - each in phone and desktop layouts, plus e2e

**Non-goals:**
- Drafts or save-and-return. Submit is once.
- Follow-ups beyond the YesNo detail box and radio option inputs.
- `checkbox` and `goals` kinds.
- Server-rendered link previews.
- The studio (done in my-wealth-advisor-studio #193 to #195).

## Design summary (from the canvas)

**Pages:**
- **Theme:** a light client theme, white-labelled to the firm.
- **Page:** a cream page (`#F5F3EE`) with white cards (subtle shadow, radius 16px). The tokens move to these.
- **Desktop:** the same screens and components in a centred 40rem column, under a full-width header. Only the heading steps up in size. The primary action is right-aligned, not full width. There's no two-column layout.

**Every screen:**
- The header shows Back and progress. Progress is centred on desktop, and there's no firm name on section screens.
- The adviser contact line ("Rather talk it through? Email me and we'll arrange a call.") sits under the content.
- The link "Something urgent or worrying you?" goes to the urgent help page (C9).

**Section (C2 to C5):**
- The `h1` is the section title.
- Cards are revealed one at a time. The next appears and scrolls into view once the current one is answered.
- Answered cards stay visible and editable.
- A free-text answer counts as answered on blur, or straight away if optional.
- Continue appears once every card is answered.
- A FactCard of what we hold comes first when we hold data.

**FactCard (C2, C5):**
- A title (a person or a topic), then rows with the label on the left and the value on the right, separated by thin dividers.
- Two buttons: "Make a change" (secondary) and "Confirm" (primary).
- Make a change turns the rows into TextFields, plus an optional "Anything I should know?" field, with Cancel and Save.
- Once confirmed, it shows a Confirmed badge and a "Make a change" link.

**Check your answers (C10):**
- One card per section, title inside the card.
- Rows of question and answer with dividers: stacked on a phone, question left and answer right on desktop.
- "Make a change" at the bottom of each card goes back to that section.
- A "Send to <adviser>" button.

**Done (C11):** a tick, "Thank you, <name>. We've received your answers.", "<Adviser> will be in touch.", then the contact line and the urgent link.

**Already completed (C12):** "This check-in has already been completed. It was sent to <adviser> on <date>." Then "Wasn't you? If you didn't send these answers, contact <adviser> straight away.", and the adviser contact.

**Verify (C0, C0b):** the respondent's date of birth, using the TextField date control with `bday` autocomplete and full-date paste. C0b shows the error after the first wrong date.

## Interfaces

- `@retenure/ui` `interfaces/`:
  - `FactCardValue = { changed: { factId, newValue }[]; note?: string } | null`, the FactCard CVA value
  - `SectionAnswers = Record<questionId, AnswerValue>`
  - `QuestionRenderer` inputs: `section: Section`, `answers: SectionAnswers`, `copy: JourneyCopy`, `members: Person[]`
  - `QuestionRenderer` outputs: `answersChange: SectionAnswers`, `complete: boolean`
- `Question` gains `(QuestionBase & { kind: 'confirmFacts'; facts: HeldFact[] })`. `AnswerValue`'s `confirmFacts` gains `note?: string`. The parser accepts `confirmFacts`, with 1 to 8 facts, unique fact ids, and `required` true.
- App `interfaces/`: `JourneyStage`, the screen the `JourneyService` is on:
  - `link-problem`: no token and no session, so "open the link in your email again".
  - `verify`: the date-of-birth step, including after the session lapses.
  - `loading`: verified, fetching the journey.
  - `ready`: the journey is open and answerable.
  - `done`: the submission is received.
  - `already-completed`: the journey was submitted under another id.
  - `expired`: the invitation expired; the adviser is on the response.
  - `locked`: `verification_locked`.
  - `link-reissued`: a new link is on its way (`link_reissued`).
  - `link-requested`: the adviser has been asked to send a new link (`link_requested`).
  - `error`: the generic page; `errorReason` says which.

## Data flow and invariants

- **Tenant first.** `TenantService.load()` runs at start-up (an app initializer) and applies the theme before the first branded render. On any failure it resets to neutral, and the generic page shows. An interceptor adds `X-Tenant-Id` and `X-Journey-Id` to every protected `/client/*` request, with `withCredentials`. The `/client/tenant` request itself gets no `X-Tenant-Id`.
- **Answers live in memory only.** No browser storage, ever: no draft, no cache.
- **Submit once.** `submissionId` is created once per attempt and kept across retries.
- **Errors map to their outcome** using the questions-engine contract's Failure behaviour table:
  - a recognised `reason` wins
  - on protected requests, a 401 or 403 with no reason means the session expired
  - `journey_expired` reloads the journey and shows the expired page
- **Session timing comes from the server's `expiresAt`.**
  - Renew on activity when under 25 minutes are left.
  - Warn on an idle tab 2 minutes before the deadline.
  - Waking after the deadline goes straight to verification.
  - Reverifying the same journey restores the answers; a different journey discards them.
- **The token leaves the address bar after load.** Opening the link starts no session.

## Waves and ownership

| Wave | Unit | Owns | Depends on |
| --- | --- | --- | --- |
| 0 | A0: shared components and types | New `projects/ui` components, all from the canvas component library: `ClientHeader` (Back and progress), `ProgressBar`, `AdviserContact`, `Notice`, `Badge`, `Modal` (dialog). Also the `JourneyCopy` additions, `SectionAnswers`, `FactCardValue`, the `confirmFacts` `note`, the light-only cream tokens (`_tokens.scss`), `public-api.ts` and `stories.ts`. | merged main |
| 1 | A: questions on screen | `composites/fact-card` (with a read-only `summary` variant for Check your answers), `composites/question-renderer`, the `confirmFacts` parser and fixtures, and `src/app/api/wire-samples/` (hand-copied, with the source commit in a README line) and its spec. A adds its own exports and story entries. | A0 |
| 1 | B: services | `src/app/{tenant,journey}`, app `interfaces/`, `app.config.ts` | A0 |
| 2 | C: screens and e2e | `src/app/journeys/check-in/**`, `app.routes.ts`, `e2e/**` (journey routes join a11y and zoom; tenancy loses `fixme`) | A, B |

A0 lands first. A and B branch from it and share no files.

## Copy

- **After the journey loads, all UI text comes from `JourneyCopy`** on the wire. It gains `confirm`, `makeChange`, `confirmed`, `cancel`, `save`, `factNote` ("Anything I should know?"), `contactLine`, `urgentLink`, `sendTo` ("Send to {adviser}"), `doneTitle`, `doneBody`, `alreadyCompletedTitle`, `alreadyCompletedBody` and `notYou`. This is agreed with the backend in the same work.
- **Before the journey loads, text is app-owned English** in one constants file: verify, the link-problem page, the locked page and the generic error page. These screens have no adviser data, so they leave out the adviser line and keep a neutral "contact your adviser". Expired and already completed carry the adviser from their response.

## More states

- **No token:** a reload, or `/start` with no `#t`. With no session, this shows the link-problem page ("Please open the link in your email again").
- **A section deep link with no session:** verify if a token is held, otherwise the link-problem page.
- **An unknown section id:** goes to the first section.
- **Browser Back after Done:** stays on Done.
- **`verification_locked`:** the locked page.
- **`invalid_submission`:** goes to the section of the first `fieldErrors` question, with its message.
- **Send:** shows the Button's `pending` state, so a double press does nothing.
- **Done after a lost response:** it has no client name, so it uses "Thank you. We've received your answers."

## Renderer contract

- **Inputs:** `section`, `answers` as a `model<SectionAnswers>()` (two-way), and `copy`. There's no `members` input: model-written prompts already name the person.
- **Output:** `complete`, emitted on every change. It's true when every required card is answered and no shown field has a validation error. An optional blank counts as complete. A required field blurred while blank doesn't count as answered.
- **FactCard** renders only the `confirmFacts` question kind. The `facts` block stays rejected.
- **The story** has one fixture per v1 kind, including the YesNo detail box and a radio option input. There are no union inputs, so `Variants` is empty.

## Verification

- **Unit tests:** each piece follows the questions-engine contract's Verification list, plus:
  - the interceptor leaves `X-Tenant-Id` off `/client/tenant`
  - the token is removed before the first request
  - fake-clock tests for the renew throttle, the idle warning and `visibilitychange`
  - a different-journey reverify discards the answers
  - `journey_mismatch`
  - focus and scroll on reveal at 200% text and 320 px, and with reduced motion
  - FactCard: confirm, change with Save and Cancel, and the note
  - progressive disclosure: the reveal order, editing an earlier card, Continue appearing, and optional blanks
- **e2e:**
  - e2e runs against `ng serve` with the dev mock (`src/app/dev-mock`) answering `/client/*`, and drives scenarios through `?mock=`. That is one data source, with no `page.route` stubs.
  - a synthetic journey on both synthetic firm hosts
  - axe and zoom on every journey route
  - tenancy isolation
  - lost submit, then reverify, reaching the done page
  - full-date paste
- **Before each PR:** `npm run lint`, `typecheck`, `test`, `build` and `e2e`.

## Decisions

- **Confirmed by the user:**
  - the approved canvas boards above
  - FactCard is in v1
  - one respondent
  - no copy email
  - submit once
  - progressive disclosure is the core of the form
  - Personal details is the only required category (studio side)
- **Derived from the repo:** JourneyShell's layouts and states, FieldMessages, the shared validators, and the template and SCSS guards.
- **Resolved after plan review:**
  - The client journey is light-only in v1, as the canvas defines. `TenantTheme.colours.dark` is parsed and not applied.
  - The idle warning uses the new `Modal` (A0), with the copy's `timeoutWarning` and `moreTime`.
  - FactCard and the `note` were agreed with the backend lane (adopted in its U3).
  - Unit A updates `questions-engine.md`'s release scope and `parsers.spec.ts`.
- **A replan, recorded:** A0's six shared components. All are designed on the canvas's component library page, which satisfies the design gate.

## Replanning triggers

Replan if the work needs any of these:
- a production dependency
- a new shared component beyond FactCard and QuestionRenderer
- browser storage
- a wire change the backend hasn't agreed
