# Afia Bakr — Personal Portfolio
https://afia-personal-portfolio.netlify.app/         

A responsive personal portfolio website for Afia Bakr, a full-stack web developer specializing in the MERN stack. Built as part of the Oasis Infobyte Web Development Internship (Level 1).

## Overview

The site presents an introduction, background, technical skills, project showcase, and contact details, with a mobile-friendly navigation menu and smooth scroll interactions.

## Sections

- **Navbar** — sticky header with a hamburger menu on mobile and scroll-spy highlighting of the active section.
- **Hero** — name, role, tagline, avatar photo, CTA buttons, and social links (GitHub, LinkedIn, email).
- **About** — short bio describing background and focus.
- **Skills** — technologies grouped into Frontend, Backend, and Tools.
- **Projects** — cards for AFIA_BLOGS, Marriage Hall Booking App, CV Builder, and an E-Commerce site, each with tech stack tags and GitHub/live-demo links.
- **Contact** — email and social links plus a "Say Hello" CTA.
- **Footer** — copyright with an auto-updating year.
- **Back-to-top button** — appears after scrolling and smooth-scrolls to the top.

## Features

- Mobile nav toggle with animated hamburger icon.
- Scroll-spy navigation using `IntersectionObserver`.
- Reveal-on-scroll animations for cards and sections.
- Auto-updating copyright year via JavaScript.

## Tech Stack

- HTML5
- CSS3 (custom styles, no framework)
- Vanilla JavaScript
- Google Fonts (Space Grotesk, Inter)

## File Structure

```
WebDev-L1-PersonalPortfolio/
├── index.html    # Page markup and content
├── style.css     # Styling and responsive layout
├── script.js     # Nav toggle, scroll-spy, reveal animations, back-to-top
├── public/
│   └── 2afia.jpg # Profile photo
└── README.md
```

## Running Locally

No build step is required. Simply open `index.html` in a web browser, or serve the folder with a local static server, e.g.:

```bash
npx serve .
```

## Contact

- Email: [afiabakr8602@gmail.com](mailto:afiabakr8602@gmail.com)
- GitHub: [github.com/AfiaBakr](https://github.com/AfiaBakr)
- LinkedIn: [linkedin.com/in/afia-bakr-a2866aa8](https://www.linkedin.com/in/afia-bakr-a2866aa8/)
