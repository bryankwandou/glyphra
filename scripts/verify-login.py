"""
Signing in, and staying signed in.

The complaint was made repeatedly and acknowledged repeatedly without being
fixed, so this checks the thing itself rather than the thing next to it. Two
separate claims live inside it:

  1. "sudah tidak bisa login dengan username lagi" — a real regression. Accounts
     replaced a single-instructor login that took a username, and nothing took
     its place, so a name that used to work stopped matching anything.

  2. "selalu harus login ulang" — this one was never reproduced. The session
     cookie is fourteen days, httpOnly, and survives a browser restart. Checked
     again here, from a rebuilt browser context, because saying "I could not
     reproduce it" is worth nothing without the run that shows it.

  python scripts/verify-login.py http://localhost:3000
"""
import sys, time, re
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
STAMP = f"login{int(time.time())}"
NAME = f"Pengajar {STAMP[-5:]}"
EMAIL = f"{STAMP}@example.invalid"
PASSWORD = "a-long-enough-password"

passed, failures = 0, []


def chk(label, got, want):
    global passed
    if str(got) == str(want):
        print(f"    ok    {label:<50}{got}")
        passed += 1
    else:
        print(f"    FAIL  {label:<50}got {got}, want {want}")
        failures.append(label)


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    # A dev server compiles each route on its first hit, which can take a minute.
    pw.selectors.set_test_id_attribute("data-testid")

    # ------------------------------------------------------ make the account
    ctx = browser.new_context()
    ctx.set_default_timeout(180_000)
    up = ctx.request.post(f"{BASE}/api/account/signup", data={
        "email": EMAIL, "password": PASSWORD, "displayName": NAME,
    })
    if not up.ok:
        print(f"\n  SETUP FAILED — sign-up returned {up.status}\n")
        sys.exit(1)
    print(f"\n  account: {EMAIL}   name: {NAME}\n")
    ctx.close()

    # ---------------------------------------------------- 1. the API accepts
    print("  1. what the sign-in endpoint accepts\n")

    def signin(identifier, password=PASSWORD):
        c = browser.new_context()
        r = c.request.post(f"{BASE}/api/account/signin", data={
            "email": identifier, "password": password,
        })
        status = r.status
        c.close()
        return status

    chk("the email address signs in", signin(EMAIL), 200)
    chk("the name on the account signs in", signin(NAME), 200)
    chk("  and the name is not case-sensitive", signin(NAME.lower()), 200)
    chk("  and surrounding spaces are ignored", signin(f"  {NAME}  "), 200)
    chk("a wrong password is still refused", signin(NAME, "wrong-password"), 401)
    chk("an unknown name is refused", signin("Nobody At All"), 401)

    # ------------------------------------------- 2. the form lets a name through
    print("\n  2. the sign-in form itself\n")
    #
    # The server accepting a name is only half of it. While the field was
    # type="email" the browser refused the value before any request was sent,
    # so the endpoint fix would never have been reachable from the page.

    ctx = browser.new_context()
    page = ctx.new_page()
    page.goto(f"{BASE}/account", wait_until="networkidle")
    page.wait_for_timeout(1200)

    field_type = page.locator("#em").get_attribute("type")
    chk("the field does not reject a name outright", field_type, "text")

    label = page.inner_text("label[for='em']")
    chk("and the label says a name is allowed", bool(re.search("name|nama", label, re.I)), True)
    print(f"          label reads: {label.strip()}")

    page.locator("#em").fill(NAME)
    page.wait_for_timeout(200)
    page.locator("#pw").fill(PASSWORD)
    page.wait_for_timeout(200)
    page.get_by_role("button", name=re.compile("Sign in|Masuk", re.I)).last.click()
    page.wait_for_timeout(4000)

    body = page.inner_text("body")
    chk("signing in by name works in the browser", NAME in body, True)
    chk("  and no failure notice is shown",
        bool(re.search("did not match|tidak cocok", body, re.I)), False)

    # ---------------------------------------------- 3. it stays signed in
    print("\n  3. staying signed in\n")

    cookie = [c for c in ctx.cookies() if c["name"] == "glyphra_account"]
    chk("a session cookie exists", len(cookie), 1)
    if cookie:
        days = (cookie[0]["expires"] - time.time()) / 86400
        chk("  it is httpOnly", cookie[0]["httpOnly"], True)
        chk("  it lasts about a fortnight", 13 < days < 15, True)
        print(f"          expires in {days:.1f} days")

    for path in ["/instructor", "/assess", "/account", "/practice"]:
        p2 = ctx.new_page()
        p2.goto(f"{BASE}{path}", wait_until="networkidle")
        # A cold serverless page needs longer than the old 700ms before its
        # header has text to read; a short wait made a working header look empty.
        p2.wait_for_timeout(2000)
        # The signed-in header offers the papers page; the signed-out one shows
        # a sign-in link instead. Looking for a sign-out link was looking for
        # something no page has ever rendered.
        header = p2.inner_text("header")
        still = bool(re.search(r"Papers|Lembar soal", header)) or NAME in header
        chk(f"still signed in at {path}", still, True)
        p2.close()

    # A rebuilt context from the stored state is what reopening the browser does.
    state = ctx.storage_state()
    ctx.close()

    for attempt in (1, 2):
        fresh = browser.new_context(storage_state=state)
        fp = fresh.new_page()
        fp.goto(f"{BASE}/instructor", wait_until="networkidle")
        fp.wait_for_timeout(2000)
        text = fp.inner_text("body")
        chk(f"survives browser restart {attempt}", NAME in text or "Keluar" in text or "Sign out" in text, True)
        state = fresh.storage_state()
        fresh.close()

    browser.close()

print(f"\n  {passed} passed, {len(failures)} failed")
if failures:
    print("\n  still wrong:")
    for f in failures:
        print(f"    {f}")
print(f"\n  cleanup key: {STAMP}\n")
sys.exit(1 if failures else 0)
