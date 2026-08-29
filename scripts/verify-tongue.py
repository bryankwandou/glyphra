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
]

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
        found = english_in(p.inner_text("body"))
        chk(f"{path} carries no English", len(found), 0)
        for f in found:
            print(f'            still English: "{f}"')
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

    body = p.inner_text("body")
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

    after = p.inner_text("body")
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
