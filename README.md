# Glyphra

A practice range for cryptography. Press one button and a fresh problem appears, drawn from 101
techniques that run from a Caesar shift through Enigma to AES-128 and ChaCha20. Answer keys and
complete worked solutions stay behind an instructor sign-in, so a class can practise without anyone
reading ahead.

Built for students who need repetition, and for the person marking their work who does not want to
hand-write another twenty exercises.

---

## Why this exists

Cryptography is taught with a handful of worked examples and then a problem set that gets passed
between cohorts. Once the answers circulate, the problem set stops teaching anything.

Glyphra generates problems on demand, so there is no fixed set to circulate. Every exercise is built
when it is requested and marked on the server.

## The part that matters most

A cipher implementation that is subtly wrong still produces output that looks exactly like
ciphertext. A student cannot tell. They will be marked wrong, conclude they misunderstood the
method, and lose confidence in something they actually understood.

So no technique is allowed to appear in a problem until it has been checked against its own inverse:

```
npm run verify
```

This runs every reversible technique through twelve random key and message pairs and asserts that
decoding returns exactly what was encoded. It also checks the one-way functions are deterministic
and avalanche on a single-character change.

It runs before every build. A failure stops the build.

Four gates run on every build and all of them are hermetic. The two that touch a network — the
database rules and the three-entrance check — are run by hand, because a build should not fail
because a network hop did.

The first time it ran it rejected six techniques:

| Technique | Defect |
|---|---|
| Pigpen | Duplicate glyphs in the symbol table, so distinct letters collided |
| Trifid | Decode stripped the cube's filler symbol as non-alphabetic |
| RSA | One parameter set had `gcd(e, φ(n)) = 7`, so no private exponent existed |
| Dancing Men | Astral-plane glyphs indexed by UTF-16 code unit, landing mid-surrogate |
| Nihilist transposition | Padded to a square without declaring the padding in `normalise` |
| Case steganography | No terminator, so it decoded trailing cover text as endless `A` |

All six are fixed. Current state: **94 of 94 reversible techniques round-trip exactly**, across 1,128
round trips per run.

## Two languages, and a tutorial

The interface runs in English and Indonesian. The choice is a cookie, not a URL prefix, so every
route keeps working unchanged and server components render already-translated markup — nothing
flashes in English and then corrects itself.

The Indonesian was written by hand alongside the English rather than passed through a translator.
Several lines say the same thing differently, because the literal rendering reads like a machine
wrote it, and this is a tool someone stands in front of a class with.

**Deliberately not translated:** the 101 catalogue entries. Each carries a mechanism description
precise enough to work through by hand, and a half-accurate translation of those would teach the
wrong method. They stay in English until someone who knows the material writes them properly.

`/tutorial` is the beginner path, and it is bilingual in full. It covers:

- **The distinction that causes most beginner mistakes** — cipher, encoding and hash answer three
  different questions. This is not academic: ROT5 and quoted-printable were quietly handing students
  the plaintext verbatim, because both leave ordinary letters untouched.
- **All ten families**, each with what actually defines it, how to recognise it from the ciphertext
  alone, a worked example, how it breaks, and when a teacher would set it.
- **A teaching order that follows the history**, seven steps, each motivated by the failure of the
  one before it.
- **How to run each surface** — practice, shared quiz, assessment papers — with the caveats attached
  rather than buried.

Every example on that page came out of the engine from the same message and was confirmed to decode
back to it before it was written down.

## Accounts, access rules, and a gradebook

Three things were refused here for a long time on the grounds that they need server state, and that
was true: a quiz that closes once somebody solves it, a quiz only its author may attempt, and any
record of who scored what. A Postgres database (Neon) now backs them.

**What the database does not hold: the quizzes.** A join code still carries its own quiz in forty
bits, so a code with no row is a perfectly valid open quiz. Every link handed out before any of this
existed keeps working untouched, and losing the database would cost the results and the access rules
but not one question.

| Mode | Who may attempt it | Closes |
|---|---|---|
| Open | Anyone with the code | Never — this is also how an unclaimed code behaves |
| Close on a full score | Anyone with the code | The moment somebody answers everything correctly |
| Only me | The signed-in owner alone | When the owner says so |

Claiming a code is optional. Signing in adds control on top of a code that already works; it takes
nothing away from one left unclaimed.

Rules are enforced on the server, at both the door and the marking endpoint. Checking only when the
quiz opens would leave them enforced by the interface, and anybody willing to post to the endpoint
directly would walk straight past.

```
npm run migrate       # apply the schema; every statement is IF NOT EXISTS
npm run verify:db     # 21 access rules, against a real database
npm run verify:doors  # all three entrances, against a running site
```

`verify:doors` exists because the rules were once enforced at two entrances out of three. The fetch
endpoint and the marking endpoint both checked the policy, so restriction looked complete — but the
`/q/[code]` page rendered every question server-side without asking, which meant a host-only quiz
refused strangers at the API while handing them the whole thing through the page people actually
click. The check does not trust status codes for that page: a page can return 200 and still leak, so
it greps the body for a ciphertext block and asserts the questions are absent.

Standings are shown to participants once an attempt is submitted, and are narrower than the owner's
gradebook on purpose: rank, name, score. No timestamps, no attempt counts. Seeing where you placed
is motivating; publishing somebody's five failed attempts to the rest of a class is not, and both
live in the same table. One row per person at their best score, so retrying cannot fill the board.

That check found a real defect on its first run. `closeOnPerfect` closed whatever it was pointed at
and left "was this actually a full score?" to the caller — so the rule lived at one call site rather
than in the rule. A 50 per cent attempt closed the quiz. The database now confirms a full-marks
attempt is on record before it will close anything.

Password hashing is scrypt from the standard library, salted per account. bcrypt or argon2 would be
the better-studied choice and either is a reasonable upgrade; scrypt is here because it needs no
native module on a serverless runtime.

## Shared quizzes

For practice with a group rather than assessment. Set the length, difficulty band and time limit at
`/assess`, and you get an eight-character join code and a link. Participants open `/join`, type the
code, and start — no account, and nothing is recorded about who took it.

Every quiz platform hands out a code and resolves it against a database row. There is no database
here, so **the code carries the quiz**: seed, question count, difficulty band and time limit packed
into forty bits and rendered as eight characters. Two people typing the same code independently
rebuild the identical quiz, because the generator is deterministic.

| The trade | |
|---|---|
| Buys | A link that cannot expire, nothing to back up, no record of who took it |
| Costs | A code cannot be withdrawn once shared, and editing means issuing a new one |

Both halves are stated in the interface rather than only here. When marks have to count, use the
assessment papers below instead.

The participant side follows what the established platforms settled on: a progress bar and question
map, a wall-clock timer, flag-to-revisit, a review step before submitting, and per-question feedback
that reveals the message only afterwards. Answers are held in local storage against the code, so a
tab closed by accident does not cost the attempt.

Marking happens once, over the whole submission — never question by question, which would let
someone probe a single answer repeatedly and walk their way to it.

```
npm run verify:quiz
```

That check caught the codec being wrong on its first write: it emitted its base-32 digits reversed,
so every code decoded to a *plausible* quiz that was not the one shared. Nothing raised an error;
participants would simply have answered different questions than the person who sent the link.
Codes now round-trip 4000/4000 and reject 97.7 per cent of single-character typos. Questions and
answers are built in one pass, because two loops running side by side would eventually drift and
mark everyone against the wrong questions while reporting nothing at all.

## Assessment papers

The practice range is the free half. The half a department cannot get elsewhere is at `/assess`,
behind the instructor sign-in.

Set a title, a cohort size and a difficulty band, and it produces one paper per student over the
same techniques at the same difficulty, plus a single marking key that covers the lot. Copying a
neighbour does not help; the marks stay comparable.

Nine invariants run on every build, over five different cohort shapes:

```
npm run verify:assessment
```

| Property | Why it matters |
|---|---|
| Every paper fully populated | A short paper under-tests one student while the rest sit the full set |
| No technique repeats within a paper | Four Caesar problems is a worse test than four different ciphers |
| Identical difficulty composition across papers | Otherwise two students are marked on the same scale for different work |
| All papers distinct | The entire point is that copying a neighbour does not help |
| The same seed reproduces the same set | This is what replaces a database |
| A different seed produces a different set | Reproducibility is worthless if every cohort gets the same papers |
| Every question carries a key and worked solution | A paper without one is the hand-marking problem this replaces |
| Ciphertext never equals the plaintext | A degenerate technique hands over the answer |
| Paper codes unique within a set | The code is how a sheet is identified when handed back |

That check failed on its first run too, and both failures were real:

- **Two techniques handed the student the answer.** ROT5 rotates digits and leaves letters alone,
  and every exercise message here is letters — so its "ciphertext" was the plaintext verbatim.
  Quoted-printable only escapes characters outside printable ASCII, so English passes through
  untouched. Both remain in the catalogue, because a student should learn that an encoding is not a
  cipher. Neither can be drawn as a problem now, and every generated problem is checked for the same
  failure regardless, since block rotation is degenerate only for certain block sizes.
- **With no difficulty band requested, every paper drew its own profile.** Six papers came out with
  six different compositions — one student sat 1,5,4,4 and another 2,2,1,4, marked on the same
  scale. "No preference" means the instructor did not mind which difficulties appear, not that
  students should face different ones. An unconstrained run now builds a ramp from the seed and
  applies it to every paper.

The cipher harness had already flagged quoted-printable as a warning, and it was left as a warning.
That was the mistake: a warning nobody acts on is the same as no check at all.

Nothing is stored. A paper is a pure function of the master seed and the paper number, so a sheet
lost in March can be rebuilt in August from the seed printed on it. No database to back up, no
export to misplace.

Print is a first-class output rather than an afterthought: one sheet per page, no interface
furniture, ciphertext forced to black on white so a tired departmental printer does not render it as
unreadable grey.

## Promotional film

A Remotion project lives in `video/`. Every ciphertext on screen came out of the engine and was
confirmed to round-trip before it was used — an early draft of the pitch deck contained a Vigenère
output typed from memory, and it was wrong.

```bash
npx remotion studio video/src/index.ts        # preview
npx remotion render video/src/index.ts Promo out/glyphra-promo.mp4
```

Two compositions: `Promo` at 1920x1080 and `PromoSquare` at 1080x1080, sharing one timeline.

## Catalogue

| Family | Count |
|---|---|
| Encoding and representation | 21 |
| Monoalphabetic substitution | 17 |
| Polyalphabetic substitution | 15 |
| Transposition | 13 |
| Modern symmetric | 9 |
| Hashing and integrity | 7 |
| Fractionation | 6 |
| Polygraphic substitution | 5 |
| Asymmetric and number theory | 4 |
| Steganography | 4 |

Every entry carries its mechanism in enough detail to reproduce by hand, its historical period, and
an honest account of how it was broken. A cipher taught without its break is only half taught.

## How answers are kept back

The solution travels with the problem, sealed with AES-256-GCM under a server-held key. The
browser holds an opaque blob it cannot open.

- `POST /api/challenge` — builds a problem, returns it with the sealed answer
- `POST /api/verify` — unseals server-side, marks the attempt, returns correct/incorrect and a
  coarse proximity figure. Never returns the expected text, so it cannot be used as an oracle
- `POST /api/solution` — the only route that returns a solution. Gated on a verified session
- `POST /api/credential` — re-marks the answer, then anchors an attestation on Solana devnet
- `POST /api/assessment` — builds a full set of papers with their keys. Instructor-gated in full
- `GET /api/quiz?code=` — rebuilds a shared quiz from its code. Open to anyone holding the code,
  which is the point of a share link; only the questions cross the wire
- `POST /api/quiz/grade` — marks a whole attempt at once and returns the messages afterwards

The GCM authentication tag also means a student cannot edit a sealed answer and resubmit it.

## Where the language model sits

Optionally, a language model writes the *message* to be enciphered. It never touches the
cryptography — that stays with the verified engine.

This is deliberate. Asking a model to produce ciphertext directly would be the obvious way to build
this and the wrong one, because nothing would guarantee the output is correct, and a student would
have no way to find out. Set `GROQ_API_KEY` to enable it; without the key the feature degrades to
the built-in message bank rather than breaking.

## Credentials on Solana devnet

Solving a problem can be recorded on Solana devnet as a public, timestamped memo. The record
carries the technique, the difficulty, a problem reference, and a hash — no name, no answer.

A public ledger is permanent and cannot be redacted, so putting a student's identity on it would
create a record that outlives any reason to keep it. The hash lets anyone holding the original
problem confirm the record refers to it, and lets nobody else work backwards.

What it establishes: a correct solution was submitted for a problem of this technique, no later
than the block timestamp, signed by the issuer, unaltered since.

What it does not establish: that the holder worked unaided, any general competence, or anything
about who they are.

A credential issued by the live deployment, confirmed by an independent RPC call rather than by this
application's own response:

| | |
|---|---|
| Network | Solana devnet, slot 484982927 |
| Program | `spl-memo` |
| Memo | `{"p":"glyphra","v":1,"t":"atbash","d":1,...}` |
| Signature | `Q1g1d3xDnpfWhQa7qzgzuFvi4rWzq3grnwbPNuuugoEo1sfz5YjAVtQWPLSoCNGsknDtZcw8HMjquQyVBPWVg1Y` |

## Running it

```bash
npm install
cp .env.example .env.local     # then fill it in
npm run verify                 # confirm the catalogue is sound
npm run dev
```

### Environment

| Variable | Required | Purpose |
|---|---|---|
| `GLYPHRA_SECRET` | Yes in production | Seals answers and signs sessions. Any long random string |
| `GLYPHRA_ADMIN_USER` | No | Instructor username. Defaults to the account in the brief |
| `GLYPHRA_ADMIN_PASSWORD` | No | Instructor password |
| `GROQ_API_KEY` | No | Enables model-written messages |
| `SOLANA_ISSUER_SECRET` | No | Base58 64-byte secret key, or 32-byte hex seed. Enables credentials |
| `SOLANA_RPC_URL` | No | Defaults to the public devnet endpoint |
| `DATABASE_URL` | No | Postgres. Enables accounts, access rules and the gradebook |

Language is a per-visitor cookie (`glyphra_lang`), so no configuration is involved.

Without `GLYPHRA_SECRET` the app falls back to a build-time constant and logs a warning in
production. Sealed answers are then readable by anyone with the source. Set it.

Check the issuer key resolves and holds devnet SOL:

```bash
npm run check-solana
```

## Honest limits

- **The instructor credential is one shared account.** Against a student poking at the running
  application, it works. Against anyone reading this repository, it is not a security boundary.
  Set the environment variables to change it.
- **Login throttling is in-memory**, so it resets when a serverless instance recycles. It is a speed
  bump, not a limiter. A durable store is needed before this guards anything of consequence.
- **Enigma has no plugboard.** That was the largest contributor to the real machine's key space, so
  this model is markedly weaker than the wartime original. Stated in the catalogue entry too.
- **Textbook RSA uses tiny primes** and no padding. It is there to be worked by hand, and it is
  exactly what you must never ship.
- **Devnet is periodically reset.** Credentials demonstrate the mechanism; they are not a permanent
  transcript.
- **A shared quiz cannot be revoked.** The code is the quiz, so there is no row to delete. Anyone
  who has the code keeps working access to it forever.
- **Without `DATABASE_URL` there are no accounts, no restricted modes and no gradebook.**
  Everything else — practice, the workbench, assessment papers, open quizzes — is a pure
  function of a seed and works with no storage at all. A missing database degrades the
  product rather than breaking it.
- **An unclaimed quiz code still cannot be revoked**, and its results are still not
  collected. That is the trade for a link that never expires. Claim the code if the marks
  have to count.
- **Quiz results are not collected.** Participants see their own marks; the instructor does not get
  a roster. That is a deliberate consequence of storing nothing, and it is the main reason the
  assessment papers exist alongside this.
- **Assessment has no gradebook.** It produces papers and a key; recording who scored what is still
  a spreadsheet. That is the next thing worth building, and it is the thing an institution would
  actually pay for.
- **Nothing here should protect anything that matters.** It is teaching material. The modern
  primitives are correct implementations, but a hand-rolled AES in application JavaScript has
  side-channel properties no reviewed library would accept.

## Licence

MIT.
