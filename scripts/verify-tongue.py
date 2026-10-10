"""
Read the rendered page in Indonesian and refuse any English left on it.

The dictionary check passed while the whole right-hand panel was still English.
It compared two dictionaries, so it could only see phrases somebody had already
thought to put in them; every string still typed directly into the JSX was
invisible to it. A screenshot showed the banner, the seed line, the marking
feedback and the answer-key panel all in English on a page set to Indonesian,
and the gate had called that a pass.

So this one does not read the source. It sets the language cookie, drives the
page the way a student does — new problem, wrong answer, right answer — and
looks at the text actually on screen.

  python scripts/verify-tongue.py http://localhost:3210
"""
import sys, time, re
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3210"

# Phrases that only ever appear in the English build. Each one was on screen in
# the report, so this list is evidence, not guesswork.
ENGLISH = [
    "Those filters could not all hold at once",
    "characters to recover",
    "your own message",
    "message from a language model",
    "message from the built-in bank",
    "withheld — recover it",
    "Not yet.",
    "You submitted",
    "Most positions line up",
    "Roughly half the positions",
    "Some positions line up",
    "Very little lines up",
    "Correct. That is the message.",
    "Anchor this on Solana devnet",
    "You are signed in as an instructor",
    "Open the solution",
    "Held back.",
    "Recorded on",
    "Analysis tools",
    "Index of coincidence",
    "All 25 shifts",
    "Letter counts",
    "Key length",
    "random (0.038)",
    "The letters are as lopsided",
    "The letters are flatter",
    "Too few letters for this",
    "Leave blank to use a drawn message",
    "Subject, if you want one",
    "Blank for random",
    "Spacing, punctuation and case are ignored",
    "Practice range",
    "Assessment papers",
    "One problem set that circulates",
    "Every problem is built when you ask",
    "Every letter moves a fixed number of places",
    "Number the alphabet",
    "Strip everything that is not a letter",
    "Rotate the alphabet left by",
    "Classical ciphertext is transmitted",
    "The catalogue",
    "Monoalphabetic substitution",
    "Hashing and integrity",
    "Modern symmetric",
    "One-way — no decryption exists",
    "Practise this",
    "Paper setup",
    "Build the papers",
    "Number of papers",
    "Master seed",
    "Marking key",
    "Shift (1-25)",
    "Introductory",
    "Research-grade",
]

# A blocklist can only refuse a sentence someone already reported. This refuses
# English structurally: these words carry no meaning in an Indonesian sentence,
# so one of them on a page set to Indonesian means untranslated text, whatever
# the sentence turns out to be. Deliberately function words only — a proper
# name in quotes ("The Adventure of the Dancing Men") must not trip it.
GIVEAWAYS = [
    "which", "that", "each", "with", "from", "into", "would", "because",
    "through", "these", "those", "their", "there", "when", "while", "after",
    "before", "every", "another", "cannot", "should", "must", "does", "were",
    "been", "using", "rather", "than", "same", "then",
]
GIVEAWAY_RE = re.compile(r"\b(" + "|".join(GIVEAWAYS) + r")\b", re.I)


def english_sentences(text):
    """Lines carrying English function words, with the word that gave them away."""
    out = []
    for line in text.split("\n"):
        line = line.strip()
        if len(line) < 12:
            continue
        hit = GIVEAWAY_RE.search(line)
        if hit:
            out.append((hit.group(0), line[:96]))
    return out

import io, os


def admin_credentials():
    """From the environment, or .env.local — which is written with a BOM."""
    user = os.environ.get("GLYPHRA_ADMIN_USER")
    pw = os.environ.get("GLYPHRA_ADMIN_PASSWORD")
    if user and pw:
        return user, pw
    try:
        raw = io.open(".env.local", encoding="utf-8-sig").read()
    except OSError:
        return None, None
    found = {}
    for line in raw.splitlines():
        line = line.strip().lstrip("\ufeff")
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            found[k.strip().lstrip("\ufeff")] = v.strip().strip('"').strip("'")
    return found.get("GLYPHRA_ADMIN_USER"), found.get("GLYPHRA_ADMIN_PASSWORD")


passed, failures = 0, []


def chk(label, got, want):
    global passed
    if str(got) == str(want):
        print(f"    ok    {label:<54}{got}")
        passed += 1
    else:
        print(f"    FAIL  {label:<54}got {got}, want {want}")
        failures.append(label)


def english_in(text):
    return [p for p in ENGLISH if p in text]


def visible_text(page):
    """Everything a reader sees, including the grey text inside empty fields.

    inner_text does not read placeholder attributes, so four hardcoded English
    placeholders sat on the practice page while this gate reported it clean.
    """
    holders = page.eval_on_selector_all(
        "[placeholder]", "els => els.map(e => e.getAttribute('placeholder'))")
    return page.inner_text("body") + "\n" + "\n".join(h for h in holders if h)


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(locale="id-ID")
    ctx.set_default_timeout(180_000)
    ctx.add_cookies([{"name": "glyphra_lang", "value": "id",
                      "url": BASE}])

    # ---------------------------------------------- 1. the pages as they load
    print("\n  1. every page, set to Indonesian\n")

    for path in ["/", "/practice", "/tutorial", "/catalogue", "/encode", "/join"]:
        p = ctx.new_page()
        p.goto(f"{BASE}{path}", wait_until="networkidle")
        p.wait_for_timeout(1200)
        text = visible_text(p)
        found = english_in(text)
        chk(f"{path} carries no listed English", len(found), 0)
        for f in found:
            print(f'            still English: "{f}"')

        loose = english_sentences(text)
        chk(f"{path} carries no English sentence", len(loose), 0)
        for word, line in loose[:6]:
            print(f'            "{word}" in: {line}')
        p.close()

    # -------------------------------- 2. the practice panel, actually driven
    print("\n  2. a problem worked through, in Indonesian\n")

    p = ctx.new_page()
    p.goto(f"{BASE}/practice", wait_until="networkidle")
    p.wait_for_timeout(1500)

    # Beginner mode is what the first-problem calibration applies to, so turn it
    # on the way a student would rather than assuming the default.
    beg = p.get_by_role("checkbox", name=re.compile("pemula|Beginner", re.I)).first
    if beg.count() and not beg.is_checked():
        beg.check()
        p.wait_for_timeout(500)

    p.get_by_role("button", name=re.compile("Buatkan|Soal baru|New problem|Generate", re.I)).first.click()
    p.wait_for_timeout(6000)

    body = visible_text(p)
    found = english_in(body)
    chk("the problem itself carries no English", len(found), 0)
    for f in found:
        print(f'            still English: "{f}"')

    # the beginner problem should be one word, not a sentence
    m = re.search(r"(\d+)\s+(karakter|characters)", body)
    if m:
        n = int(m.group(1))
        chk("a first problem is one word, not a sentence", n <= 10, True)
        print(f"            {n} characters to recover")
        chk("  and the count is stated in Indonesian", m.group(2), "karakter")

    # a wrong answer, so the marking feedback renders
    p.locator("#answer").fill("zzzz")
    p.wait_for_timeout(300)
    p.get_by_role("button", name=re.compile("Periksa jawaban|Check the answer", re.I)).first.click()
    p.wait_for_timeout(3000)

    after = visible_text(p)
    found = english_in(after)
    chk("the marking feedback carries no English", len(found), 0)
    for f in found:
        print(f'            still English: "{f}"')

    # the mechanism panel a stuck student opens
    how = p.get_by_role("button", name=re.compile("Cara kerja|Sembunyikan caranya|How this", re.I)).first
    if how.count():
        how.click()
        p.wait_for_timeout(1500)
        theory = p.inner_text("body")
        eng = [x for x in ["Every letter moves", "Number the alphabet", "The alphabet is reversed",
                           "letters are not changed", "is written as its position"] if x in theory]
        chk("the mechanism explanation is Indonesian too", len(eng), 0)
        for e in eng:
            print(f'            still English: "{e}"')

    got_id = bool(re.search(r"Belum\.|Anda mengirim", after))
    chk("  and it is actually Indonesian", got_id, True)
    if not got_id:
        seg = after[after.find("PESAN ASLI"):][:300] if "PESAN ASLI" in after else after[-300:]
        print("            what the page says: " + repr(seg))

    # ------------------------------------- 3. the tools for finding a key
    print("\n  3. the analysis workbench\n")

    # A beginner problem is one word, and the panel correctly refuses to draw
    # conclusions from four letters — so turn beginner mode off and ask for a
    # real one before looking for it.
    beg2 = p.get_by_role("checkbox", name=re.compile("pemula|Beginner", re.I)).first
    if beg2.count() and beg2.is_checked():
        beg2.uncheck()
        p.wait_for_timeout(400)
    # A drawn message can be short, and the panel correctly refuses to draw
    # conclusions from a handful of letters. Supply a long one so the tools are
    # actually exercised rather than tested on whatever the draw happened to give.
    p.locator("#owntext").fill(
        "The letters of a language do not appear with equal frequency and that "
        "single fact has undone more ciphers than every clever attack combined")
    p.wait_for_timeout(400)
    cipher = p.locator(".cipher-text").first
    before = cipher.inner_text() if cipher.count() else ""
    p.get_by_role("button", name=re.compile("Soal baru|Buatkan|New problem", re.I)).first.click()
    # Wait for the ciphertext itself to change. Waiting for "karakter" returned
    # at once, because the five-letter problem from section 2 already said it —
    # and the panel, correctly, hides itself on five letters, so the gate
    # reported the panel missing while it was looking at the old problem.
    try:
        p.wait_for_function(
            "(b) => { const e = document.querySelector('.cipher-text');"
            " return !!e && e.textContent.trim() !== '' && e.textContent !== b; }",
            arg=before, timeout=90_000)
        arrived = True
    except Exception:
        arrived = False
    chk("the longer problem actually arrived", arrived, True)
    p.wait_for_timeout(800)

    panel = p.get_by_role("button", name=re.compile("^(Buka|Open)$", re.I)).first
    if not arrived:
        print("            the panel checks are skipped: they would read the old,"
              " five-letter problem, where the panel is rightly hidden")
    else:
        chk("the analysis panel is on the page", panel.count() > 0, True)

    if arrived and panel.count():
        panel.click()
        p.wait_for_timeout(1200)
        after2 = visible_text(p)

        chk("  it opens", bool(re.search("Indeks koinsidensi", after2, re.I)), True)
        found2 = english_in(after2)
        chk("  and carries no English", len(found2), 0)
        for f in found2:
            print(f'            still English: "{f}"')

        # every tool renders, not just the first
        for name, marker in [("Semua 25 geseran", "geseran"),
                             ("Panjang kunci", "panjang|Tidak ada blok")]:
            tab = p.get_by_role("tab", name=re.compile(name, re.I)).first
            if tab.count():
                tab.click()
                p.wait_for_timeout(800)
                body3 = visible_text(p)
                chk(f'  "{name}" renders', bool(re.search(marker, body3, re.I)), True)
                eng3 = english_in(body3)
                chk(f"    and stays Indonesian", len(eng3), 0)
                for e in eng3:
                    print(f'            still English: "{e}"')

    p.close()

    # ------------------------------- 4. the pages behind an instructor sign-in
    #
    # /assess and /instructor were never visited by this gate, because reaching
    # them needs a session. That is exactly why the assessment builder kept its
    # own third copy of the family labels, in English, for so long: no gate
    # could get to the page to see them.
    print("\n  4. the instructor's own pages\n")

    user, pw = admin_credentials()
    if not user:
        print("    skip  no GLYPHRA_ADMIN_USER configured; sign-in pages unchecked")
    else:
        p = ctx.new_page()
        p.goto(BASE + "/instructor", wait_until="networkidle")
        # An idle network is not a live page. React has to hydrate before the
        # submit button does anything, and this gate used to fill the form and
        # click straight after networkidle — the click landed on nothing, the
        # session was never created, and the two pages below were then read in
        # their signed-out state and passed. A gate that checks the sign-in
        # screen while reporting on the instructor's page is the same failure
        # this whole file was written to stop, committed by the file itself.
        p.wait_for_selector("#u", state="visible")
        p.wait_for_timeout(1500)
        p.locator("#u").fill(user)
        p.locator("#p").fill(pw)
        p.get_by_role("button", name=re.compile(r"^\s*(Masuk|Sign in)\s*$", re.I)).first.click()
        p.wait_for_timeout(4000)

        # Prove the session exists before trusting a single check that needs it.
        p.goto(BASE + "/instructor", wait_until="networkidle")
        p.wait_for_timeout(1500)
        signed_in = "Tampilan pengajar" in visible_text(p) or "Instructor view" in visible_text(p)
        chk("the sign-in actually took", signed_in, True)
        if not signed_in:
            print("            the two checks below would read the sign-in screen; skipping")

        for path in ([] if not signed_in else ["/instructor", "/assess"]):
            p.goto(BASE + path, wait_until="networkidle")
            p.wait_for_timeout(1500)
            text = visible_text(p)
            found = english_in(text)
            chk(path + " carries no listed English", len(found), 0)
            for f in found:
                print('            still English: "' + f + '"')
            loose = english_sentences(text)
            chk(path + " carries no English sentence", len(loose), 0)
            for word, line in loose[:6]:
                print('            "' + word + '" in: ' + line)
        p.close()

    ctx.close()
    browser.close()

print(f"\n  {passed} passed, {len(failures)} failed")
if failures:
    print("\n  still English:")
    for f in failures:
        print(f"    {f}")
    print("")
    sys.exit(1)
print("\n  The page speaks one language all the way down.\n")
