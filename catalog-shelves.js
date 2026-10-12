// Explicit profile-sourced shelves.
// These are closed membership sets: the Childhood Nostalgia and Musicals vibes
// do not infer membership from broad semantic tags.
const CHILDHOOD_NOSTALGIA_SHELF = new Set([
  'Alice in Wonderland|2010',
  "A Bug's Life|1998",
  'Cars|2006',
  'Cars 2|2011',
  'Cool Runnings|1993',
  'Coraline|2009',
  "The Emperor's New Groove|2000",
  'Finding Nemo|2003',
  'Flushed Away|2006',
  'Freaky Friday|2003',
  'The Goonies|1985',
  'Hercules|1997',
  'Hocus Pocus|1993',
  'Home Alone|1990',
  'Home Alone 2: Lost in New York|1992',
  "Howl's Moving Castle|2004",
  'The Incredibles|2004',
  'Incredibles 2|2018',
  'Jumanji|1995',
  'The Karate Kid|1984',
  'The Lion King|1994',
  'Matilda|1996',
  'Monsters, Inc.|2001',
  'MouseHunt|1997',
  'My Neighbor Totoro|1988',
  'National Treasure|2004',
  'Night at the Museum|2006',
  'The Parent Trap|1998',
  'The Princess Bride|1987',
  'Ratatouille|2007',
  'The Sandlot|1993',
  'Shrek|2001',
  'Shrek 2|2004',
  'Spirited Away|2001',
  'Spy Kids|2001',
  'Spy Kids 2: The Island of Lost Dreams|2002',
  'Spy Kids 3-D: Game Over|2003',
  'Stuart Little|1999',
  'Toy Story|1995',
  'Toy Story 2|1999',
  'Treasure Planet|2002',
  'Willy Wonka & the Chocolate Factory|1971'
]);

const MUSICALS_SHELF = new Set([
  'All That Jazz|1979',
  'Annette|2021',
  'Grease|1978',
  'Hairspray|2007',
  'Into the Woods|2014',
  'La La Land|2016',
  'Phantom of the Paradise|1974',
  'Pink Floyd: The Wall|1982',
  'The Rocky Horror Picture Show|1975',
  'The Sound of Music|1965',
  'The Wizard of Oz|1939',
  'West Side Story|2021',
  'Willy Wonka & the Chocolate Factory|1971',
  'Tommy|1975'
]);

const PROFILE_SHELF_FILMS = [
  // Childhood / family films present in Joshie or Julie's Letterboxd history.
  F('Alice in Wonderland',2010,'Tim Burton',['2010s','childhood','fantasy','playful','dark'],'storybook weirdness with Burton shadows','🫖',3,3),
  F("A Bug's Life",1998,'John Lasseter',['90s','childhood','playful','adventure','comedy'],'tiny rebels in a giant backyard','🐜',4,3),
  F('Cars',2006,'John Lasseter',['2000s','childhood','playful','tender','adventure'],'small-town warmth behind the racetrack','🏎',4,3),
  F('Cars 2',2011,'John Lasseter',['2010s','childhood','playful','adventure','comedy'],'spy-movie chaos with talking cars','🏁',2,2),
  F('Cool Runnings',1993,'Jon Turteltaub',['90s','childhood','tender','playful','inspiring'],'underdog warmth on an ice track','🛷',4,3),
  F('Coraline',2009,'Henry Selick',['2000s','childhood','dream','macabre','tender'],'a button-eyed childhood nightmare','🪡',4,4),
  F("The Emperor's New Groove",2000,'Mark Dindal',['2000s','childhood','playful','comedy','tender-weirdos'],'Disney slapstick at maximum elasticity','🦙',4,4),
  F('Finding Nemo',2003,'Andrew Stanton',['2000s','childhood','tender','adventure','harmonious'],'ocean adventure powered by parental love','🐠',5,4),
  F('Flushed Away',2006,'David Bowers, Sam Fell',['2000s','childhood','playful','comedy','adventure'],'sewer-city claymation energy in CGI clothes','🐀',3,3),
  F('Freaky Friday',2003,'Mark Waters',['2000s','childhood','playful','comedy','tender'],'mother and daughter swap lives and perspectives','🎸',4,4),
  F('The Goonies',1985,'Richard Donner',['80s','childhood','adventure','playful','nostalgic'],'kids chase pirate treasure under the neighborhood','🏴‍☠️',4,4),
  F('Hercules',1997,'Ron Clements, John Musker',['90s','childhood','playful','musical','myth'],'Greek myth turned into gospel-pop Disney','⚡',4,4),
  F('Hocus Pocus',1993,'Kenny Ortega',['90s','childhood','campy','playful','macabre'],'Halloween sleepover camp','🧹',4,4),
  F('Home Alone',1990,'Chris Columbus',['90s','childhood','playful','comedy','homesick'],'Christmas independence fantasy with booby traps','🏠',4,4),
  F('Home Alone 2: Lost in New York',1992,'Chris Columbus',['90s','childhood','playful','comedy','nostalgic'],'Christmas in New York with bigger traps','🗽',3,3),
  F("Howl's Moving Castle",2004,'Hayao Miyazaki',['2000s','childhood','dream','romantic','tender'],'a wandering castle powered by tenderness and magic','🏰',4,5),
  F('The Incredibles',2004,'Brad Bird',['2000s','childhood','action','playful','tender'],'family dysfunction in superhero form','🦸',5,4),
  F('Incredibles 2',2018,'Brad Bird',['2010s','childhood','action','playful','tender'],'superfamily domestic chaos returns','🍼',3,3),
  F('Jumanji',1995,'Joe Johnston',['90s','childhood','adventure','playful','dark'],'a board game eats the house','🎲',4,4),
  F('The Karate Kid',1984,'John G. Avildsen',['80s','childhood','inspiring','tender','nostalgic'],'wax-on coming-of-age comfort','🥋',4,4),
  F('The Lion King',1994,'Roger Allers, Rob Minkoff',['90s','childhood','musical','tender','emotional-charge'],'Disney grief, inheritance, and songs on the savanna','🦁',5,4),
  F('Matilda',1996,'Danny DeVito',['90s','childhood','playful','tender-weirdos','dark'],'bookish kid power against grotesque adults','📚',4,4),
  F('Monsters, Inc.',2001,'Pete Docter',['2000s','childhood','tender','playful','comedy'],'monsters discover the power of a child laughing','🚪',5,4),
  F('MouseHunt',1997,'Gore Verbinski',['90s','childhood','comedy','playful','macabre'],'two men lose a war against one mouse','🐁',3,3),
  F('My Neighbor Totoro',1988,'Hayao Miyazaki',['80s','childhood','harmonious','tender','dream'],'childhood safety made into a forest spirit','🌱',5,5),
  F('National Treasure',2004,'Jon Turteltaub',['2000s','childhood','adventure','playful','mystery'],'American-history treasure hunt comfort food','🗺',4,3),
  F('Night at the Museum',2006,'Shawn Levy',['2000s','childhood','adventure','playful','comedy'],'museum exhibits wake up after dark','🗿',3,3),
  F('The Parent Trap',1998,'Nancy Meyers',['90s','childhood','girly-pop','tender','playful'],'summer-camp twin plotting and family reunion','🍓',4,5),
  F('The Princess Bride',1987,'Rob Reiner',['80s','childhood','romantic','playful','adventure'],'storybook romance with perfect deadpan timing','⚔️',4,5),
  F('Ratatouille',2007,'Brad Bird',['2000s','childhood','tender','playful','inspiring'],'artistic ambition in a Paris kitchen','🐀',4,5),
  F('The Sandlot',1993,'David Mickey Evans',['90s','childhood','nostalgic','tender','americana'],'summer childhood preserved in baseball dust','⚾',4,3),
  F('Shrek',2001,'Andrew Adamson, Vicky Jenson',['2000s','childhood','playful','comedy','tender-weirdos'],'fairy tales heckled into sincerity','🧅',4,4),
  F('Shrek 2',2004,'Andrew Adamson, Kelly Asbury, Conrad Vernon',['2000s','childhood','playful','comedy','campy'],'sequel fairy-tale chaos with pop-song swagger','🧪',4,4),
  F('Spy Kids',2001,'Robert Rodriguez',['2000s','childhood','campy','adventure','playful'],'plastic-gadget kid espionage','🕶',4,4),
  F('Spy Kids 2: The Island of Lost Dreams',2002,'Robert Rodriguez',['2000s','childhood','campy','adventure','playful'],'kid spies meet homemade monsters','🦎',4,4),
  F('Spy Kids 3-D: Game Over',2003,'Robert Rodriguez',['2000s','childhood','campy','cyber','playful'],'video-game childhood in red-blue 3D','🎮',3,3),
  F('Stuart Little',1999,'Rob Minkoff',['90s','childhood','tender','playful','comedy'],'tiny adopted mouse in a very large family','🐭',3,3),
  F('Toy Story',1995,'John Lasseter',['90s','childhood','tender','playful','nostalgic'],'toys fear being outgrown','🤠',5,4),
  F('Toy Story 2',1999,'John Lasseter',['90s','childhood','tender','playful','nostalgic'],'toys confront abandonment and immortality','🧸',4,4),
  F('Treasure Planet',2002,'Ron Clements, John Musker',['2000s','childhood','adventure','sci-fi','tender'],'space pirates and wounded adolescence','🚀',4,4),
  F('Willy Wonka & the Chocolate Factory',1971,'Mel Stuart',['70s','childhood','musical','playful','macabre'],'candy-colored morality tale with teeth','🍫',4,4),

  // Full-on musicals present in Joshie or Julie's history/watchlists.
  F('Grease',1978,'Randal Kleiser',['70s','musical','romantic','campy','nostalgic'],'high-school romance performed in leather and song','🕺',4,3),
  F('Hairspray',2007,'Adam Shankman',['2000s','musical','campy','playful','romantic'],'bright choreography with civil-rights backbone','💃',3,4),
  F('Into the Woods',2014,'Rob Marshall',['2010s','musical','folk','dark','playful'],'fairy tales collide after the wishes come true','🌲',3,3),
  F('La La Land',2016,'Damien Chazelle',['2010s','musical','romantic','beautiful-damage','nostalgic'],'dreamers sing through love and compromise','🌃',5,4),
  F('Pink Floyd: The Wall',1982,'Alan Parker',['80s','musical','experimental','dark','psychological'],'rock opera as authoritarian fever dream','🧱',4,3),
  F('The Sound of Music',1965,'Robert Wise',['60s','musical','tender','harmonious','nostalgic'],'family warmth and songs under gathering history','⛰',4,4),
  F('The Wizard of Oz',1939,'Victor Fleming',['30s','musical','childhood','dream','playful'],'Technicolor childhood myth through song','🌈',5,5),
  F('West Side Story',2021,'Steven Spielberg',['2020s','musical','romantic','beautiful-damage','kinetic'],'street tragedy staged as muscular musical cinema','💃',3,4),
  F('Tommy',1975,'Ken Russell',['70s','musical','campy','psychosexual','weird'],'rock opera explodes into pop-religious delirium','🎸',4,3)
];

for (const film of PROFILE_SHELF_FILMS) {
  const key=film.title+'|'+film.year;
  if (!FILMS.some(existing => existing.title === film.title && existing.year === film.year)) {
    if(CHILDHOOD_NOSTALGIA_SHELF.has(key)) film.tags.push('shelf-only-childhood');
    if(MUSICALS_SHELF.has(key)) film.tags.push('shelf-only-musical');
    FILMS.push(film);
  }
}
