export type CelebrityCategory =
  | 'All'
  | 'SA Icons'
  | 'Music'
  | 'Film & TV'
  | 'Sports';

export interface CelebrityCard {
  id: string;
  name: string;
  category: Exclude<CelebrityCategory, 'All'>;
  hints: [string, string, string];
}

export type CelebrityOutcome = 'guessing' | 'guessed' | 'gave_up';

export interface PlayerCelebrityView {
  canSeeSecret: boolean;
  displayName: string;
  category: string;
  hints: string[];
  questionCount: number;
  outcome: CelebrityOutcome;
}

export const CELEBRITY_DECK: readonly CelebrityCard[] = [
  // South African Icons (10)
  {
    id: 'tyla',
    name: 'Tyla',
    category: 'SA Icons',
    hints: ['From Johannesburg', 'Grammy-winning singer ("Water")', 'Popiano global star'],
  },
  {
    id: 'trevor-noah',
    name: 'Trevor Noah',
    category: 'SA Icons',
    hints: ['South African comedian & author', 'Hosted The Daily Show', 'Wrote "Born a Crime"'],
  },
  {
    id: 'black-coffee',
    name: 'Black Coffee',
    category: 'SA Icons',
    hints: ['World-famous South African DJ & producer', 'Won a Grammy for "Subconsciously"', 'House music icon'],
  },
  {
    id: 'siya-kolisi',
    name: 'Siya Kolisi',
    category: 'SA Icons',
    hints: ['Springboks rugby captain', 'Two-time Rugby World Cup winner', 'Wears jersey number 6'],
  },
  {
    id: 'charlize-theron',
    name: 'Charlize Theron',
    category: 'SA Icons',
    hints: ['Born in Benoni, South Africa', 'Oscar-winning Hollywood actress', 'Starred in Mad Max: Fury Road'],
  },
  {
    id: 'thuso-mbedu',
    name: 'Thuso Mbedu',
    category: 'SA Icons',
    hints: ['Actress from Pietermaritzburg', 'Starred in The Woman King', 'Emmy-nominated performer'],
  },
  {
    id: 'kabza-de-small',
    name: 'Kabza De Small',
    category: 'SA Icons',
    hints: ['Known as the King of Amapiano', 'South African DJ & record producer', 'Part of Scorpion Kings'],
  },
  {
    id: 'uncle-waffles',
    name: 'Uncle Waffles',
    category: 'SA Icons',
    hints: ['Amapiano DJ & performer', 'Performed at Coachella', 'Viral dance energy behind the decks'],
  },
  {
    id: 'zakes-bantwini',
    name: 'Zakes Bantwini',
    category: 'SA Icons',
    hints: ['South African musician & producer', 'Known for mega-hit "Osama"', 'Grammy winner from KwaMashu'],
  },
  {
    id: 'zozibini-tunzi',
    name: 'Zozibini Tunzi',
    category: 'SA Icons',
    hints: ['Crowned Miss Universe 2019', 'Born in Eastern Cape, South Africa', 'Model, actress & presenter'],
  },

  // Music Superstars (15)
  {
    id: 'beyonce',
    name: 'Beyoncé',
    category: 'Music',
    hints: ['Started in Destiny’s Child', 'Most Grammy wins in history', 'Nicknamed Queen Bey'],
  },
  {
    id: 'rihanna',
    name: 'Rihanna',
    category: 'Music',
    hints: ['Born in Barbados', 'Founder of Fenty Beauty', 'Hits include "Umbrella" & "Diamonds"'],
  },
  {
    id: 'drake',
    name: 'Drake',
    category: 'Music',
    hints: ['Canadian rapper & singer from Toronto', 'Founder of OVO Sound', 'Started as an actor on Degrassi'],
  },
  {
    id: 'kendrick-lamar',
    name: 'Kendrick Lamar',
    category: 'Music',
    hints: ['Rapper from Compton, California', 'Pulitzer Prize winner', 'Performed at the Super Bowl Halftime Show'],
  },
  {
    id: 'sza',
    name: 'SZA',
    category: 'Music',
    hints: ['R&B superstar behind album "SOS"', 'Songs include "Kill Bill" & "Snooze"', 'Signed to Top Dawg Entertainment'],
  },
  {
    id: 'taylor-swift',
    name: 'Taylor Swift',
    category: 'Music',
    hints: ['Record-breaking Eras Tour', 'Started in country, moved to pop', 'Famous for songwriting & album eras'],
  },
  {
    id: 'burna-boy',
    name: 'Burna Boy',
    category: 'Music',
    hints: ['Nigerian Afrobeats giant', 'Known for "Last Last" & "City Boys"', 'Calls his style Afro-fusion'],
  },
  {
    id: 'tems',
    name: 'Tems',
    category: 'Music',
    hints: ['Nigerian R&B singer & producer', 'Grammy winner ("Love Me JeJe")', 'Featured on "Essence"'],
  },
  {
    id: 'chris-brown',
    name: 'Chris Brown',
    category: 'Music',
    hints: ['American R&B singer & elite dancer', 'Sold out FNB Stadium in Johannesburg', 'Breakout teen debut in 2005'],
  },
  {
    id: 'adele',
    name: 'Adele',
    category: 'Music',
    hints: ['British powerhouse vocalist', 'Albums named after ages (19, 21, 25, 30)', 'Sang "Hello" & "Someone Like You"'],
  },
  {
    id: 'bruno-mars',
    name: 'Bruno Mars',
    category: 'Music',
    hints: ['Born in Hawaii', 'Half of Silk Sonic', 'Hits include "Uptown Funk" & "24K Magic"'],
  },
  {
    id: 'nicki-minaj',
    name: 'Nicki Minaj',
    category: 'Music',
    hints: ['Queen of Rap from Queens, NY', 'Fanbase called the Barbz', 'Known for "Pink Friday" & "Super Bass"'],
  },
  {
    id: 'ariana-grande',
    name: 'Ariana Grande',
    category: 'Music',
    hints: ['Four-octave pop vocalist', 'Played Glinda in Wicked', 'Known for "thank u, next" & "7 rings"'],
  },
  {
    id: 'doja-cat',
    name: 'Doja Cat',
    category: 'Music',
    hints: ['Rapper & pop star ("Paint The Town Red")', 'South African heritage through her father', 'Known for playful chameleonic style'],
  },
  {
    id: 'usher',
    name: 'Usher',
    category: 'Music',
    hints: ['R&B legend behind album "Confessions"', 'Las Vegas residency icon', 'Hits include "Yeah!" & "U Got It Bad"'],
  },

  // Film & TV (13)
  {
    id: 'zendaya',
    name: 'Zendaya',
    category: 'Film & TV',
    hints: ['Stars in Euphoria & Dune', 'Played MJ in Spider-Man', 'Red-carpet high-fashion icon'],
  },
  {
    id: 'denzel-washington',
    name: 'Denzel Washington',
    category: 'Film & TV',
    hints: ['Two-time Oscar-winning legend', 'Starred in Training Day & The Equalizer', 'Iconic commanding voice'],
  },
  {
    id: 'michael-b-jordan',
    name: 'Michael B. Jordan',
    category: 'Film & TV',
    hints: ['Played Killmonger in Black Panther', 'Star & director in the Creed franchise', 'American leading man'],
  },
  {
    id: 'viola-davis',
    name: 'Viola Davis',
    category: 'Film & TV',
    hints: ['EGOT winner (Emmy, Grammy, Oscar, Tony)', 'Starred in How to Get Away with Murder', 'Led The Woman King'],
  },
  {
    id: 'will-smith',
    name: 'Will Smith',
    category: 'Film & TV',
    hints: ['Started on The Fresh Prince of Bel-Air', 'Starred in Men in Black & Bad Boys', 'Won an Oscar for King Richard'],
  },
  {
    id: 'lupita-nyongo',
    name: 'Lupita Nyong’o',
    category: 'Film & TV',
    hints: ['Kenyan-Mexican Oscar-winning actress', 'Played Nakia in Black Panther', 'Starred in Us & A Quiet Place: Day One'],
  },
  {
    id: 'margot-robbie',
    name: 'Margot Robbie',
    category: 'Film & TV',
    hints: ['Australian actress & producer', 'Played Barbie in the billion-dollar film', 'Also played Harley Quinn'],
  },
  {
    id: 'kevin-hart',
    name: 'Kevin Hart',
    category: 'Film & TV',
    hints: ['Stand-up comedian & movie star from Philly', 'Frequent duo with Dwayne Johnson', 'Starred in Jumanji & Ride Along'],
  },
  {
    id: 'dwayne-johnson',
    name: 'Dwayne "The Rock" Johnson',
    category: 'Film & TV',
    hints: ['Former WWE wrestling champion', 'Action movie megastar (Fast & Furious, Jumanji)', 'Voiced Maui in Moana'],
  },
  {
    id: 'ryan-reynolds',
    name: 'Ryan Reynolds',
    category: 'Film & TV',
    hints: ['Canadian actor known for witty humor', 'Plays Deadpool', 'Co-owns Wrexham AFC football club'],
  },
  {
    id: 'robert-downey-jr',
    name: 'Robert Downey Jr.',
    category: 'Film & TV',
    hints: ['Played Tony Stark / Iron Man in Marvel', 'Won an Oscar for Oppenheimer', 'Also starred as Sherlock Holmes'],
  },
  {
    id: 'kim-kardashian',
    name: 'Kim Kardashian',
    category: 'Film & TV',
    hints: ['Reality TV mogul & entrepreneur', 'Founder of SKIMS', 'Studying law & criminal justice reform'],
  },
  {
    id: 'oprah-winfrey',
    name: 'Oprah Winfrey',
    category: 'Film & TV',
    hints: ['Legendary talk-show host & billionaire', 'Acted in The Color Purple', 'Founded her own TV network & leadership academy in SA'],
  },

  // Sports Legends (10)
  {
    id: 'cristiano-ronaldo',
    name: 'Cristiano Ronaldo',
    category: 'Sports',
    hints: ['Portuguese football icon ("CR7")', 'Famous "Siuuu!" celebration', 'Played for Man United & Real Madrid'],
  },
  {
    id: 'lionel-messi',
    name: 'Lionel Messi',
    category: 'Sports',
    hints: ['Argentine World Cup-winning captain', 'Eight-time Ballon d’Or winner', 'Barcelona legend now at Inter Miami'],
  },
  {
    id: 'serena-williams',
    name: 'Serena Williams',
    category: 'Sports',
    hints: ['23 Grand Slam singles titles in tennis', 'Won the Australian Open while pregnant', 'Younger sister of Venus Williams'],
  },
  {
    id: 'lebron-james',
    name: 'LeBron James',
    category: 'Sports',
    hints: ['NBA all-time leading scorer', 'Nicknamed "King James"', 'Played on an NBA court alongside his son Bronny'],
  },
  {
    id: 'lewis-hamilton',
    name: 'Lewis Hamilton',
    category: 'Sports',
    hints: ['Seven-time Formula 1 World Champion', 'Knighted British racing driver', 'Moved from Mercedes to Ferrari'],
  },
  {
    id: 'kylian-mbappe',
    name: 'Kylian Mbappé',
    category: 'Sports',
    hints: ['French football superstar', 'Scored a hat-trick in the 2022 World Cup Final', 'Plays for Real Madrid'],
  },
  {
    id: 'simone-biles',
    name: 'Simone Biles',
    category: 'Sports',
    hints: ['Most decorated gymnast in history', 'Has multiple Olympic skills named after her', 'American gold-medal icon'],
  },
  {
    id: 'stephen-curry',
    name: 'Stephen Curry',
    category: 'Sports',
    hints: ['Greatest 3-point shooter in NBA history', 'Golden State Warriors point guard', 'Famous "Night Night" celebration'],
  },
  {
    id: 'naomi-osaka',
    name: 'Naomi Osaka',
    category: 'Sports',
    hints: ['Four-time Grand Slam tennis champion', 'Lit the Tokyo Olympic cauldron', 'Represents Japan'],
  },
  {
    id: 'usain-bolt',
    name: 'Usain Bolt',
    category: 'Sports',
    hints: ['Fastest sprinter in world history (9.58s 100m)', 'Jamaican eight-time Olympic gold medalist', 'Signature lightning pose'],
  },
];

export function filterCelebrityDeck(category: CelebrityCategory): CelebrityCard[] {
  if (category === 'All') return [...CELEBRITY_DECK];
  return CELEBRITY_DECK.filter((c) => c.category === category);
}

export function drawNextCelebrity(
  category: CelebrityCategory,
  excludeIds: string[] = [],
  rng: () => number = Math.random
): CelebrityCard {
  const pool = filterCelebrityDeck(category);
  const unseen = pool.filter((c) => !excludeIds.includes(c.id));
  const candidates = unseen.length > 0 ? unseen : pool;
  const idx = Math.floor(rng() * candidates.length);
  return candidates[idx];
}

export function getPlayerCelebrityView(params: {
  viewerIsClueGiver: boolean;
  secretCard: CelebrityCard | null;
  publicCategory: string;
  revealedName: string;
  questionCount: number;
  outcome: CelebrityOutcome;
}): PlayerCelebrityView {
  const {
    viewerIsClueGiver,
    secretCard,
    publicCategory,
    revealedName,
    questionCount,
    outcome,
  } = params;

  const isResolved = outcome === 'guessed' || outcome === 'gave_up';
  const canSeeSecret = viewerIsClueGiver || isResolved;

  if (!canSeeSecret) {
    return {
      canSeeSecret: false,
      displayName: 'Mystery Celebrity',
      category: publicCategory,
      hints: [],
      questionCount,
      outcome,
    };
  }

  return {
    canSeeSecret: true,
    displayName: secretCard?.name || revealedName || 'Mystery Celebrity',
    category: secretCard?.category || publicCategory,
    hints: secretCard ? [...secretCard.hints] : [],
    questionCount,
    outcome,
  };
}

export function computeSwappedRoles(
  currentClueGiverUid: string,
  hostUid: string,
  guestUid: string
): { nextClueGiverUid: string; nextGuesserUid: string } {
  if (!guestUid) {
    return { nextClueGiverUid: hostUid, nextGuesserUid: '' };
  }
  const nextClueGiverUid = currentClueGiverUid === hostUid ? guestUid : hostUid;
  const nextGuesserUid = nextClueGiverUid === hostUid ? guestUid : hostUid;
  return { nextClueGiverUid, nextGuesserUid };
}
