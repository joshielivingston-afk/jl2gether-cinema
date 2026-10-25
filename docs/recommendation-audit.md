# Recommendation audit — 25 October 2026

Scope: all 867 catalogue records, 21 moods, 23 vibes, all three viewers, and every two-mood pair. This is an audit of category admission and representative films, not a claim that automated checks establish subjective cinematic truth for every title.

## Corrections

- Removed the sparse mixed-mood OR fallback. A combination now stays in the intersection, including when fewer than five films qualify. Empty intersections have a short message.
- Sleepy requires affirmative sleepy/harmonious evidence, rather than admitting slow unsettling films such as Enys Men.
- Harmonious requires that deliberate tag; tenderness or dream logic alone no longer admits Synecdoche, New York.
- Depressed uses harmonious films or a small explicit supportive selection. Aftersun, Taste of Cherry and Dead Poets Society no longer qualify merely because of tenderness or nostalgia. This remains editorial judgment about the intended experience.
- Cosmic requires cosmic/metaphysical evidence; documentary or philosophical subject matter alone no longer admits Shoah or There Will Be Blood.
- In love requires romance; tender friendship alone is insufficient. Philosophical requires philosophical/metaphysical evidence, rather than any liminal film.
- Angry requires anger or energetic political/countercultural rebellion, not just darkness. Macabre requires the macabre tag; Afraid requires horror/fear evidence. Tender no longer means every damaged romance. Campy no longer means any playful film.
- Era-energy vibes require the actual release decade and propulsion. Crime/paranoia alone no longer places slow films in High-Energy 70s.
- Rocket Fuel, Elegant Panic, and Documentaries That Switch You On use their deliberately curated tags. Ordinary kinetic crime, stylish photography, or documentary format no longer suffices.
- Existing closed Childhood Nostalgia and Musicals memberships remain unchanged.

## User calibration

- Girly Pop now uses a nine-film selection around sleepovers, friendship, crushes, and soft-chaos comfort. Examples: Kamikaze Girls, Frances Ha, Amélie, The Parent Trap and Freaky Friday. Childhood shelf entries are admitted to this room only when explicitly selected; other shelf isolation remains intact.
- Horny retains dark psychosexual films and selected charged romances. Innocent romance alone no longer qualifies.
- Nostalgic admits an explicitly nostalgic atmosphere or strong personal watched/favorite history. Release-era tags alone no longer qualify. Personal evidence is viewer-specific; joint mode accepts either partner's history.

Weird Documentaries includes mockumentary/found-footage entries such as Noroi and Occult. This existing interpretation is unchanged; a future calibration question is whether fictional documentary forms belong.

## Coverage and reproducible samples

Run `npm test` for network-independent checks and `npm run audit:categories` for a seeded JSON report containing every admitted film and one batch per viewer/category. Tests cover 2,112 individual-category batches, 630 mixed-mood batches (all 210 pairs across three viewers), plus decade and diversity checks. Category fixtures include positive and negative real films. They are editorial calibration examples, not mathematical ground truth.

The original app fails 22 of the 27 recommendation checks; the revised app passes them. Poster regressions separately simulate stalled/failing requests, quota errors, wrong-film search results, independent card loading, and detached cards/modals.

Candidate counts below use joint mode. Personal Nostalgic counts differ by viewer.

| Type | Room | Candidates before → after | Example joint batch |
| --- | --- | ---: | --- |
| mood | Bored | 299 → 299 | Run Lola Run (1998); Baby Driver (2017); Snatch (2000); Hundreds of Beavers (2024); The Holy Mountain (1973) |
| mood | Restless | 128 → 128 | Baby Driver (2017); The Matrix (1999); Snatch (2000); I Am Cuba (1964); After Hours (1985) |
| mood | Sleepy | 51 → 17 | The Scent of Green Papaya (1993); Syndromes and a Century (2006); Cemetery of Splendour (2015); Perfect Days (2023); Pather Panchali (1955) |
| mood | Horny | 183 → 94 | The Bitter Tears of Petra von Kant (1972); Love Exposure (2008); Titane (2021); The Duke of Burgundy (2014); Bound (1996) |
| mood | In love | 207 → 104 | Moonlight (2016); Buffalo ’66 (1998); Lost in Translation (2003); L'Atalante (1934); The Worst Person in the World (2021) |
| mood | Weirded out | 275 → 275 | The Holy Mountain (1973); The Matrix (1999); Alice (1988); The Saragossa Manuscript (1965); Holy Motors (2012) |
| mood | Homesick | 54 → 21 | Late Spring (1949); After Yang (2021); Ordet (1955); The Only Son (1936); Syndromes and a Century (2006) |
| mood | Depressed | 75 → 30 | Perfect Days (2023); The Grand Budapest Hotel (2014); Ordet (1955); Napoleon Dynamite (2004); The King and the Mockingbird (1980) |
| mood | Playful | 177 → 177 | Napoleon Dynamite (2004); The Rocky Horror Picture Show (1975); The Grand Budapest Hotel (2014); Rumours (2024); The Big Lebowski (1998) |
| mood | Harmonious | 66 → 16 | Portrait of a Lady on Fire (2019); Perfect Days (2023); Late Spring (1949); Syndromes and a Century (2006); The Scent of Green Papaya (1993) |
| mood | Nostalgic | 206 → 84 | Go (1999); Napoleon Dynamite (2004); Dead Poets Society (1989); Dawson City: Frozen Time (2016); The Rocky Horror Picture Show (1975) |
| mood | Philosophical | 171 → 100 | The Matrix (1999); Stalker (1979); Wings of Desire (1987); Uncle Boonmee Who Can Recall His Past Lives (2010); The Man from Earth (2007) |
| mood | Curious | 180 → 180 | The Matrix (1999); Something in the Dirt (2022); F for Fake (1973); The Exterminating Angel (1962); The Institute (2012) |
| mood | Afraid | 133 → 53 | Midsommar (2019); The Shining (1980); Thirst (2009); Suspiria (1977); Jacob’s Ladder (1990) |
| mood | Macabre | 275 → 100 | Thirst (2009); Midsommar (2019); Wild at Heart (1990); The Cremator (1969); M (1931) |
| mood | Wired | 182 → 128 | Run Lola Run (1998); Uncut Gems (2019); City of God (2002); To Live and Die in L.A. (1985); Z (1969) |
| mood | Lonely | 91 → 34 | Spirited Away (2001); The Worst Person in the World (2021); The Apartment (1960); Late Spring (1949); Portrait of a Lady on Fire (2019) |
| mood | Cosmic | 158 → 27 | Koyaanisqatsi (1982); Stalker (1979); Baraka (1992); Memoria (2021); Samsara (2011) |
| mood | Angry | 296 → 35 | Trainspotting (1996); Out of the Blue (1980); Paths of Glory (1957); Week End (1967); Snowpiercer (2013) |
| mood | Tender | 284 → 175 | Buffalo ’66 (1998); Lost in Translation (2003); Dead Poets Society (1989); Moonlight (2016); Late Spring (1949) |
| mood | Campy | 173 → 46 | Miami Connection (1987); House (1977); Frankenhooker (1990); Love on a Leash (2011); The Room (2003) |
| vibe | The 25th Hour | 40 → 40 | Picnic at Hanging Rock (1975); Angel’s Egg (1985); Long Day's Journey into Night (2018); Institute Benjamenta (1995); Last Year at Marienbad (1961) |
| vibe | Unwatchable | 63 → 63 | The Hunt (2012); The Devils (1971); Requiem for a Dream (2000); De Humani Corporis Fabrica (2022); The Celebration (1998) |
| vibe | C-Films | 24 → 24 | Samurai Cop (1991); Society (1989); Love on a Leash (2011); Double Down (2005); Frankenhooker (1990) |
| vibe | 90s / Y2K Club Fever | 12 → 12 | Go (1999); Groove (2000); Run Lola Run (1998); Party Girl (1995); Hackers (1995) |
| vibe | 90s Kinetic Weirdness | 75 → 32 | The Matrix (1999); Run Lola Run (1998); Wild at Heart (1990); Freeway (1996); Trainspotting (1996) |
| vibe | High-Energy 70s | 31 → 14 | The French Connection (1971); Dog Day Afternoon (1975); Phantom of the Paradise (1974); The Devil (1972); The Taking of Pelham One Two Three (1974) |
| vibe | Liminal Cinema | 93 → 93 | Woman in the Dunes (1964); Eraserhead (1977); The Shining (1980); Skinamarink (2022); Under the Skin (2013) |
| vibe | Dream Logic | 121 → 121 | The Holy Mountain (1973); I Saw the TV Glow (2024); Alice (1988); Hiroshima mon amour (1959); Enemy (2013) |
| vibe | Rocket Fuel | 72 → 25 | Good Time (2017); Love Exposure (2008); Sorcerer (1977); Burst City (1982); Dead or Alive (1999) |
| vibe | WTF / Brainfuck | 78 → 78 | Oldboy (2003); Everything Everywhere All at Once (2022); Enemy (2013); Being John Malkovich (1999); Brazil (1985) |
| vibe | Weird / Esoteric / Underground | 117 → 117 | The Holy Mountain (1973); Mysterious Skin (2004); Black Narcissus (1947); Mishima: A Life in Four Chapters (1985); Gummo (1997) |
| vibe | Documentaries That Switch You On | 41 → 14 | Marwencol (2010); American Movie (1999); Koyaanisqatsi (1982); Encounters at the End of the World (2007); Man with a Movie Camera (1929) |
| vibe | Weird Documentaries | 21 → 21 | Hands on a Hardbody: The Documentary (1997); The Act of Killing (2012); A Life on the Farm (2022); Gates of Heaven (1978); Occult (2009) |
| vibe | Underground Arthouse | 70 → 70 | Nowhere (1997); Mysterious Skin (2004); The Holy Mountain (1973); The Wolf House (2018); Funeral Parade of Roses (1969) |
| vibe | Night City | 136 → 136 | Go (1999); Victoria (2015); Blue Velvet (1986); Last Life in the Universe (2003); Mikey and Nicky (1976) |
| vibe | Beautifully Damaged | 130 → 130 | Midsommar (2019); Trainspotting (1996); Annette (2021); Black Narcissus (1947); Mysterious Skin (2004) |
| vibe | Tender Weirdos | 55 → 55 | Titane (2021); Punch-Drunk Love (2002); Kin-dza-dza! (1986); 3 Women (1977); Diamantino (2018) |
| vibe | End of the World at 3AM | 18 → 18 | Children of Men (2006); The Hole (1998); Colossus: The Forbin Project (1970); Visitor to a Museum (1989); Aniara (2018) |
| vibe | Elegant Panic | 46 → 11 | Good Time (2017); To Live and Die in L.A. (1985); Z (1969); The Chaser (2008); The Game (1997) |
| vibe | Girly Pop | 83 → 9 | Frances Ha (2012); Girlfriends (1978); Freaky Friday (2003); Hocus Pocus (1993); The Princess Bride (1987) |
| vibe | Camp | 42 → 42 | Female Trouble (1974); Streets of Fire (1984); Kamikaze Girls (2004); Careful (1992); Fateful Findings (2013) |
| vibe | Childhood Nostalgia | 41 → 41 | Finding Nemo (2003); The Goonies (1985); Toy Story (1995); Cars 2 (2011); Monsters, Inc. (2001) |
| vibe | Sing It Like You Mean It | 13 → 13 | Phantom of the Paradise (1974); Pink Floyd: The Wall (1982); The Wizard of Oz (1939); West Side Story (2021); La La Land (2016) |
