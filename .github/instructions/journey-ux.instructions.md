---
applyTo: "src/app/journeys/**"
---

# Journey screens, copy and question patterns

These rules come from design review of the annual check-in. They apply to every journey.

## Screens

- One primary action per screen. Confirm, Save or Continue is the right-hand button; the secondary action sits to its left.
- In an edit state the buttons are Cancel and Save, never Confirm.
- Say less. One short line of supporting text at most. Cut anything the client does not need to decide or act.
- Headings sit outside cards and use the same style on every screen.
- Cards have no solid borders. Use surface colour and spacing.
- No profile images or decorative avatars.
- The adviser contact route sits in the same place on every screen. Email is the first contact route.
- No call booking inside a journey.

## Questions

- Two options use YesNo buttons.
- Three or more options use the card RadioGroup. An option may carry its own input (for example "Yes" opens an amount field).
- Linked questions sit on the same card: the parent question and its follow-ups together.
- Progressive disclosure: one card at a time. The next card appears once the current one is answered. Answered cards stay editable. Answering No closes that card's follow-ups. A text field counts as answered on blur. Continue appears when every card on the screen is answered.
- Free-text answers use a plain TextField with the question as its label.
- Questions are neutral. Never phrase a question as a sales prompt.

## Households

- The lead client fills the journey in once, for both people. Copy addresses the lead by first name and says "for both of you" where it matters.
- The other person gets a copy of the submitted answers by email.

## Held data

- Show what the adviser holds and ask the client to confirm it ("Still right") or change it ("Something's changed"). Do not ask them to retype it.
- Goals show as a simple text list, the way the adviser's system records them.
