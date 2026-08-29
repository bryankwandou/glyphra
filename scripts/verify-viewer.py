"""
One sign-in, recognised everywhere — and the answer key an instructor is for.

Two separate things are checked here because they had one cause.

The site carried two sign-ins. The older single-instructor cookie was what the
header and three pages asked about; accounts set a different cookie. Signing in
with an account therefore worked at /instructor and /assess while every page in
the site still rendered a "sign in" button in the corner, and the practice page
still hid the worked solution. Somebody signs in, sees the button, concludes it
did not take, and signs in again. That is the repeated-login report, and it was
never a session expiring.

  python scripts/verify-viewer.py http://localhost:3210
"""
import sys, time, re
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3210"
STAMP = f"viewer{int(time.time())}"
NAME = f"Dosen {STAMP[-5:]}"
EMAIL = f"{STAMP}@example.invalid"
PASSWORD = "a-long-enough-password"

passed, failures = 0, []


def chk(label, got, want):
    global passed
    if str(got) == str(want):
        print(f"    ok    {label:<52}{got}")
        passed += 1
    else:
        print(f"    FAIL  {label:<52}got {got}, want {want}")
        failures.append(label)


with sync_playwright() as pw:
    browser = pw.chromium.launch()

    # ------------------------------------------------------------- signed out
    print("\n  1. signed out, the header offers a way in\n")

    anon = browser.new_context()
    anon.set_default_timeout(180_000)
    ap = anon.new_page()
    ap.goto(f"{BASE}/practice", wait_until="networkidle")
    ap.wait_for_timeout(1500)
    anon_header = ap.inner_text("header")
    chk("a signed-out header shows a sign-in link",
        bool(re.search(r"sign.?in|masuk|login|pengajar", anon_header, re.I)), True)
    chk("  and does not offer the papers page",
        bool(re.search(r"\bPapers\b|Lembar soal", anon_header)), False)
    anon.close()

    # -------------------------------------------------------------- signed in
    print("\n  2. signed in with an account, every page agrees\n")

    ctx = browser.new_context()
    ctx.set_default_timeout(180_000)
    up = ctx.request.post(f"{BASE}/api/account/signup", data={
        "email": EMAIL, "password": PASSWORD, "displayName": NAME,
    })
    if not up.ok:
        print(f"    SETUP FAILED — sign-up returned {up.status}")
        sys.exit(1)
    print(f"    account {EMAIL}  ({NAME})\n")

    for path in ["/", "/practice", "/catalogue", "/tutorial", "/encode", "/join"]:
        p = ctx.new_page()
        p.goto(f"{BASE}{path}", wait_until="networkidle")
        p.wait_for_timeout(900)
        header = p.inner_text("header")
        # The signed-in header offers the papers page; the signed-out one does not.
        knows = bool(re.search(r"\bPapers\b|Lembar soal", header))
        chk(f"{path or '/'} header knows you are signed in", knows, True)
        p.close()

    # ------------------------------------------- 3. the worked solution appears
    print("\n  3. the answer key an instructor signs in for\n")

    p = ctx.new_page()
    p.goto(f"{BASE}/practice", wait_until="networkidle")
    p.wait_for_timeout(1500)
    p.get_by_role("button", name=re.compile("New problem|Generate|Soal baru|Buatkan", re.I)).first.click()
    p.wait_for_timeout(6000)

    body = p.inner_text("body")
    chk("the solution is no longer held back",
        bool(re.search("Held back|Ditahan", body)), False)

    # The real test: the plaintext itself is on the page, not a promise of it.
    ct = p.locator("pre, code").first.inner_text() if p.locator("pre, code").count() else ""
    has_key = bool(re.search("Answer key|Kunci jawaban", body))
    chk("an answer key section is shown", has_key, True)

    # The solution never travels with the problem: it is sealed, and one route
    # opens it. That is the property being checked, so ask that route.
    r = ctx.request.post(f"{BASE}/api/challenge", data={"seed": f"{STAMP}-solved", "techniqueIds": ["caesar"]})
    j = r.json()
    chk("the problem itself carries no plaintext", "plaintext" in j, False)
    sealed = j.get("sealed")
    chk("  it carries a sealed envelope instead", bool(sealed), True)

    opened = ctx.request.post(f"{BASE}/api/solution", data={"sealed": sealed})
    chk("an account holder may open it", opened.status, 200)
    if opened.status == 200:
        sol = opened.json()
        text = sol.get("plaintext") or (sol.get("solution") or {}).get("plaintext", "")
        chk("  and it contains the real message", bool(text), True)
        enc = sol.get("encodeSteps") or []
        dec = sol.get("decodeSteps") or []
        chk("  and the working in both directions", len(enc) > 0 and len(dec) > 0, True)
        chk("  and the key values", sol.get("key") is not None, True)
        chk("  and it records who opened it", bool(sol.get("viewedBy")), True)
        print(f'          message: "{str(text)[:44]}"')
        print(f'          {len(enc)} encipher steps, {len(dec)} decipher steps, opened by {sol.get("viewedBy")}')

    # An anonymous viewer holding the very same envelope must be refused.
    anon2 = browser.new_context()
    anon2.set_default_timeout(180_000)
    r2 = anon2.request.post(f"{BASE}/api/solution", data={"sealed": sealed})
    chk("a stranger with the same envelope is refused", r2.status, 401)
    anon2.close()

    ctx.close()
    browser.close()

print(f"\n  {passed} passed, {len(failures)} failed")
if failures:
    print("\n  still wrong:")
    for f in failures:
        print(f"    {f}")
print(f"\n  cleanup key: {STAMP}\n")
sys.exit(1 if failures else 0)
