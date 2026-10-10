# JL²GETHER — Codex Handoff

This file is the project-context handoff for Codex. Treat the repository's `main` branch as the source of truth for implementation state.

## Project

**JL²GETHER — The Back Room** is a bespoke movie-recommendation web app for three profiles:

- **Joshie**
- **Julie**
- **JL²GETHER**

The app is intentionally not a generic movie browser. It should feel like a strange private repertory-cinema oracle: atmospheric, personal, a little ritualistic, and highly opinionated.

Live site:

`https://joshielivingston-afk.github.io/jl2gether-cinema/`

Repository:

`joshielivingston-afk/jl2gether-cinema`

Current app version is **v0.4.x**.

---

## Product philosophy

The core goal is not "find a highly rated movie." It is:

> Find the right movie for this person / couple, in this mood or aesthetic space, tonight.

Recommendation quality should prioritize:

1. personal taste signal
2. mood / vibe match
3. originality / atmosphere / emotional or intellectual charge
4. profile-specific watch / rating / like / list history
5. diversity across decades and filmmakers
6. Letterboxd rating as supporting evidence, not as the primary recommender

Avoid turning this into Netflix-style generic filtering or a giant metadata catalogue.

The app should feel handmade and slightly mysterious.

---

## Visual / UX direction

Theme: **The Back Room**

Desired atmosphere:

- grimy hidden repertory theater
- dim light
- worn red upholstery / velvet
- amber / paper tones
- tickets, stamps, secret-club energy
- grain / analog texture
- hand-painted or letterpress feeling
- not polished streaming-service UI

Avoid:

- slick Netflix-style cards
- generic SaaS aesthetics
- excessive explanatory copy
- huge modal posters on desktop
- too many controls visible at once

### Current landing behavior

The intro screen should show **only the three names**:

- Joshie
- Julie
- JL²GETHER

No nicknames, bios, explanatory subtitles, or profile descriptions there.

Clicking a name enters that profile's "domain."

Inside a profile:

- the selected profile name is the primary top-left identity
- the viewer switch control is labeled **CHANGE VIEWER** in all caps
- main heading is **"Follow thy nose."**

### Main menu

Main menu contains:

Primary:
- Mood
- Vibe

Secondary:
- Similar Movie
- Decade
- Directors

Lower:
- Dealer's Choice

Main-menu buttons should **not** have explanatory subtitles.

Mood and Vibe choice buttons **do** have explanatory subtitles.

---

## Mood behavior

Mood interaction should stay simple.

Flow:

1. user opens Mood
2. taps one mood
3. recommendations appear immediately
4. inside the results area, a small control asks whether to **combine with another mood**
5. if a second mood is chosen, recommendations should favor films that genuinely intersect both moods
6. user can remove the second mood and return to the original mood

Do not return to the previous two-mood preselection screen unless explicitly requested.

Mood choices currently include things like:

- bored
- restless
- sleepy
- horny
- in love
- weirded out
- homesick
- depressed
- playful
- harmonious
- nostalgic
- philosophical
- curious
- afraid
- macabre
- wired
- lonely
- cosmic
- angry
- tender
- campy

Mood is not meant to equal genre. It represents what the film should do to the viewer's nervous system / emotional state.

---

## Vibe behavior

Vibe rooms are hand-labeled aesthetic / experiential categories, not database genres.

Examples include:

- The 25th Hour
- Unwatchable
- C-Films
- 90s / Y2K Club Fever
- 90s Kinetic Weirdness
- High-Energy 70s
- Liminal Cinema
- Dream Logic
- Rocket Fuel
- WTF / Brainfuck
- Weird / Esoteric / Underground
- Documentaries That Switch You On
- Weird Documentaries
- Underground Arthouse
- Night City
- Beautifully Damaged
- Tender Weirdos
- End of the World at 3AM
- Elegant Panic

Keep these weird and specific.

---

## Recommendation engine

The engine is custom and profile-aware.

Relevant files:

- `data.js`
- `catalog-extra.js`
- `catalog-v04.js`
- `profile-data.js`
- `app.js`

The catalogue is currently roughly **600 films**.

Do not replace the handcrafted semantic tags with generic external genres.

### Profile logic

Joshie and Julie have separate Letterboxd-derived history snapshots.

The app uses:

- watched
- rating
- liked
- watchlist
- favorites
- custom list membership
- list strength
- taste tags

The original Letterboxd export diary files were empty, so historical watch dates / repeat-watch counts are not reliable in the baked snapshot.

Do not pretend generic CSV Date fields are actual last-watch dates.

### Privacy rule

Julie's Letterboxd information is for use **inside this movie app only**.

Do not repurpose it into unrelated projects or general user profiling.

The public repo may contain distilled movie-history signals needed by this app, but do not add unrelated private profile fields.

---

## JL²GETHER mode

Joint mode is intentionally not just a simple average.

It currently produces a five-film batch with semantic recommendation roles:

- **The Bridge**
- **Joshie's Case for Julie**
- **Julie's Case for Joshie**
- **Mutual Wildcard**
- **Safest Bet**

The app historically leaned roughly 60–65% Joshie / 35–40% Julie, but should reward actual overlap and preserve interesting divergence.

Joint mode should feel like its own recommendation personality.

---

## Decade balance

There used to be too much 90s weight.

The current recommender deliberately attempts to spread ordinary recommendation batches across decades.

Important:

- explicit Decade mode should still stay inside the chosen decade
- an era-specific Vibe can naturally concentrate in one era
- general Mood / Dealer / joint recommendations should not default overwhelmingly to the 1990s

The catalogue itself still contains many 90s films, so balancing should happen in selection logic, not by deleting them.

---

## Similar Movie

Similar Movie has:

- a rotating set of high-signal reference films
- search across the full local catalogue by title / director / year

The goal is "adjacent frequency," not literal genre matching.

If expanding this later to accept arbitrary external films, preserve this semantic approach.

---

## Dealer's Choice

Dealer's Choice is intentionally theatrical.

Current ritual:

1. user gets a sealed ticket
2. breaks the seal
3. one movie is revealed
4. user may burn up to three tickets
5. the fourth pick is effectively fate

The current tone includes "NO REFUNDS."

This feature is whimsical by design.

---

## Individual movie modal

The desktop modal was intentionally simplified because the old one was visually overloaded.

Current design goal:

- smaller poster on desktop
- no need to scroll just to understand the movie
- essential info visible first
- secondary info folded away

Visible first:

- title
- vibe / role
- reveal year + director
- reveal Letterboxd rating
- watched status
- short movie copy
- Letterboxd link
- More Like This

Secondary information is organized into collapsible sections:

- Why this film?
- Word around the lobby
- Tags

Do not re-expand all of this by default.

---

## Reaction learning

A reaction system was prototyped:

- Loved it
- Good
- Meh
- Bad pick
- loved the atmosphere
- more like this
- too slow
- too obvious
- wrong mood

However, the user asked to **remove / disable this for now** because the "After the screening" UI was not working reliably.

The helper code may still exist, but it should not influence recommendation scoring or show in the modal until intentionally revisited.

Do not silently re-enable it.

---

## Letterboxd ratings

The app uses **static Letterboxd rating snapshots**, not a live backend.

Relevant files:

- `ratings-snapshot.js`
- `scripts/update-ratings.js`
- `.github/workflows/snapshot-ratings.yml`

Behavior:

- ratings are baked into the static site
- rating histograms are included where available
- Letterboxd average sorting remains
- Cult Heat sorting remains
- new catalogue films should trigger a rating-snapshot refresh automatically

The app does not need a running Node server for normal use.

`server.js` may remain for local/dev or historical reasons, but GitHub Pages does not execute it.

---

## GitHub Pages deployment

The app is hosted as a static GitHub Pages site.

Workflow:

`.github/workflows/deploy-pages.yml`

Deployment target:

`https://joshielivingston-afk.github.io/jl2gether-cinema/`

The site should remain usable without Codespaces, Node, or a local machine running.

---

## PWA

The app is installable / home-screen-capable.

Relevant files:

- `manifest.webmanifest`
- `icon.svg`
- `pwa.js`
- `sw.js`

When changing JS/CSS behavior that users may already have cached, bump the service-worker cache name or otherwise cache-bust the affected asset.

There have already been cases where a stale service worker made old broken JS appear to remain live.

---

## Important UI bug history

A recurring bug came from mixing these helpers:

```js
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
```

At one point code used:

```js
$('.choice').forEach(...)
$('.poster-card').forEach(...)
```

which fails because `$()` returns one element.

The most important click bindings were converted to native:

```js
document.querySelectorAll(...).forEach(...)
```

Prefer native `querySelectorAll` for multi-element event binding in future edits to avoid regressions.

After modifying click behavior, explicitly test:

- landing profile cards
- main menu
- Mood buttons
- Vibe buttons
- Similar Movie anchors/search results
- movie poster cards
- Dealer's Choice
- modal buttons
- back buttons
- sort
- hide watched
- mood-combine controls

---

## Current stability

The most recent interaction regression was:

- Mood / Vibe buttons not responding
- movie cards not opening

Root cause was the single-element selector + `.forEach()` mistake.

The repo was patched to native `document.querySelectorAll(...).forEach(...)` bindings and the app bundle was cache-busted.

Treat current `main` as the stable baseline.

---

## Current catalogue direction

The catalogue should grow intentionally, not indiscriminately.

Good expansion targets:

- Japanese cyber / body cinema
- Eastern European surrealism
- underground American cinema
- psychosexual dramas
- strange documentaries
- experimental films
- cult trash
- night-city cinema
- liminal cinema
- 70s kinetic paranoia
- oddball international films
- long-tail festival / cult material

Avoid padding the database with generic mainstream titles simply to increase count.

The app is more useful at 600–1500 highly tuned films than at 20,000 generic ones.

---

## Joshie taste calibration

Broadly, Joshie's preference signals include:

- worldview + atmosphere + originality
- existential / metaphysical charge
- counterculture
- cultural specificity
- experimental edges
- liminal states
- dreams
- cyber / analog-tech atmosphere
- underground work
- sincere weirdness
- emotionally or philosophically charged cinema

Important Y2K calibration:

Good:
- trip-hop / techno atmosphere
- warehouse nights
- CRTs / fake interfaces / early digital life
- alienation
- youth subculture
- rave / grunge / cyber
- pre-millennial unease
- low-polish urban texture

Bad fit:
- generic glossy 90s nostalgia
- merely fashionable 90s films without the above charge

Joshie strongly liked examples such as:

- eXistenZ
- Blade
- Go
- Lost Highway
- Trainspotting
- The Doom Generation
- Nowhere
- Run Lola Run
- The Matrix
- Hackers

Do not interpret "likes 90s films" as a reason to flood recommendations with 90s movies.

---

## Julie profile

Julie's tastes are encoded in `profile-data.js` and existing catalogue affinities.

Broad app-relevant patterns include:

- emotionally strong films
- kinetic filmmaking
- stylish work
- dark humor
- crime
- surreal / weird cinema
- horror
- tender character work
- adventurous formal choices

Use only for this app.

---

## Files to understand first

When Codex starts working on this project, read in roughly this order:

1. `CODEX.md`
2. `README.md`
3. `index.html`
4. `app.js`
5. `styles.css`
6. `data.js`
7. `catalog-extra.js`
8. `catalog-v04.js`
9. `profile-data.js`
10. `ratings-snapshot.js`
11. `.github/workflows/deploy-pages.yml`
12. `.github/workflows/snapshot-ratings.yml`
13. `scripts/update-ratings.js`
14. `manifest.webmanifest`, `pwa.js`, `sw.js`

---

## Editing principles

Before making changes:

- preserve the strange-cinema personality
- preserve profile-specific recommendation logic
- avoid generic UX simplification that erases character
- keep controls concise
- do not add explanatory copy unless it earns its space
- avoid regressions in click handling
- preserve GitHub Pages compatibility
- remember the PWA cache
- do not require a backend unless the user explicitly chooses to reintroduce one

After changes:

- syntax-check `app.js`
- test all core click paths
- confirm GitHub Pages deployment succeeds
- if catalogue files changed, verify rating snapshot workflow
- if JS/CSS behavior changed, ensure stale service-worker cache cannot mask the update

---

## Things explicitly NOT wanted right now

Do not add these unless the user asks again:

- main-menu subtitles
- preselecting two moods before seeing recommendations
- "After the screening" reaction UI / learning
- giant desktop poster modal
- Netflix-like filter panels
- tonight constraint panel
- shortlist / ticket-pocket feature

---

## Current requested tone

The app should feel like:

> a private cinema oracle hidden in a basement

not:

> a movie recommendation dashboard.

Keep the wit, ritual, and atmosphere, but keep the interface uncluttered.
