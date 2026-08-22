"""
The parts a person actually touches, driven by a real browser.

Everything else here is checked over HTTP, which proves the server behaves. It
does not prove the interface does. The shuffled-quiz path is the clearest case:
the participant's own question order is fetched by an onClick handler in
quiz-runner.tsx that no HTTP check ever executes, so until a browser presses
that button the code has never run at all. A stale closure or a typo there
would show up for the first time in front of a class.

  python scripts/verify-browser.py <base-url>
"""
import sys, time, re, json, subprocess
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3133"
STAMP = f"br{int(time.time())}"

passed = 0
failures = []

def chk(label, got, want):
    global passed
    if str(got) == str(want):
        print(f"  ok    {label:<46}{got}")
        passed += 1
    else:
        print(f"  FAIL  {label:<46}got {got}, want {want}")
        failures.append(label)

def answers_for(kind, code, who=""):
    """Derive the answers independently, the way a third party could.

    Asking the server would make "the app accepted them" circular: it would
    only prove the app agrees with itself.
    """
    out = subprocess.run(
        ["npx", "tsx", "--conditions=react-server", "--env-file=.env.local",
         "scripts/answers-for.ts", kind, code, who],
        capture_output=True, text=True, shell=True, timeout=300,
    )
    for line in reversed(out.stdout.strip().splitlines()):
        if line.startswith("{"):
            return json.loads(line)
    return {"answers": []}


def need(label, ok, detail):
    global passed
    if ok:
        print(f"  ok    {label:<46}ready")
        passed += 1
    else:
        print(f"\n  SETUP FAILED — {label}: {detail}\n")
        sys.exit(1)

with sync_playwright() as pw:
    browser = pw.chromium.launch()

    # ---------------------------------------------------------------- sign up
    owner = browser.new_context()
    page = owner.new_page()
    page.goto(f"{BASE}/account", wait_until="networkidle")

    api = owner.request.post(f"{BASE}/api/account/signup", data={
        "email": f"{STAMP}@example.invalid",
        "password": "a-long-enough-password",
        "displayName": "Browser Check",
    })
    need("owner account", api.ok, f"signup returned {api.status}")

    # ------------------------------------------- compose a shuffled quiz
    made = owner.request.post(f"{BASE}/api/compose", data={
        "techniques": ["caesar", "atbash", "rot13", "a1z26", "rail-fence", "affine"],
        "shuffle": True, "disclose": True, "minutes": 0, "mode": "open",
    })
    need("composed a shuffled quiz", made.ok, f"compose returned {made.status}")
    code = made.json()["code"]

    print(f"\n  a real browser sits the shuffled quiz {code}\n")

    def sit(who, fill=None):
        """Open the quiz, press start, walk it once forward.

        Reads the method shown on each question and, when `fill` is given, types
        that answer into each box on the way past. One forward pass, because
        going back afterwards meant relying on the numbered buttons, and those
        did not navigate when clicked from here — every answer landed in the
        question that happened to be open and the run scored 1/6 while the app
        was correct.
        """
        ctx = browser.new_context()
        p = ctx.new_page()
        p.goto(f"{BASE}/q/{code}", wait_until="networkidle")

        # Fill the name in the lobby, then start. This is the click that fires
        # the fetch nothing else has exercised.
        #
        # The field is #qname and carries no type attribute, so `input[type=text]`
        # does not match it — a CSS selector on type only matches an explicit
        # one. The first version of this check missed on all three selectors,
        # left the name empty, and both participants fetched as nobody. It then
        # reported the app as broken. Hence the assertion below: a check that
        # does not confirm its own setup reports the wrong thing, which is the
        # third time that has bitten this project.
        p.locator('#qname').fill(who)
        entered = p.locator('#qname').input_value()
        if entered != who:
            print(f"  SETUP FAILED — the name box holds '{entered}', not '{who}'")
            sys.exit(1)

        started = False
        for label in ["Start", "Mulai", "Begin"]:
            btn = p.get_by_role("button", name=re.compile(label, re.I))
            if btn.count():
                btn.first.click()
                started = True
                break
        if not started:
            ctx.close()
            return None, None

        p.wait_for_timeout(2500)

        # Read the method off the badge on each question rather than scanning the
        # page text. Scanning found whichever name appeared first in my own list,
        # not the one on screen, so the order it returned was fiction.
        order = []
        for i in range(6):
            order.append(p.locator("article header span").first.inner_text().strip())
            if fill is not None and i < len(fill):
                p.locator("#qans").fill(fill[i])
                p.wait_for_timeout(200)
            nxt = p.get_by_role("button", name=re.compile(r"^Next$|^Berikutnya$", re.I))
            if nxt.count() and i < 5:
                nxt.first.click()
                p.wait_for_timeout(600)
        return order, (p, ctx)

    # Derived before she sits, so the walk is a single forward pass.
    derived = answers_for("quiz", code, "Ana")
    need("derived Ana's answers", len(derived.get("answers", [])) == 6,
         f"got {len(derived.get('answers', []))} answers")

    ana_order, ana_ctx = sit("Ana", fill=derived["answers"])
    need("Ana could start the quiz", ana_order is not None, "no start button was found")
    chk("Ana sees six distinct methods", len(set(ana_order)), 6)
    chk("her paper matches what the plan says she gets",
        [m.strip().lower() for m in derived["methods"]] == [m.strip().lower() for m in ana_order],
        True)

    budi_order, budi_ctx = sit("Budi")
    need("Budi could start the quiz", budi_order is not None, "no start button was found")
    chk("Budi sees the same six methods", sorted(budi_order) == sorted(ana_order), True)
    chk("their orders differ", ana_order != budi_order, True)

    print("")
    print(f"    Ana : {' > '.join(ana_order)}")
    print(f"    Budi: {' > '.join(budi_order)}")
    print("")

    if budi_ctx: budi_ctx[1].close()

    # ------------------------------------------------------------------------
    # The proof that matters most: Ana's finished paper goes in for marking.
    #
    # A shuffled quiz reorders per person. If the marking derived a different
    # order from the same name, every answer would be wrong and nothing would
    # raise. Full marks on the boxes she was actually shown is the only thing
    # that rules that out.
    # ------------------------------------------------------------------------
    print("  Ana finishes her paper and is marked")
    print("")

    ap, actx = ana_ctx

    review = ap.get_by_role("button", name=re.compile("Review and submit|Tinjau lalu kirim", re.I))
    if review.count():
        review.first.click()
    else:
        early = ap.get_by_role("button", name=re.compile("Finish early|Selesaikan lebih awal", re.I))
        if early.count():
            early.first.click()
    ap.wait_for_timeout(1500)

    send = ap.get_by_role("button", name=re.compile("Submit for marking|Kirim untuk dinilai", re.I))
    need("reached the submit button", send.count() > 0, "no submit control on the review screen")
    send.first.click()
    ap.wait_for_timeout(5000)

    marked = ap.inner_text("body")
    score = re.search(r"(\d{1,3})\s*%", marked)
    chk("Ana scores full marks on her own paper", score.group(1) if score else "no score", "100")
    if actx: actx.close()

    # ------------------------------------------------ a single problem, solved
    prob = owner.request.post(f"{BASE}/api/problem/create", data={
        "techniqueId": "caesar", "disclose": True, "label": "browser check",
    })
    need("made a single problem", prob.ok, f"create returned {prob.status}")
    pcode = prob.json()["problem"]["code"]

    print(f"  a real browser solves the single problem {pcode}\n")

    ctx = browser.new_context()
    p = ctx.new_page()
    p.goto(f"{BASE}/p/{pcode}", wait_until="networkidle")
    body = p.inner_text("body")
    chk("the problem page names Caesar", bool(re.search("caesar", body, re.I)), True)
    chk("and shows a ciphertext", bool(re.search("Ciphertext|Cipherteks", body, re.I)), True)

    # Type a wrong answer first: it must be refused without closing the problem.
    p.locator("#who").fill("Solver")
    p.locator("#ans").fill("THIS IS NOT THE MESSAGE")
    p.get_by_role("button", name=re.compile("Submit|Kirim", re.I)).first.click()
    p.wait_for_timeout(2500)
    chk("a wrong answer is refused in the browser",
        bool(re.search("Not right|Belum benar", p.inner_text("body"), re.I)), True)

    # Now the real one, derived independently.
    real = answers_for("problem", pcode)["answers"][0]
    p.locator("#ans").fill(real)
    p.get_by_role("button", name=re.compile("Submit|Kirim", re.I)).first.click()
    p.wait_for_timeout(3000)
    chk("the right answer wins in the browser",
        bool(re.search("You solved it|Anda memecahkannya", p.inner_text("body"), re.I)), True)
    ctx.close()

    # A second person, in a clean browser, must be turned away.
    ctx2 = browser.new_context()
    p2 = ctx2.new_page()
    p2.goto(f"{BASE}/p/{pcode}", wait_until="networkidle")
    late = p2.inner_text("body")
    chk("a latecomer sees it is solved",
        bool(re.search("Already solved|Sudah dipecahkan", late, re.I)), True)
    chk("and the ciphertext is gone",
        bool(re.search("Ciphertext|Cipherteks", late, re.I)), False)
    chk("and the solver is named", "Solver" in late, True)
    ctx2.close()
    owner.close()
    browser.close()

print(f"\n  {passed} passed, {len(failures)} failed")
print(f"  cleanup key: {STAMP}\n")
sys.exit(1 if failures else 0)
