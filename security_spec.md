# Firestore Security Architecture Specification (`security_spec.md`)

## 1. Relationship Mapping & Master Source of Truth

- **`/rooms/{roomId}`** is the Master Source of Truth for an online multiplayer game session between the host (`hostUid`) and guest (`guestUid`).
  - No PII (`email`, `phone`, `address`) is stored in `/rooms/{roomId}`—only short display nicknames (`<= 40` chars) and bounded game state organized into three native Maps (`ttt`, `cards`, `celeb`) so every rule stays well below Firestore's 1,000-expression evaluation limit (`< 700` CEL expressions max).
  - Collection-wide `list` queries on `/rooms` are completely disabled (`allow list: if false;`) so rooms can never be scraped or enumerated. Access occurs strictly via exact capability `roomId` (`get`).
- **`/rooms/{roomId}/secrets/{roundId}`** is a child subcollection storing the hidden Celebrity Card for *Guess the Celebrity*.
  - **Master Gate (Pillar 1)**: Access derives synchronously from parent `/rooms/{roomId}` membership (`hostUid` or `guestUid`) and active non-closed room state.
  - **Asymmetric Confidentiality (Pillar 6 Isolation)**: While `parentRoom.celeb.outcome == 'guessing'`, `allow get` is strictly restricted to `resource.data.clueGiverUid == request.auth.uid`, mathematically preventing the guesser's client from reading the secret celebrity document until the round transitions to `'guessed'` or `'gave_up'`.
  - **Atomicity Guarantee (Pillar 7 `getAfter` with Bounded `let` Lookups)**: Initial room creation writes `/rooms/{roomId}` directly (`celeb.roundId: ''`, 0 document lookups). Creating `/rooms/{roomId}/secrets/{roundId}` runs on an existing room via an atomic batch updating `/rooms/{roomId}` (`celeb.roundId == roundId`, `celeb.clueGiverUid == request.auth.uid`), verified with `let`-bound `exists`, `existsAfter`, and `getAfter` helpers (3 AST lookups total, well within Firestore's 10-lookup batch cap).
- **`/rooms/{roomId}/letters/{letterId}`** is a child subcollection storing real-time synchronized letters and pocket notes shared exclusively between the room's two partners.
  - **Master Gate (Pillar 1)**: Both `get`, `list`, `create`, `update`, and `delete` check `canMemberAccessLetters()` which verifies `parentRoom.hostUid == uid || parentRoom.guestUid == uid` and `parentRoom.roomStatus != 'closed'`. Outside attackers cannot read, list, or write letters.
  - **Strict Schema & Immutability**: Letters require exact keys `['roomId', 'authorUid', 'authorName', 'authorRole', 'title', 'content', 'mood', 'createdAt', 'updatedAt']`. `roomId`, `authorUid`, `authorRole`, and `createdAt` are immutable. Only the author can update (`title`, `content`, `mood`, `updatedAt == request.time`) or delete their own letters.

## 2. Core Data Invariants & CEL Budget Guarantees

1. **Verified Auth Only**: Every read and write requires `request.auth != null && request.auth.token.email_verified == true`.
2. **Zero Forward Function References**: Every custom helper function in `firestore.rules` is declared strictly bottom-up before any caller invokes it.
3. **CEL Expression Cap Safety (`< 700 / 1,000`)**: `GameRoom` groups domain state into native Maps (`ttt`, `cards`, `celeb`) with `let`-cached bindings, keeping all allow statements under 700 CEL expressions.
4. **Path & Key Hardening**: `roomId` (`^[A-Z0-9]+$`, `4..16` chars), `roundId` (`^[a-zA-Z0-9_-]+$`, `1..64` chars), and `letterId` (`^[a-zA-Z0-9_-]+$`, `1..64` chars) are validated before any relational `get()` read, and `hasAll` + `hasOnly` enforce exact keys on top-level documents, letters, and nested Maps.
5. **Immutable Ownership & Timestamps**: `roomCode`, `hostUid`, `hostName`, and `createdAt` cannot be modified after creation. `createdAt` (on create) and `updatedAt` (on create & update) must equal `request.time`. Once `guestUid` joins (`guestUid != ''`), `guestUid` and `guestName` become immutable.
6. **Terminal State Lock**: Once `roomStatus == 'closed'`, all subsequent updates to the room and writes to `/secrets` or `/letters` are rejected.

## 3. The "Dirty Dozen" Adversarial Payloads (Must Return `PERMISSION_DENIED`)

1. **Unverified Email Spoof**: Authenticated user with `email_verified: false` attempting `create` on `/rooms/NKAN01` or `/rooms/NKAN01/letters`.
2. **Host Identity Spoofing**: Authenticated user `uid_attacker` creating `/rooms/NKAN01` with `hostUid: "uid_victim"`.
3. **Shadow Field Injection on Create**: Creating `/rooms/NKAN01` with all required fields plus `isAdmin: true` (or extra nested key inside `ttt`/`cards`/`celeb`/`letters`).
4. **ID Poisoning / Oversized Path ID**: Creating `/rooms/A_200_CHAR_JUNK_STRING...` or lowercase/symbol path `/rooms/bad$id`.
5. **Room Enumeration / Scraping**: Executing a collection `list` query against top-level `/rooms`.
6. **Unauthorized Third-Party Join Hijack**: Third user `uid_intruder` attempting to overwrite `guestUid` on a `'playing'` room where `guestUid` is already populated.
7. **Shadow Update / Host Takeover**: Valid `guestUid` attempting an `update` that mutates `hostUid` or `createdAt`.
8. **Value Poisoning on Update**: Valid `hostUid` updating `cards.lastAction` with a 500-character string instead of `string <= 120`.
9. **Terminal State Resurrection**: Valid `hostUid` attempting to update `ttt` or `roomStatus` after `roomStatus == 'closed'`.
10. **Forged Client Timestamp**: Valid `hostUid` sending `updatedAt` set to a past or future timestamp (`!= request.time`).
11. **Orphaned / Non-Atomic Secret Creation**: Creating `/rooms/NKAN01/secrets/round_99` without atomically updating `/rooms/NKAN01.celeb.roundId` to `'round_99'` in the same batch.
12. **Guesser Peeking at Secret Celebrity Card**: Authenticated `guestUid` (currently the guesser) attempting `get` on `/rooms/NKAN01/secrets/round_1` while `celeb.outcome == 'guessing'` and `clueGiverUid == hostUid`.
13. **Letter Eavesdropping by Outsider**: Non-member `uid_intruder` attempting `get`, `list`, or `create` on `/rooms/NKAN01/letters`.
14. **Letter Author Impersonation / Forgery**: Guest attempting to delete or overwrite host's letter in `/rooms/NKAN01/letters`.
