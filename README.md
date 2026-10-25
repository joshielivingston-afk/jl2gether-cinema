# JL²GETHER — The Back Room

A private cinema oracle for **Joshie**, **Julie**, and **JL²GETHER**.

## v0.4

- Taste-aware recommendations distilled from the supplied Letterboxd histories
- Mood mixing: combine one or two moods
- Hand-built vibe rooms, decades, directors, and searchable Similar Movie
- JL²GETHER role-based batches: The Bridge, Joshie's Case for Julie, Julie's Case for Joshie, Mutual Wildcard, Safest Bet
- Local reaction learning: Loved it / Good / Meh / Bad pick plus lightweight reason signals
- "Why this film?" explanations tied to actual profile history
- Dealer's Choice sealed-ticket ritual with three burns
- Static Letterboxd rating snapshots and rating distributions
- Curated long-tail catalogue expansion
- Installable PWA / home-screen app
- GitHub Pages deployment

The running app is static. No Node server is required for normal use. Letterboxd ratings are snapshotted by GitHub Actions when catalogue files change.

New Letterboxd export imports are parsed locally in the browser and stored in localStorage.

## Regression checks and poster data

Run `npm test` for offline poster and recommendation regression checks; CI runs the same suite on pull requests. Run `npm run audit:categories` for a seeded report of eligible films and sample batches across all viewers.

`poster-snapshot.js` supplies verified poster URLs for the catalogue without waiting for a metadata search. Artwork still loads from its external image host. `npm run snapshot:posters` refreshes public metadata; `poster-overrides.json` records reviewed identities for aliases and release-year differences. New films retain a bounded live Cinemeta lookup and title fallback. No account exports are sent to these services.

See [the category audit](docs/recommendation-audit.md) for calibration decisions and [the EASE assessment](docs/ease-assessment.md) for a possible future ranking experiment. EASE is not enabled.

