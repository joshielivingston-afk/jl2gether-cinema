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
