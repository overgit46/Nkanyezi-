export type PhotoCategory = 'all' | 'her' | 'us';

export interface MemoryPhoto {
  id: string;
  src: string;
  alt: string;
  title: string;
  season: string;
  category: Exclude<PhotoCategory, 'all'>;
  caption: string;
  aspectClass: string;
  imageClass?: string;
  featuredSpan?: string;
}

export interface AdoredQuality {
  id: string;
  index: string;
  title: string;
  kicker: string;
  summary: string;
  deeperNote: string;
}

export interface OpenWhenEnvelope {
  id: string;
  prompt: string;
  moodLabel: string;
  heading: string;
  message: string;
  photoId: string;
}

export interface DateVoucher {
  id: string;
  title: string;
  vibe: string;
  description: string;
}

export const MEMORY_PHOTOS: MemoryPhoto[] = [
  {
    id: 'pink-feather-glow',
    src: './assets/aistudio/IMG-20260705-WA0020_ccebcede.jpg',
    alt: 'Nkanyezi smiling warmly in a pink feathered dress and black faux-fur coat',
    title: 'Main Character Energy',
    season: 'July Evening · Film Flash',
    category: 'her',
    caption:
      'That pink feathered dress, the fur coat draped over your shoulders, and that effortless smile. You walk into a room and immediately become the warmest light in it.',
    aspectClass: 'aspect-[3/4]',
    imageClass: 'object-cover object-center',
    featuredSpan: 'md:col-span-2 md:row-span-2',
  },
  {
    id: 'golden-mirror-hug',
    src: './assets/aistudio/IMG-20261009-WA0082_9e5a90c3.jpg',
    alt: 'Warm mirror photo of us hugging closely in white tops and denim',
    title: 'Right Where I Belong',
    season: 'October · Golden Hour',
    category: 'us',
    caption:
      'Arms wrapped around you, watching you laugh with your eyes closed. Out of every place I could ever be, holding you like this is my favorite.',
    aspectClass: 'aspect-[4/5]',
    // Slight scale cleanly trims any top/bottom phone screenshot letterboxing
    imageClass: 'object-cover object-center scale-[1.14]',
  },
  {
    id: 'sweet-kiss-selfie',
    src: './assets/aistudio/IMG-20261002-WA0050_4923e750.jpg',
    alt: 'Nkanyezi with side-swept braids blowing a playful kiss toward the camera',
    title: 'Sending One Right Back',
    season: 'October · Morning Light',
    category: 'her',
    caption:
      'Playful, sweet, and unapologetically girly. Every time my phone lights up with your face, my whole day gets lighter.',
    aspectClass: 'aspect-[4/5]',
    imageClass: 'object-cover object-center',
  },
  {
    id: 'blue-sky-us',
    src: './assets/aistudio/20260814_132624_fbb80b8f.jpg',
    alt: 'Sunny outdoor selfie of the two of us smiling playfully under a bright blue sky',
    title: 'Blue Skies & Goofy Grins',
    season: 'August · Clear Afternoon',
    category: 'us',
    caption:
      'Zero filters, bright sun, and us just being completely ourselves together. You bring out the happiest, most carefree side of me.',
    aspectClass: 'aspect-[4/5]',
    // Gentle scale crops camera watermark cleanly at bottom-left corner
    imageClass: 'object-cover object-top scale-[1.09]',
  },
  {
    id: 'radiant-smile-braids',
    src: './assets/aistudio/IMG-20261002-WA0044_bb33cdfb.jpg',
    alt: 'Close-up portrait of Nkanyezi smiling brightly with her hand resting gently on her cheek',
    title: 'Pure Warmth',
    season: 'October · Soft Daylight',
    category: 'her',
    caption:
      'Look at your eyes and that genuine smile. There is zero pretense in you—just honesty, kindness, and a heart that feels like home.',
    aspectClass: 'aspect-[4/5]',
    imageClass: 'object-cover object-center',
  },
  {
    id: 'velvet-profile',
    src: './assets/aistudio/IMG-20260705-WA0021_e20e865f.jpg',
    alt: 'Side profile portrait of Nkanyezi in a black fur coat with sleek curly ponytail',
    title: 'Grace in Every Angle',
    season: 'July Evening · Portrait',
    category: 'her',
    caption:
      'Poised, feminine, and quietly confident. Even when you are not trying, you carry yourself with so much grace.',
    aspectClass: 'aspect-[4/5]',
    imageClass: 'object-cover object-center',
  },
];

export const ADORED_QUALITIES: AdoredQuality[] = [
  {
    id: 'honesty',
    index: '01',
    kicker: 'Emotional Clarity',
    title: 'How honest you are about how you feel',
    summary:
      'With you, I never have to guess or decode silence. You speak your heart plainly, gently, and truthfully.',
    deeperNote:
      'Real honesty takes courage. I love that whether you are happy, thoughtful, or telling me something real, you trust me enough to be transparent. It makes loving you feel safe and grounded.',
  },
  {
    id: 'intelligence',
    index: '02',
    kicker: 'Sharp & Perceptive',
    title: 'Your mind—you are genuinely brilliant',
    summary:
      'You are not just smart on paper; you notice nuances, connect dots effortlessly, and hold conversations that keep me inspired.',
    deeperNote:
      'I admire the way you think through things. Talking with you never feels shallow—your perspective is sharp, thoughtful, and wise in a way that makes me respect you more every single day.',
  },
  {
    id: 'empathy',
    index: '03',
    kicker: 'Deep Understanding',
    title: 'How deeply you understand people—even me',
    summary:
      'You step into other people’s shoes naturally, reading situations with grace and understanding me even before I find the right words.',
    deeperNote:
      'Not everyone has emotional intelligence like yours. You see beneath the surface of how people react, and the patience and empathy you show me when life gets busy means more than I say out loud.',
  },
  {
    id: 'womanhood',
    index: '04',
    kicker: 'Respect & Devotion',
    title: 'Everything you bring as a woman in our relationship',
    summary:
      'The mutual respect, the loyalty, the softness, and the quiet strength—you know what makes a partnership flourish.',
    deeperNote:
      'You bring peace, standards, honesty, and genuine respect to the table. You make me proud to stand beside you and motivated to show up as my best self for us.',
  },
  {
    id: 'listening',
    index: '05',
    kicker: 'Safe Harbor',
    title: 'Your caring heart that truly listens',
    summary:
      'Whatever is on my mind—big plans, random thoughts, or long days—you are right there listening with warmth and care.',
    deeperNote:
      'Being truly heard is rare. You never make me feel rushed or brushed aside; your loving presence turns ordinary conversations into my favorite part of the day.',
  },
  {
    id: 'just-you',
    index: '06',
    kicker: 'Unapologetically You',
    title: 'Simply the way you are, Nkanyezi',
    summary:
      'Girly, warm, witty, affectionate, and real. I would not change a single detail about who you are.',
    deeperNote:
      'From getting all dressed up in pink to laughing in the sunshine with me, I love every side of you, Nkanyezi—you genuinely brighten my whole world.',
  },
];

export const OPEN_WHEN_ENVELOPES: OpenWhenEnvelope[] = [
  {
    id: 'getting-ready',
    prompt: 'Open when you are getting all dressed up',
    moodLabel: 'Soft Glam · Just For You',
    heading: 'Yes, you look breathtaking right now.',
    message:
      'Before you even second-guess your hair, your outfit, or the mirror—stop right there. You have that effortless glow that turns heads without trying. Send me a picture immediately so I can hype you up properly.',
    photoId: 'pink-feather-glow',
  },
  {
    id: 'miss-us',
    prompt: 'Open when you miss me',
    moodLabel: 'Close To Heart · Us Two',
    heading: 'Consider this a warm hug from behind.',
    message:
      'Even when we are in different places during the day, you are still the person on my mind. Call me or text me—no matter how busy work or code gets, I always have time to listen to your voice.',
    photoId: 'golden-mirror-hug',
  },
  {
    id: 'doubt-yourself',
    prompt: 'Open when you need a reminder of your brilliance',
    moodLabel: 'Truth Check · Her Mind',
    heading: 'Never forget how sharp and capable you are.',
    message:
      'You are one of the most intelligent, emotionally perceptive people I have ever met. Whatever challenge or decision is in front of you today, trust your instincts—your mind and your heart rarely miss.',
    photoId: 'radiant-smile-braids',
  },
  {
    id: 'need-a-laugh',
    prompt: 'Open when you just want to smile',
    moodLabel: 'Sunshine · Pure Joy',
    heading: 'Look at us—how lucky am I?',
    message:
      'I usually spend my days designing interfaces for companies and strangers, so building a whole corner of the internet dedicated purely to making you smile might be my favorite perk of being a software developer.',
    photoId: 'blue-sky-us',
  },
];

export const DATE_VOUCHERS: DateVoucher[] = [
  {
    id: 'dressed-up-dinner',
    title: 'Get Dressed Up Dinner Date',
    vibe: 'Suburban Chic · Evening Out',
    description: 'Pick your favorite spot, wear your favorite outfit, and let me handle every detail of the night.',
  },
  {
    id: 'iced-coffee-drive',
    title: 'Sweet Treats & Sunset Drive',
    vibe: 'Golden Hour · Playlist On',
    description: 'Iced drinks, pastries, your music on aux, and talking about everything on your mind with zero rush.',
  },
  {
    id: 'cozy-listen-night',
    title: 'Cozy Takeout & Uninterrupted Time',
    vibe: 'Comfy Night · Just Us',
    description: 'Your favorite comfort food, phones on silent, and pure quality time together.',
  },
];

export const LOVE_LETTER_PARAGRAPHS: string[] = [
  'Nkanyezi yami,',
  'I spend so much of my life building websites and interfaces for businesses and millions of strangers I will never meet. Sitting down to build something just for you felt completely different—because for once, this is not about metrics or clients. It is just about how much I adore you.',
  'I love how honest you are about how you feel. I love how genuinely intelligent you are, and how naturally you understand what other people are going through—especially me, even in moments when I do not say everything out loud.',
  'Thank you for everything you bring into our relationship as a woman: the respect, the warmth, the loyalty, and the way you are always there to truly listen to whatever I have to say. You make loving you feel effortless.',
  'Your name, Nkanyezi, could not fit you more perfectly—because of the light and calm you bring into my life simply by being yourself. Never stop being the warm, girly, brilliant, caring soul that you are.',
];
