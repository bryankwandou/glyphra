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

## Assessment papers

The practice range is the free half. The half a department cannot get elsewhere is at `/assess`,
behind the instructor sign-in.

Set a title, a cohort size and a difficulty band, and it produces one paper per student over the
same techniques at the same difficulty, plus a single marking key that covers the lot. Copying a
neighbour does not help; the marks stay comparable.

Two fairness properties, both asserted against a running build:

- **No technique repeats within a paper.** Four Caesar problems would be a worse test than four
  different ciphers.
- **Every paper carries an identical difficulty composition.** An early run gave one student XOR,
  XOR and quoted-printable while another got Polybius, affine and Playfair. Both satisfied
  "difficulty 2 to 3" and they are plainly not equivalent as a test. Each question slot now fixes
  its difficulty across all papers, so only the techniques vary.

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
- **Assessment has no gradebook.** It produces papers and a key; recording who scored what is still
  a spreadsheet. That is the next thing worth building, and it is the thing an institution would
  actually pay for.
- **Nothing here should protect anything that matters.** It is teaching material. The modern
  primitives are correct implementations, but a hand-rolled AES in application JavaScript has
  side-channel properties no reviewed library would accept.

## Licence

MIT.
