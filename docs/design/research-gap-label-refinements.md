# Label-free gap doodles

Edited using the built-in image-generation tool. Original versions remain available; the website now uses the six `images/research-gap-*-v2.png` assets. Scene placement, size and cast remain unchanged.

## Saved assets

- images/research-gap-chat-v2.png
- images/research-gap-images-v2.png
- images/research-gap-story-v2.png
- images/research-gap-voice-v2.png
- images/research-gap-agents-v2.png
- images/research-gap-translation-v2.png

## Label-removal prompt

Edit this existing transparent doodle. Remove ONLY the lettering 'LLM' and the little emphasis marks immediately beside that label. Leave the cleared area transparent. Preserve the exact person, pose, face, hair, hands, device, speech-bubble outline and ALL other contents of the bubble. Do not redraw, restyle, recenter or resize the composition. Keep the same gray outline strokes and original genuine transparent alpha background. No white backing, no checkerboard texture, no new words or symbols, no new fills.

## Translation prompt

Edit this existing doodle, preserving the EXACT older man, pose, hands, laptop, gray outlines and layout. Remove the heading 'LLM' and its emphasis rays. Inside the speech bubble replace the standalone 'A', wave divider, and standalone 'अ' with two short quoted phrases. English at top on two lines: 'The male' then 'is strong'. Hindi below on two lines: 'पुरुष' then 'ताकतवर है।'. Spell Devanagari accurately. Put one tiny question mark beside the phrase pair to show the stereotype is being examined, not endorsed. Keep the existing bubble outline; no other text, no extra letters, no titles. Font should be simple clear handwritten, large enough to read. Preserve true transparent alpha background, no white or black backing, no checkerboard texture, no shading, no new fills.

## Phrase source and interpretation

English: “The male is strong” (verbatim).
Hindi: “पुरुष ताकतवर है।” (our translation, not supplied by the dataset).

Source: StereoSet by Moin Nadeem, Anna Bethke and Siva Reddy, `data/dev.json`, intrasentence example `9eecda1d3f24986639fd35e794992c52`, sentence `12a4a5fb21ba83287a5f1243a2431fdb`, gold label `stereotype`, target `male`, bias type `gender`.

- Dataset: https://github.com/moinnadeem/StereoSet/blob/master/data/dev.json
- Project and citation: https://github.com/moinnadeem/StereoSet
- License: CC BY-SA 4.0, https://github.com/moinnadeem/StereoSet/blob/master/LICENSE.md

The quoted phrase and question mark depict a stereotype being examined, not endorsed. The phrase translation is offered under the dataset's CC BY-SA 4.0 terms. No claim is made that this is an actual model output or a mistranslation.

The editing tool produced preview backings rather than alpha. SVG filters remove the white/checkerboard backing from five assets and the black backing from the chat asset at render time, for both page themes.
