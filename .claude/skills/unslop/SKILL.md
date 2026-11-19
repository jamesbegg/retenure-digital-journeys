---
name: unslop
description: Cut AI writing patterns from any prose (feature contracts, docs, PR descriptions, commit messages, replies). Use for /unslop, "unslop this", "tighten the writing", or before handing over a document.
---

# Unslop

Edit text to remove AI patterns. Scan for the patterns below, then rewrite. Keep the meaning and match the intended tone. Code, identifiers, and quoted output stay as they are.

## Content

1. **Superficial -ing phrases.** "highlighting...", "ensuring...", "reflecting...", "showcasing...", "fostering...". Delete them or expand them with real sources.
2. **Vague attributions.** "Experts believe", "Industry reports suggest". Name the source or delete.

## Language

3. **AI vocabulary.** Additionally, crucial, delve, enduring, enhance, fostering, garner, interplay, intricate, landscape (abstract), pivotal, showcase, tapestry (abstract), testament, underscore, vibrant. Replace with plain words.
4. **Fancy ways to say "is".** "serves as", "stands as", "boasts", "features". Say "is" or "has".
5. **"Not just X, but Y."** State the point directly.
6. **Rule of three.** Do not force ideas into groups of three. Use the natural number.
7. **Synonym cycling.** Pick one name for a thing and repeat it.
8. **False ranges.** "from X to Y" where X and Y are not on a meaningful scale. List the topics directly.

## Style

9. **Em dashes.** Avoid them. Use a period or a comma. If a thought needs separation, end the sentence.
10. **Colon as a connector.** A colon is fine before a list or an example, not as a mid-sentence crutch.
11. **Boldface overuse.** Do not bold every proper noun or acronym.
12. **Inline-header lists.** A bold label and colon that restates the line ("**Performance:** Performance improved...") becomes prose. A bold lead-in that ends in a period and is followed by new detail is fine.
13. **Title case headings.** Use sentence case.
14. **Decorative emojis.** Remove them from headings and bullets.
15. **Curly quotes.** Use straight quotes.

## Communication artifacts

16. **Chatbot phrases.** "I hope this helps!", "Let me know if...", "Of course!", "Certainly!". Remove them.
17. **Sycophantic tone.** "Great question! You're absolutely right!" Respond directly.

## Filler

18. **Filler phrases.** "In order to" becomes "to". "Due to the fact that" becomes "because". Delete "It is important to note that".
19. **Excessive hedging.** "could potentially possibly be argued that it might" becomes "may".
20. **Generic conclusions.** "The future looks bright." State specific plans or facts.

## Jargon

21. **Abstract metaphor nouns.** Substrate, wedge, vector (meaning "way"), locus, vantage, nexus, primitive as a noun, harness as a metaphor, surface as in "API surface", bedrock, scaffolding as a metaphor, modality, paradigm, gold-plating, ratchet as a metaphor, evacuate (for moving code), endgame, north star, flywheel. Use the concrete word.

## Plain speech

22. **Say what it does, not how it feels.** "types that follow your schema" names a feeling. "A column rename fails the build" names the mechanism. If a sentence could appear unchanged in another project's docs, it says nothing about this one. Cut it.
23. **Shorten or split dense sentences.** If the reader has to backtrack, break the sentence in two or drop clauses.
24. **Active voice.** "Queries are validated" becomes "the service validates queries". Passive is fine only when the actor is unknown or does not matter.
25. **Cut adverbs, or use a stronger verb.** "significantly improves" becomes the measured delta.
26. **Prefer the plain word.** "utilize" and "leverage" become "use", "facilitate" becomes "help", "in the event that" becomes "if".
27. **Mannered prose.** Aphorisms, rhetorical fragments, personified code ("the plan holds it"), figurative verbs ("rides along"). Say what you mean.
28. **Over-compression.** Dropped articles, verbless fragments, arrows, and abbreviations that make the reader decode. "Parser rejects bad date → exit 2, no write" becomes "The parser rejects a bad date, exits with code 2, and writes nothing."
