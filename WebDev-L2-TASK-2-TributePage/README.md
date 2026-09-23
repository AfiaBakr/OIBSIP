# Tribute Page — Marie Curie

https://afia-tribute-page.netlify.app/

A responsive tribute page for Marie Curie, the physicist and chemist who pioneered the study of radioactivity and was the first person to win two Nobel Prizes. Built as part of the Oasis Infobyte Web Development Internship (Level 2, Task 2).

## Features

- **Hero section** with the subject's name, a one-line tagline, key stats, and a prominent portrait.
- **Portrait image**: public-domain photograph from Wikimedia Commons, with a credit caption.
- **Biography**: five paragraphs of original writing, paraphrased from Wikipedia and Britannica, with a drop-cap opening.
- **Timeline**: an ordered list of ten milestones, laid out as alternating cards on a centre line. The two Nobel Prize years are highlighted.
- **Quote block**: a notable Marie Curie quote in large italic serif type on a dark background.
- **Legacy section**: a card grid covering her impact on medicine, open science, women in science, and the element curium.
- **Multiple background colours** across sections: navy, cream, white, and pale green.
- **Two font families**: *Playfair Display* (serif) for headings and *Source Sans 3* (sans-serif) for body text.
- **Responsive layout**: the hero stacks vertically and the timeline becomes a single column on tablets and phones.
- Sticky navigation bar with smooth scrolling to each section, and a reduced-motion fallback.

## Tech Stack

- HTML5 (semantic markup: `header`, `section`, `figure`, `blockquote`, `ol`, `time`)
- CSS3 (custom properties, Grid, Flexbox, `clamp()`, media queries; no framework)
- No JavaScript

## File Structure

```
WebDev-L2-TASK-2-TributePage/
├── index.html   # Page markup: hero, biography, quote, timeline, legacy
├── style.css    # Styling, colour palette, and responsive layout
└── README.md
```

## Sources

- Content researched from [Wikipedia](https://en.wikipedia.org/wiki/Marie_Curie) and [Britannica](https://www.britannica.com/biography/Marie-Curie), then paraphrased.
- Portrait: [Marie Curie c1920.jpg](https://commons.wikimedia.org/wiki/File:Marie_Curie_c1920.jpg), public domain, via Wikimedia Commons.

## Running Locally

No build step is needed. Open `index.html` in a web browser, or serve the folder with a local static server, for example:

```bash
npx serve .
```

## Author

Afia Bakr
