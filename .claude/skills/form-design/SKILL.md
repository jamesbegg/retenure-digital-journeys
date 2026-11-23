---
name: form-design
description: Design or review any form a client or adviser fills in or approves (a journey section, a question, Check your answers, the studio's check-in approval summary). Use before drafting layout options for a form, when choosing question wording or order, and when reviewing a form screen or mockup.
---

# Form design

A form is a conversation the firm has with the client. Get the questions right first, then the flow, then the look. The rules come from Designlab's form UI best practices, adapted where WCAG 2.2 or our older clients need it, and from the user's design reviews on the "Digital check-in flows" canvas. Read `AGENTS.md`, `.github/instructions/journey-ux.instructions.md` and `.github/instructions/accessibility.instructions.md` first; where this skill and those disagree, those win.

## 1. Questions: ask less, ask well

- **Ask only what the adviser will use.** For each question, name the decision it feeds. No decision, no question. Optional fields are the first to cut.
- **Confirm before asking.** If the adviser holds the answer, show it and ask "Still right?" instead of asking again.
- **One thing per question**, in plain words the client would use. Neutral: we ask, we never advise or sell.
- **Say why when a question may worry someone** (health, income, a phone number), in one line of hint text next to it, never behind an icon or tooltip.
- **State the format up front** ("For example, 27 3 1962"; "Pounds, no pence needed"), as hint text, never as a placeholder.
- **Mark the rare optional question with "(optional)"** in the label. Never use asterisks.

## 2. Flow: order and pacing

- **Progressive disclosure is the core of every form.** Show one question at a time. The next appears, and scrolls into view, once the current one is answered. Answered questions stay visible with their answer and can be changed. A follow-up appears only when the answer that needs it is given, inside the same card, and goes again (with its answer cleared) when that answer changes. Continue appears once everything on the screen is answered. A free-text answer counts as answered once it is non-blank and valid; errors show on blur or Continue. Keyboard users must find the next card before they tab on. Never show the whole section's questions up front.
- **Order by the client's logic**, not the database's: familiar sequences (address before postcode, day then month then year), easy confirmations before harder questions, and anything a later question depends on first.
- **Group related questions into a section** with a short heading. One section per screen. Linked questions share a card; follow-ups open inside the parent's card.
- **Show where they are**: section name, and how many sections are left. The progress rail is the place for it (see Look).
- **One primary action per screen**, at the end of the content: Continue, or the final Send. Back is secondary, to its left.
- **Long journeys are stepped**, never one long page. Each step changes visibly, so the client notices they moved on.
- **Before the final send, a summary** (Check your answers): every answer, grouped as asked, each with Change. After the send, a clear done screen, so no one sends twice.

## 3. Look: calm, one column, one focus

- **One column.** Labels above controls, never beside them. Choices stacked vertically, except YesNo's two buttons.
- **Label, hint, control and error sit together** as one group, with clear space between groups.
- **Never a placeholder as a label.** Placeholders disappear, are low contrast and many screen readers skip them.
- **One field per value.** A phone number is one field. Dates are the one exception: day, month and year boxes, because that suits older clients and autofill (`bday-*`), and pasting a whole date fills all three.
- **Native controls** for special inputs, with the right `inputmode` and `autocomplete`.
- **No uppercase** in labels, hints, buttons or headings (stylelint bans `text-transform: uppercase`).
- **Sans-serif type with a high x-height**, sized in `rem`, from the tokens.

## 4. Validation and errors

- **Validate when the client leaves a field or presses Continue**, not on every keystroke. Errors that appear mid-typing punish slower typists. A field that becomes valid clears its error straight away.
- **Never disable Continue or Send to signal "not ready".** A disabled button gives no reason and is skipped by screen readers. Hide Continue until the cards are answered (progressive disclosure), or let the press reveal what is missing.
- **Error messages say how to fix it**, in the client's words: "Enter the year as 4 numbers, like 1962", not "Invalid date". Prefix with the copy's `errorPrefix` and tie it to the control with `aria-describedby`.
- **Catch slips, don't police.** The shared validators flag likely mistakes (a name in the email field, 1196 for 1996); they never reject unusual but real answers.
- **No captchas.** Use the verification step the journey already has.
- **Confirm momentous actions once**, with the consequence in one line. Sending a check-in is one; answering a question is not.

## 5. Buttons and words

- **Buttons say what happens**: "Continue", "Send my answers", "Approve and send". Not "Submit" or "OK".
- **First person on the client's final action** ("Send my answers") reads naturally after "I want to". Everywhere else, plain verbs.
- **Shortest copy that is still clear.** One line of supporting text per screen at most.

## Visual direction (from the reference forms the user chose)

The user's references are a stepped application with a progress rail and a single-question "How big is your team?" form. Take these qualities, in our tokens and components, never their brands:

- **A quiet side rail** on wide screens: progress (the `Steps` or `ProgressBar` component), the section list with the current one marked, and the adviser's contact (`AdviserContact`). On a phone it becomes the progress line at the top and the contact at the end.
- **One focus in the main panel**: a large question or section heading (the shell's `h1`), one line of support under it, then the cards. Generous white space; nothing competes.
- **Choices as large tiles** (`RadioGroup` cards, `YesNo`) with an unmistakable selected state: border, fill and a check, never colour alone.
- **Back and Continue sit just under the content**, Back as an outlined secondary on the left, Continue as the primary on the right. Not pinned to the far bottom of a tall screen.
- **Previous answers are one tap from view.** An answered card stays visible with its answer and a Change action.

## Summarised views

A summary shows the form the way the client experiences it, so whoever reads it judges the real thing.

- **Same structure as the form**: the sections in order, each question worded exactly as the client sees it.
- **Client's Check your answers** (canvas C10, the user's direction): one card per section, with the same subtle shadow as every other card. The section title sits inside the card. Each question and its answer is a row with a thin divider: question left and answer right on desktop, stacked on a phone, as on the held-facts card (C5). No alternating row colours. "Make a change" sits at the bottom of the card and goes back to that section; there is no Change link above the card.
- **Done screen**: a short confirmation ("We've received your answers. Helen will be in touch."), then the same adviser line and urgent link as every other screen. No next-steps list, no copy email, nothing to add after sending.
- **Adviser's approval view (studio)**, as the user designed it (canvas row 6):
  - Title, then the household's names in gold.
  - One short summary of the year (italic, on a dark surface) with a link to last year's suitability review. This is the only place the story is told.
  - Each section: its name with an (i) (why it is here and its sources, in the side sheet) and a quiet "edit" link on the right. Under it, a cream paper card of question rows: the question on the left, what we hold for it on the right in italics, rows in alternating bands. Questions with nothing held show the question alone.
  - "edit" turns that card into edit mode in place: reword, remove (×), add a question, remove the section, then Cancel or Save.
  - "Not included" at the end: each topic or question with its one-line reason, and Add to bring it back.
  - Confirm moves to the invite email, drafted in the studio's compose paper, then Confirm and send.
  - No badges, tags, answer types, counts or per-question reasons on the page.
- **No answer-type jargon** ("Text", "Amount"): the question's wording already tells the reader what is asked.

## Review checklist

Before a form mockup goes to the design gate, or a form change to review, check:

1. Every question names the adviser decision it feeds.
2. Held data is confirmed, not re-asked.
3. One column; labels above; no placeholder labels; hints visible.
4. One primary action per screen, after the content; Back to its left.
5. Errors on blur or Continue, specific, prefixed and tied to the control; no disabled submit.
6. Progress and the adviser's contact are visible on every screen.
7. The summary matches the form's order and wording.
8. It works at 320 px with 200% text, and every target is 44 px.
