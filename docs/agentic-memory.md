# Digital journeys agentic memory

Non-obvious lessons a contributor might otherwise rediscover. Architecture, commands and feature rules belong in `.github/copilot-instructions.md`, the focused instructions, `package.json` or `docs/features/`.

## Inclusion test

Add an entry only when it records a recurring failure mode, why a plausible approach was rejected, a surprising operational constraint, or a lesson shown by implementation or verification.

## Synthetic data

Use only these fictional firms and households in fixtures, stories, screenshots and tests:

- Hartwell Wealth (`hartwell.retenure.io`), adviser Helen Hartwell. Household: Priya Shah (lead) and Tom Shah.
- Northgate Planning (`northgate.retenure.io`). Used as the second firm in tenancy specs.

## Current lessons

- A CNAME cannot point at a path. A firm's own domain (`checkin.firm.co.uk`) points a CNAME at the shared custom-domain target, and the app resolves the firm from the hostname. Do not use a redirect to `<firm>.retenure.io/...`: it changes the address the client sees and breaks the firm's branding.
- The lead client completes a journey once, for both people in the household. Do not design a second sign-in or a merge of two sets of answers.
- Email is the first contact route to the adviser. Call booking was removed from the check-in on purpose; do not add it back.
- Design review settled the question controls: two options are YesNo buttons, three or more are card radios, and a follow-up sits on the same card as its parent question.
