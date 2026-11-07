// Word Duel (Boggle / Word Hunt) Pure Logic

// Classic Boggle 16-dice configurations
export const BOGGLE_DICE = [
  'AAEEGN', 'ELRTTY', 'AOOTTW', 'ABBJOO',
  'EHRTVW', 'CIMOTU', 'DISTTY', 'EIOSST',
  'DELRVY', 'ACHOPS', 'HIMNQU', 'EEINSU',
  'EEGHNW', 'AFFKPS', 'HLNNRZ', 'DEILRX',
];

// Rich romantic and standard English words dataset (3+ letters)
export const CORE_DICTIONARY: string[] = [
  // Sweet & Couple Words
  'LOVE', 'STAR', 'DEAR', 'KISS', 'CARE', 'WARM', 'MINE', 'GIVE', 'HOLD', 'WISH',
  'HOPE', 'TRUE', 'PURE', 'GLOW', 'ROSE', 'SONG', 'BEAT', 'KIND', 'SOUL', 'LIFE',
  'HOME', 'LOOK', 'SEEK', 'MEET', 'TIME', 'DATE', 'GIFT', 'LUCK', 'PEACE', 'SWEET',
  'HEART', 'LIGHT', 'DREAM', 'SMILE', 'SHINE', 'GRACE', 'HONEY', 'CHARM', 'ANGEL',
  // Everyday English words
  'ACT', 'ACE', 'AGE', 'AIR', 'ALL', 'AND', 'ANT', 'ANY', 'APE', 'ARM', 'ART', 'ASH', 'ASK', 'ATE',
  'BAD', 'BAG', 'BAR', 'BAT', 'BAY', 'BED', 'BEE', 'BEG', 'BET', 'BIG', 'BIN', 'BIT', 'BOW', 'BOX', 'BOY',
  'BUS', 'BUT', 'BUY', 'CAN', 'CAP', 'CAR', 'CAT', 'COW', 'CRY', 'CUP', 'CUT', 'DAY', 'DEN', 'DEW', 'DID',
  'DIG', 'DIM', 'DIP', 'DOG', 'DOT', 'DRY', 'DUE', 'EAR', 'EAT', 'EGG', 'END', 'ERA', 'EYE', 'FAN', 'FAR',
  'FAT', 'FED', 'FEE', 'FEW', 'FIG', 'FIN', 'FIT', 'FLY', 'FOG', 'FOR', 'FOX', 'FUN', 'FUR', 'GAP', 'GAS',
  'GEL', 'GET', 'GOD', 'GOT', 'GUM', 'GUN', 'GUT', 'GUY', 'GYM', 'HAD', 'HAM', 'HAS', 'HAT', 'HAY', 'HEM',
  'HEN', 'HER', 'HEY', 'HID', 'HIM', 'HIP', 'HIT', 'HOG', 'HOP', 'HOT', 'HOW', 'HUB', 'HUG', 'HUM', 'HUT',
  'ICE', 'ILL', 'INK', 'INN', 'ION', 'ITS', 'IVY', 'JAM', 'JAR', 'JAW', 'JAY', 'JET', 'JOB', 'JOG', 'JOY',
  'KEY', 'KID', 'KIT', 'LAB', 'LAD', 'LAP', 'LAW', 'LAY', 'LED', 'LEG', 'LET', 'LID', 'LIE', 'LIP', 'LIT',
  'LOG', 'LOT', 'LOW', 'MAD', 'MAN', 'MAP', 'MAT', 'MAY', 'MEN', 'MUD', 'MUG', 'NET', 'NEW', 'NIL', 'NOD',
  'NOT', 'NOW', 'NUT', 'OAK', 'OAR', 'ODD', 'OFF', 'OIL', 'OLD', 'ONE', 'OPT', 'ORE', 'OUR', 'OUT', 'OWL',
  'OWN', 'PAD', 'PAN', 'PAY', 'PEA', 'PEG', 'PEN', 'PET', 'PIE', 'PIG', 'PIN', 'PIT', 'PLY', 'POD', 'POP',
  'POT', 'PRO', 'PUB', 'PUP', 'PUT', 'RAG', 'RAM', 'RAN', 'RAP', 'RAT', 'RAW', 'RAY', 'RED', 'RIB', 'RID',
  'RIG', 'RIM', 'RIP', 'ROB', 'ROD', 'ROT', 'ROW', 'RUB', 'RUG', 'RUN', 'RUT', 'RYE', 'SAD', 'SAG', 'SAP',
  'SAT', 'SAW', 'SAY', 'SEA', 'SET', 'SEW', 'SHE', 'SHY', 'SIN', 'SIP', 'SIR', 'SIT', 'SKI', 'SKY', 'SLY',
  'SOB', 'SON', 'SOW', 'SOY', 'SPY', 'STY', 'SUE', 'SUM', 'SUN', 'TAB', 'TAG', 'TAN', 'TAP', 'TAR', 'TEA',
  'TEN', 'THE', 'TIE', 'TIN', 'TIP', 'TOE', 'TON', 'TOP', 'TOW', 'TOY', 'TRY', 'TUB', 'TUG', 'TWO', 'URN',
  'USE', 'VAN', 'VAT', 'VET', 'VIA', 'VOW', 'WAR', 'WAS', 'WAY', 'WEB', 'WED', 'WEE', 'WET', 'WHO', 'WHY',
  'WIG', 'WIN', 'WIT', 'WON', 'YAK', 'YAM', 'YAP', 'YAW', 'YEA', 'YES', 'YET', 'YOU', 'ZIP', 'ZOO',
  // 4 letters
  'ABLE', 'ACHE', 'ACID', 'AGED', 'AIDE', 'ALSO', 'AMEN', 'AREA', 'ARMY', 'AWAY', 'BABY', 'BACK', 'BAKE',
  'BALL', 'BAND', 'BANK', 'BARE', 'BARK', 'BARN', 'BASE', 'BATH', 'BEAM', 'BEAN', 'BEAR', 'BEEF', 'BEER',
  'BELL', 'BELT', 'BEND', 'BEST', 'BIRD', 'BITE', 'BLOW', 'BLUE', 'BOAT', 'BODY', 'BOIL', 'BOLD', 'BOMB',
  'BOND', 'BONE', 'BOOK', 'BOOM', 'BOOT', 'BORN', 'BOSS', 'BOTH', 'BOWL', 'BURN', 'BURY', 'BUSH', 'BUSY',
  'CALL', 'CALM', 'CAMP', 'CARD', 'CART', 'CASE', 'CASH', 'CAST', 'CAVE', 'CELL', 'CHAT', 'CHEF', 'CHIN',
  'CHIP', 'CITY', 'CLAP', 'CLAW', 'CLAY', 'CLIP', 'CLUB', 'CLUE', 'COAL', 'COAT', 'COIN', 'COLD', 'COME',
  'COOK', 'COOL', 'COPE', 'COPY', 'CORD', 'CORE', 'CORN', 'COST', 'CRAB', 'CREW', 'CROP', 'CROW', 'CURE',
  'DARK', 'DART', 'DAWN', 'DEAD', 'DEAL', 'DEBT', 'DECK', 'DEEP', 'DEER', 'DESK', 'DIET', 'DIRT', 'DISC',
  'DISH', 'DISK', 'DIVE', 'DOCK', 'DOLL', 'DOOM', 'DOOR', 'DOSE', 'DOWN', 'DRAG', 'DRAW', 'DRIP', 'DROP',
  'DRUM', 'DUCK', 'DUST', 'DUTY', 'EACH', 'EARN', 'EAST', 'EASY', 'EDGE', 'EVEN', 'EVER', 'EVIL', 'EXIT',
  'FACE', 'FACT', 'FADE', 'FAIL', 'FAIR', 'FALL', 'FAME', 'FARM', 'FAST', 'FATE', 'FEAR', 'FEED', 'FEEL',
  'FEET', 'FELL', 'FELT', 'FILE', 'FILL', 'FILM', 'FIND', 'FINE', 'FIRE', 'FIRM', 'FISH', 'FIST', 'FLAT',
  'FLEE', 'FLEW', 'FLOW', 'FOAM', 'FOIL', 'FOLD', 'FOLK', 'FOOD', 'FOOL', 'FOOT', 'FORK', 'FORM', 'FORT',
  'FREE', 'FROG', 'FROM', 'FUEL', 'FULL', 'FUND', 'GAIN', 'GAME', 'GATE', 'GEAR', 'GLAD', 'GOAL', 'GOAT',
  'GOLD', 'GOLF', 'GONE', 'GOOD', 'GRAB', 'GRAY', 'GREW', 'GRID', 'GRIN', 'GRIP', 'GROW', 'GULF', 'HAIL',
  'HAIR', 'HALF', 'HALL', 'HALT', 'HAND', 'HANG', 'HARD', 'HARM', 'HATE', 'HAVE', 'HAWK', 'HEAD', 'HEAL',
  'HEAP', 'HEAT', 'HELL', 'HELP', 'HERD', 'HERO', 'HIDE', 'HIGH', 'HILL', 'HINT', 'HIRE', 'HISS', 'HOOK',
  'HORN', 'HOSE', 'HOST', 'HOUR', 'HUGE', 'HUNT', 'HURT', 'ICON', 'IDEA', 'IDLE', 'INCH', 'INTO', 'IRON',
  'ISLE', 'ITEM', 'JAIL', 'JOIN', 'JOKE', 'JUMP', 'JURY', 'JUST', 'KEEN', 'KEEP', 'KICK', 'KILL', 'KING',
  'KITE', 'KNEE', 'KNEW', 'KNIT', 'KNOT', 'KNOW', 'LACK', 'LADY', 'LAID', 'LAKE', 'LAMB', 'LAMP', 'LAND',
  'LANE', 'LAST', 'LATE', 'LEAD', 'LEAF', 'LEAN', 'LEAP', 'LEFT', 'LEND', 'LENS', 'LESS', 'LIFT', 'LIME',
  'LINE', 'LINK', 'LION', 'LIST', 'LIVE', 'LOAD', 'LOAF', 'LOAN', 'LOCK', 'LONG', 'LORD', 'LOSE', 'LOSS',
  'LOST', 'LOUD', 'LUNG', 'MADE', 'MAIL', 'MAIN', 'MAKE', 'MALE', 'MALL', 'MANY', 'MARK', 'MASK', 'MASS',
  'MAST', 'MATE', 'MAZE', 'MEAL', 'MEAN', 'MEAT', 'MELT', 'MEND', 'MENU', 'MESS', 'MILD', 'MILE', 'MILK',
  'MILL', 'MIND', 'MINT', 'MISS', 'MIST', 'MOOD', 'MOON', 'MORE', 'MOSS', 'MOST', 'MOVE', 'MUCH', 'NAME',
  'NAVY', 'NEAR', 'NEAT', 'NECK', 'NEED', 'NEST', 'NEWS', 'NEXT', 'NICE', 'NINE', 'NODE', 'NONE', 'NOON',
  'NOSE', 'NOTE', 'OATH', 'OBEY', 'ONCE', 'ONLY', 'ONTO', 'OPEN', 'ORAL', 'OVER', 'PACE', 'PACK', 'PAGE',
  'PAID', 'PAIN', 'PAIR', 'PALE', 'PALM', 'PARK', 'PART', 'PASS', 'PAST', 'PATH', 'PEAK', 'PEAR', 'PEEL',
  'PEER', 'PICK', 'PILE', 'PILL', 'PINE', 'PINK', 'PIPE', 'PLAN', 'PLAY', 'PLEA', 'PLOT', 'PLUG', 'POEM',
  'POET', 'POLE', 'POLL', 'POND', 'POOL', 'POOR', 'PORK', 'PORT', 'POSE', 'POST', 'POUR', 'PRAY', 'PULL',
  'PUMP', 'RACE', 'RAID', 'RAIL', 'RAIN', 'RANK', 'RARE', 'RATE', 'READ', 'REAL', 'REAR', 'REED', 'RELY',
  'RENT', 'REST', 'RICE', 'RICH', 'RIDE', 'RING', 'RIOT', 'RIPE', 'RISE', 'RISK', 'ROAD', 'ROAR', 'ROCK',
  'RODE', 'ROLL', 'ROOF', 'ROOM', 'ROOT', 'ROPE', 'RUSH', 'RUST', 'SAFE', 'SAID', 'SAIL', 'SALE', 'SALT',
  'SAME', 'SAND', 'SAVE', 'SCAN', 'SEAL', 'SEAT', 'SEED', 'SEEN', 'SELF', 'SELL', 'SEND', 'SENT', 'SHED',
  'SHIP', 'SHOE', 'SHOP', 'SHOT', 'SHOW', 'SHUT', 'SICK', 'SIDE', 'SIGN', 'SILK', 'SINK', 'SITE', 'SIZE',
  'SKIN', 'SLAP', 'SLIP', 'SLOW', 'SNAP', 'SNOW', 'SOAP', 'SOIL', 'SOLD', 'SOLE', 'SOME', 'SOON', 'SORE',
  'SORT', 'SPAN', 'SPIN', 'SPOT', 'STAR', 'STAY', 'STEM', 'STEP', 'STOP', 'SUCH', 'SUIT', 'SURE', 'SWIM',
  'TAKE', 'TALE', 'TALK', 'TALL', 'TANK', 'TAPE', 'TASK', 'TEAM', 'TEAR', 'TELL', 'TEND', 'TENT', 'TERM',
  'TEST', 'TEXT', 'THAN', 'THAT', 'THEM', 'THEN', 'THEY', 'THIN', 'THIS', 'TIDE', 'TIDY', 'TIED', 'TILL',
  'TINY', 'TIRE', 'TOLL', 'TONE', 'TOOK', 'TOOL', 'TORE', 'TORN', 'TOUR', 'TOWN', 'TRAP', 'TREE', 'TRIP',
  'TRUE', 'TUBE', 'TUNE', 'TURN', 'TWIN', 'TYPE', 'UNIT', 'UPON', 'URGE', 'USED', 'USER', 'VARY', 'VAST',
  'VEIL', 'VEIN', 'VENT', 'VERY', 'VEST', 'VIEW', 'VINE', 'VOID', 'VOTE', 'WADE', 'WAGE', 'WAIT', 'WAKE',
  'WALK', 'WALL', 'WANT', 'WARN', 'WASH', 'WAVE', 'WEAK', 'WEAR', 'WEED', 'WEEK', 'WELL', 'WENT', 'WERE',
  'WEST', 'WHAT', 'WHEN', 'WIDE', 'WIFE', 'WILD', 'WILL', 'WIND', 'WINE', 'WING', 'WINK', 'WIPE', 'WIRE',
  'WISE', 'WITH', 'WOLF', 'WOOD', 'WOOL', 'WORD', 'WORE', 'WORK', 'WORM', 'WORN', 'WRAP', 'YARD', 'YEAR',
  'YELL', 'ZERO', 'ZONE',
  // 5+ letters
  'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN', 'AGENT', 'AGREE',
  'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIKE', 'ALIVE', 'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMONG', 'ANGER',
  'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ARMED', 'ARROW', 'ASIDE', 'ASSET',
  'AUDIO', 'AUDIT', 'AVOID', 'AWAIT', 'AWAKE', 'AWARD', 'AWARE', 'BADLY', 'BAKER', 'BASES', 'BASIC', 'BASIS',
  'BEACH', 'BEGAN', 'BEGIN', 'BEGUN', 'BEING', 'BELOW', 'BENCH', 'BILLY', 'BIRTH', 'BLACK', 'BLAME', 'BLIND',
  'BLOCK', 'BLOOD', 'BOARD', 'BOAST', 'BOOST', 'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BREAD', 'BREAK', 'BREED',
  'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROWN', 'BUILD', 'BUILT', 'BUYER', 'CABLE', 'CALIF', 'CARRY', 'CATCH',
  'CAUSE', 'CHAIN', 'CHAIR', 'CHART', 'CHASE', 'CHEAP', 'CHECK', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CHOSE',
  'CIVIL', 'CLAIM', 'CLASS', 'CLEAN', 'CLEAR', 'CLICK', 'CLOCK', 'CLOSE', 'COACH', 'COAST', 'COULD', 'COUNT',
  'COURT', 'COVER', 'CRAFT', 'CRASH', 'CREAM', 'CRIME', 'CROSS', 'CROWD', 'CROWN', 'CRUDE', 'CURVE', 'CYCLE',
  'DAILY', 'DANCE', 'DATED', 'DEALT', 'DEATH', 'DEBUT', 'DELAY', 'DEPTH', 'DOING', 'DOUBT', 'DOZEN', 'DRAFT',
  'DRAMA', 'DRANK', 'DRAWN', 'DREAM', 'DRESS', 'DRILL', 'DRINK', 'DRIVE', 'DROVE', 'DYING', 'EAGER', 'EARLY',
  'EARTH', 'EIGHT', 'ELITE', 'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'ENTRY', 'EQUAL', 'ERROR', 'EVENT', 'EVERY',
  'EXACT', 'EXIST', 'EXTRA', 'FAITH', 'FALSE', 'FAULT', 'FIBER', 'FIELD', 'FIFTH', 'FIFTY', 'FIGHT', 'FINAL',
  'FIRST', 'FIXED', 'FLASH', 'FLEET', 'FLOOR', 'FLUID', 'FOCUS', 'FORCE', 'FORTH', 'FORTY', 'FORUM', 'FOUND',
  'FRAME', 'FRANK', 'FRAUD', 'FRESH', 'FRONT', 'FRUIT', 'FULLY', 'FUNNY', 'GIANT', 'GIVEN', 'GLASS', 'GLOBE',
  'GOING', 'GRACE', 'GRADE', 'GRAND', 'GRANT', 'GRASS', 'GREAT', 'GREEN', 'GROSS', 'GROUP', 'GROWN', 'GUARD',
  'GUESS', 'GUEST', 'GUIDE', 'HAPPY', 'HARRY', 'HARSH', 'HEAVY', 'HENCE', 'HENRY', 'HORSE', 'HOTEL', 'HOUSE',
  'HUMAN', 'IDEAL', 'IMAGE', 'INDEX', 'INNER', 'INPUT', 'ISSUE', 'JAPAN', 'JIMMY', 'JOINT', 'JONES', 'JUDGE',
  'KNOWN', 'LABEL', 'LARGE', 'LASER', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEASE', 'LEAST', 'LEAVE', 'LEGAL',
  'LEVEL', 'LEWIS', 'LIGHT', 'LIMIT', 'LINKS', 'LIVES', 'LOCAL', 'LOGIC', 'LOOSE', 'LOWER', 'LUCKY', 'LUNCH',
  'MAGIC', 'MAJOR', 'MAKER', 'MARCH', 'MATCH', 'MAYOR', 'MEANT', 'MEDIA', 'METAL', 'MIGHT', 'MINOR', 'MINUS',
  'MIXED', 'MODEL', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE', 'MUSIC', 'NEEDS',
  'NEVER', 'NEWLY', 'NIGHT', 'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE', 'OCCUR', 'OCEAN', 'OFFER', 'OFTEN',
  'ORDER', 'OTHER', 'OUGHT', 'PAINT', 'PANEL', 'PAPER', 'PARTY', 'PEACE', 'PETER', 'PHASE', 'PHONE', 'PHOTO',
  'PIECE', 'PILOT', 'PITCH', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'POINT', 'POUND', 'POWER', 'PRESS',
  'PRICE', 'PRIDE', 'PRIME', 'PRINT', 'PRIOR', 'PRIZE', 'PROOF', 'PROUD', 'PROVE', 'QUEEN', 'QUICK', 'QUIET',
  'QUITE', 'RADIO', 'RAISE', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'READY', 'REFER', 'RIGHT', 'RIVAL', 'RIVER',
  'ROBIN', 'ROGER', 'ROMAN', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RURAL', 'SCALE', 'SCENE', 'SCOPE', 'SCORE',
  'SENSE', 'SERVE', 'SEVEN', 'SHALL', 'SHAPE', 'SHARE', 'SHARP', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHIRT',
  'SHOCK', 'SHOOT', 'SHORT', 'SHOWN', 'SIGHT', 'SINCE', 'SIXTH', 'SIXTY', 'SIZED', 'SKILL', 'SLEEP', 'SLIDE',
  'SMALL', 'SMART', 'SMILE', 'SMITH', 'SMOKE', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE',
  'SPEAK', 'SPEED', 'SPEND', 'SPENT', 'SPLIT', 'SPOKE', 'SPORT', 'STAFF', 'STAGE', 'STAKE', 'STAND', 'START',
  'STATE', 'STEAM', 'STEEL', 'STICK', 'STILL', 'STOCK', 'STONE', 'STOOD', 'STORE', 'STORM', 'STORY', 'STRIP',
  'STUDY', 'STUFF', 'STYLE', 'SUGAR', 'SUITE', 'SUPER', 'SWEET', 'TABLE', 'TAKEN', 'TASTE', 'TAXES', 'TEACH',
  'TEETH', 'TERRY', 'TEXAS', 'THANK', 'THEFT', 'THEIR', 'THEME', 'THERE', 'THESE', 'THICK', 'THING', 'THINK',
  'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'TIGHT', 'TIMES', 'TIRED', 'TITLE', 'TODAY', 'TOPIC', 'TOTAL',
  'TOUCH', 'TOUGH', 'TOWER', 'TRACK', 'TRADE', 'TRAIN', 'TREAT', 'TREND', 'TRIAL', 'TRIED', 'TRIES', 'TRUCK',
  'TRULY', 'TRUST', 'TRUTH', 'TWICE', 'UNDER', 'UNDUE', 'UNION', 'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN',
  'USAGE', 'USUAL', 'VALID', 'VALUE', 'VIDEO', 'VIRUS', 'VISIT', 'VITAL', 'VOICE', 'WASTE', 'WATCH', 'WATER',
  'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WOMAN', 'WOMEN', 'WORLD', 'WORRY', 'WORSE',
  'WORST', 'WORTH', 'WOULD', 'WOUND', 'WRITE', 'WRONG', 'WROTE', 'YIELD', 'YOUNG', 'YOUTH',
  // Long Romantic words
  'BELOVED', 'DARLING', 'PASSION', 'ROMANCE', 'FOREVER', 'CHERISH', 'ETERNAL', 'TREASURE',
];

export const DICTIONARY_SET: Set<string> = new Set(
  CORE_DICTIONARY.map((w) => w.toUpperCase())
);

export function calculateWordScore(word: string): number {
  const len = word.length;
  if (len < 3) return 0;
  if (len === 3) return 1;
  if (len === 4) return 2;
  if (len === 5) return 3;
  if (len === 6) return 5;
  if (len === 7) return 8;
  return 11; // 8+ letters
}

export interface WordDuelState {
  board: string[][]; // 4x4
  foundWords: { [seat: number]: string[] }; // seat 0 and seat 1
  scores: [number, number];
  turnSeat: 0 | 1;
  winner: 0 | 1 | 'draw' | null;
  lastAction: string;
}

export function generateBoggleBoard(): string[][] {
  const shuffledDice = [...BOGGLE_DICE];
  for (let i = shuffledDice.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledDice[i], shuffledDice[j]] = [shuffledDice[j], shuffledDice[i]];
  }

  const board: string[][] = [];
  for (let r = 0; r < 4; r++) {
    const row: string[] = [];
    for (let c = 0; c < 4; c++) {
      const die = shuffledDice[r * 4 + c];
      const letter = die[Math.floor(Math.random() * die.length)];
      row.push(letter);
    }
    board.push(row);
  }
  return board;
}

export function isValidBogglePath(
  board: string[][],
  coords: [number, number][]
): { valid: boolean; word: string } {
  if (coords.length < 3) return { valid: false, word: '' };

  const visited = new Set<string>();
  let word = '';

  for (let i = 0; i < coords.length; i++) {
    const [r, c] = coords[i];
    if (r < 0 || r >= 4 || c < 0 || c >= 4) return { valid: false, word: '' };
    const key = `${r},${c}`;
    if (visited.has(key)) return { valid: false, word: '' };
    visited.add(key);

    if (i > 0) {
      const [prevR, prevC] = coords[i - 1];
      const dr = Math.abs(r - prevR);
      const dc = Math.abs(c - prevC);
      // Must be adjacent (horizontal, vertical, diagonal)
      if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) {
        return { valid: false, word: '' };
      }
    }

    word += board[r][c];
  }

  return { valid: true, word };
}

export function createInitialWordDuelState(): WordDuelState {
  return {
    board: generateBoggleBoard(),
    foundWords: { 0: [], 1: [] },
    scores: [0, 0],
    turnSeat: 0,
    winner: null,
    lastAction: 'Trace adjacent letters to discover words (3+ letters).',
  };
}

export function submitWordDuelWord(
  state: WordDuelState,
  wordRaw: string,
  seat: 0 | 1
): { nextState: WordDuelState; success: boolean; points: number; message: string } {
  const word = wordRaw.trim().toUpperCase();
  if (word.length < 3) {
    return { nextState: state, success: false, points: 0, message: 'Words must be at least 3 letters long.' };
  }

  const existingWords = state.foundWords[seat] ?? [];
  if (existingWords.includes(word)) {
    return { nextState: state, success: false, points: 0, message: `You already found "${word}"!` };
  }

  if (!DICTIONARY_SET.has(word)) {
    return { nextState: state, success: false, points: 0, message: `"${word}" is not in our dictionary.` };
  }

  const points = calculateWordScore(word);
  const nextFound = {
    ...state.foundWords,
    [seat]: [...existingWords, word],
  };
  const nextScores: [number, number] = [state.scores[0], state.scores[1]];
  nextScores[seat] += points;

  const actor = seat === 0 ? 'You' : 'Nkanyezi';
  const action = `${actor} found "${word}" (+${points} pts)!`;

  return {
    nextState: {
      ...state,
      foundWords: nextFound,
      scores: nextScores,
      lastAction: action,
    },
    success: true,
    points,
    message: action,
  };
}

// Find all valid words present on the 4x4 board using Depth First Search
export function findAllWordsOnBoard(board: string[][]): string[] {
  const found = new Set<string>();

  function dfs(
    r: number,
    c: number,
    currentWord: string,
    visited: Set<string>
  ) {
    if (currentWord.length >= 3 && DICTIONARY_SET.has(currentWord)) {
      found.add(currentWord);
    }
    if (currentWord.length >= 8) return; // Cap length for performance

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) {
          const key = `${nr},${nc}`;
          if (!visited.has(key)) {
            visited.add(key);
            dfs(nr, nc, currentWord + board[nr][nc], visited);
            visited.delete(key);
          }
        }
      }
    }
  }

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const visited = new Set<string>([`${r},${c}`]);
      dfs(r, c, board[r][c], visited);
    }
  }

  return Array.from(found);
}
