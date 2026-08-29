"""
Every complaint on the list, answered one at a time, in a real browser.

Written against a running localhost rather than the deployment, because the
point of this one is that it can be run on the machine in front of you and
watched. Each section names the complaint it is answering, and each check
prints what it actually saw rather than a tick, so a claim can be read back
against the evidence instead of trusted.

  python scripts/verify-court.py http://localhost:3000
"""
import sys, time, re, json, subprocess
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
STAMP = f"court{int(time.time())}"

passed, failures = 0, []


def chk(label, got, want):
    global passed
    if str(got) == str(want):
        print(f"    ok    {label:<52}{got}")
        passed += 1
    else:
        print(f"    FAIL  {label:<52}got {got}, want {want}")
        failures.append(label)



def make_codes(n, questions=5, low=1, high=5):
    """Quiz codes are built in the browser by encodeQuizCode, not by an API.

    The first version of this check posted to /api/quiz/create, which does not
    exist. Every request 404'd, the loop body never ran, and "0 questions, none
    blank" printed as a pass. That is the fourth time in this project a check
    has reported success because it was measuring nothing, so the guard below
    is not optional politeness.
    """
    out = subprocess.run(
        ["npx", "tsx", "--conditions=react-server", "-e",
         "import {encodeQuizCode,randomQuizSeed} from './src/lib/quiz-code';"
         f"const out=[];for(let i=0;i<{n};i++)out.push(encodeQuizCode({{seed:randomQuizSeed(),"
         f"questions:{questions},difficultyLow:{low},difficultyHigh:{high},minutes:0}}));"
         "console.log(JSON.stringify(out));"],
        capture_output=True, text=True, shell=True, timeout=400,
    )
    for line in reversed(out.stdout.strip().splitlines()):
        if line.startswith("["):
            return json.loads(line)
    return []


def head(n, complaint):
    print(f"\n  {n}. {complaint}\n")


with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context()
    page = ctx.new_page()

    # ---------------------------------------------------------------------
    head(1, '"soal selalu memaksa 1 famili dan teknik" — one family, no technique')
    # ---------------------------------------------------------------------
    #
    # The claim to test: choosing a single family and naming no technique
    # returns a problem from some other family. Ten draws per family, because
    # one draw landing correctly proves nothing about a random pick.

    FAMILIES = {
        "transposition": "Transposition",
        "polyalphabetic": "Polyalphabetic",
        "encoding": "Encoding",
        "steganography": "Steganography",
    }

    for fam, label in FAMILIES.items():
        seen, wrong, relaxed_any = set(), [], 0
        for i in range(10):
            r = ctx.request.post(f"{BASE}/api/challenge", data={
                "families": [fam], "seed": f"fam-{fam}-{i}",
            })
            if not r.ok:
                wrong.append(f"HTTP {r.status}")
                continue
            j = r.json()
            seen.add(j["techniqueId"])
            if j.get("family") != fam:
                # Only a fault if it was not reported as set aside.
                if "family" not in (j.get("relaxed") or []):
                    wrong.append(f'{j["techniqueId"]}({j.get("family")})')
                else:
                    relaxed_any += 1

        chk(f"{label}: 10 draws, none from another family", len(wrong), 0)
        if wrong:
            print(f"          {wrong[:4]}")
        print(f"          drew {len(seen)} different methods: {', '.join(sorted(seen)[:6])}")

    # A family plus a difficulty, which is the combination that used to be
    # quietly ignored.
    r = ctx.request.post(f"{BASE}/api/challenge", data={
        "families": ["transposition"], "difficulties": [1], "seed": "fam-diff",
    })
    j = r.json()
    chk("transposition + difficulty 1 stays transposition", j.get("family"), "transposition")
    chk("  and honours the difficulty", j.get("difficulty"), 1)

    # An impossible pair must say so rather than silently pick something.
    r = ctx.request.post(f"{BASE}/api/challenge", data={
        "families": ["steganography"], "difficulties": [1], "seed": "imp",
    })
    j = r.json()
    chk("an impossible pair reports what it set aside", bool(j.get("relaxed")), True)
    print(f"          relaxed: {j.get('relaxed')}")

    # ---------------------------------------------------------------------
    head(2, '"login selalu harus login ulang" — does the session survive?')
    # ---------------------------------------------------------------------

    up = ctx.request.post(f"{BASE}/api/account/signup", data={
        "email": f"{STAMP}@example.invalid",
        "password": "a-long-enough-password",
        "displayName": "Court Check",
    })
    chk("sign-up succeeds", up.ok, True)

    cookies = ctx.cookies()
    sess = [c for c in cookies if "session" in c["name"].lower() or "glyphra" in c["name"].lower()]
    sess = [c for c in sess if c["name"] != "glyphra_lang"]
    chk("a session cookie is set", len(sess) > 0, True)
    if sess:
        c = sess[0]
        days = (c["expires"] - time.time()) / 86400 if c["expires"] > 0 else 0
        print(f"          {c['name']}: httpOnly={c['httpOnly']} lasts {days:.0f} days")
        chk("  it is httpOnly", c["httpOnly"], True)
        chk("  it outlives the browser session", days > 7, True)

    # Navigate to three protected pages without signing in again.
    for path in ["/instructor", "/assess", "/account"]:
        p2 = ctx.new_page()
        p2.goto(f"{BASE}{path}", wait_until="networkidle")
        body = p2.inner_text("body")
        signed = "Court Check" in body or "Keluar" in body or "Sign out" in body
        chk(f"still signed in at {path}", signed, True)
        p2.close()

    # And after the whole browser context is rebuilt from the stored cookies,
    # which is what closing and reopening the browser actually does.
    state = ctx.storage_state()
    fresh = browser.new_context(storage_state=state)
    fp = fresh.new_page()
    fp.goto(f"{BASE}/instructor", wait_until="networkidle")
    chk("survives a browser restart", "Court Check" in fp.inner_text("body"), True)
    fp.close()
    fresh.close()

    # ---------------------------------------------------------------------
    head(3, '"quiz randomizer masih penipuan soal kosong"')
    # ---------------------------------------------------------------------
    #
    # A blank question is one whose ciphertext has no visible characters. The
    # invisible ranges are stripped before measuring, because a box holding a
    # hundred zero-width characters looks exactly like an empty one.

    INVISIBLE = re.compile(r"[​-‏ - ⁠-⁯﻿\s]")

    blank, checked, methods = [], 0, set()
    for code in make_codes(14):
        got = ctx.request.get(f"{BASE}/api/quiz?code={code}")
        if not got.ok:
            continue
        for q in got.json()["questions"]:
            checked += 1
            methods.add(q["techniqueName"])
            if not INVISIBLE.sub("", q["ciphertext"]):
                blank.append(q["techniqueName"])

    # Nothing examined is not a pass. It is the check being broken.
    if checked < 40:
        print(f"    SETUP FAILED  only {checked} questions were examined; the probe is not working")
        sys.exit(1)

    chk(f"{checked} quiz questions, none blank", len(blank), 0)
    if blank:
        print(f"          blank: {set(blank)}")
    print(f"          across {len(methods)} different methods")

    # The two that caused it must still be refused at the door.
    for bad in ["zero-width-stego", "whitespace-stego"]:
        r = ctx.request.post(f"{BASE}/api/problem/create", data={"techniqueId": bad, "disclose": True})
        chk(f"{bad} is refused as a problem", r.status, 400)

    # ---------------------------------------------------------------------
    head(4, '"belum ada janji keluarkan kunci jawaban setelah siswa selesai"')
    # ---------------------------------------------------------------------

    codes = make_codes(1, questions=4, low=1, high=2)
    if not codes:
        print("    SETUP FAILED  could not build a quiz code")
        sys.exit(1)
    qcode = codes[0]
    print(f"    quiz code {qcode}")

    # Derive the answers independently rather than asking the server for them.
    out = subprocess.run(
        ["npx", "tsx", "--conditions=react-server", "--env-file=.env.local",
         "scripts/answers-for.ts", "quiz", qcode],
        capture_output=True, text=True, shell=True, timeout=400,
    )
    answers = []
    for line in reversed(out.stdout.strip().splitlines()):
        if line.startswith("{"):
            answers = json.loads(line)["answers"]
            break
    chk("derived the answers independently", len(answers), 4)

    # Answer three of four correctly, so there is a wrong one whose key must appear.
    submitted = answers[:3] + ["DEFINITELY NOT THE MESSAGE"]
    graded = ctx.request.post(f"{BASE}/api/quiz/grade", data={
        "code": qcode, "answers": submitted, "name": "Court Pupil",
    })
    g = graded.json()
    chk("three of four are marked correct", g["correct"], 3)

    wrong_one = [r for r in g["results"] if not r["correct"]]
    chk("the wrong question comes back with its real message", len(wrong_one), 1)
    if wrong_one:
        exp = wrong_one[0]["expected"]
        chk("  and that message is not empty", bool(exp.strip()), True)
        chk("  and it equals the true answer", exp.strip().upper() == answers[3].strip().upper(), True)
        print(f'          key released: "{exp[:48]}"')

    # It must not leak before the paper is handed in.
    served = ctx.request.get(f"{BASE}/api/quiz?code={qcode}").text()
    leaked = [a for a in answers if len(a) > 6 and a.replace(" ", "") in served.replace(" ", "")]
    chk("no answer is in the paper before submitting", len(leaked), 0)

    # ---------------------------------------------------------------------
    head(5, '"buktikan tiap lembar jawaban masuk ke database"')
    # ---------------------------------------------------------------------

    claimed = ctx.request.post(f"{BASE}/api/quiz/claim", data={
        "code": qcode, "mode": "open", "title": "court exhibit",
    })
    chk("the quiz is claimed, so attempts are recorded", claimed.ok, True)

    for who, ans in [("Ana", answers), ("Budi", answers[:2] + ["X", "X"]), ("Citra", ["X"] * 4)]:
        ctx.request.post(f"{BASE}/api/quiz/grade", data={"code": qcode, "answers": ans, "name": who})

    rows = subprocess.run(
        ["npx", "tsx", "--conditions=react-server", "--env-file=.env.local", "-e",
         "import {db} from './src/lib/db';"
         f"(async()=>{{const r=await db()`SELECT participant,score,correct,total,perfect,submitted_at FROM attempts WHERE quiz_code=${{'{qcode}'}} ORDER BY id`;"
         "console.log(JSON.stringify(r));})();"],
        capture_output=True, text=True, shell=True, timeout=400,
    )
    saved = []
    for line in reversed(rows.stdout.strip().splitlines()):
        if line.startswith("["):
            saved = json.loads(line)
            break

    chk("three papers are in the database", len(saved), 3)
    for r in saved:
        print(f'          {r["participant"]:<8} {r["correct"]}/{r["total"]}  score {r["score"]:>3}  '
              f'perfect={r["perfect"]}  {str(r["submitted_at"])[:19]}')
    if len(saved) == 3:
        chk("  Ana is recorded full marks", saved[0]["score"], 100)
        chk("  Citra is recorded zero", saved[2]["score"], 0)
        chk("  each row carries a timestamp", all(r["submitted_at"] for r in saved), True)

    # ---------------------------------------------------------------------
    head(6, '"asesmen belum bisa kustom per soal"')
    # ---------------------------------------------------------------------

    plan = ["playfair", "caesar", "bifid", "rail-fence", "vigenere"]
    comp = ctx.request.post(f"{BASE}/api/compose", data={
        "techniques": plan, "shuffle": False, "disclose": True, "minutes": 0, "mode": "open",
    })
    chk("a paper can be composed question by question", comp.ok, True)
    if comp.ok:
        ccode = comp.json()["code"]
        served = ctx.request.get(f"{BASE}/api/quiz?code={ccode}").json()["questions"]
        for i, want in enumerate(plan):
            got = served[i]["techniqueName"] if i < len(served) else "missing"
            ok = want.split("-")[0].lower() in got.lower()
            chk(f"  question {i+1} is the {want} that was asked for", ok, True)

    # ---------------------------------------------------------------------
    head(7, '"toggle bahasa hanya bekerja di landing page"')
    # ---------------------------------------------------------------------

    lp = ctx.new_page()
    lp.goto(f"{BASE}/practice", wait_until="networkidle")
    lp.wait_for_timeout(1500)
    lp.get_by_role("button", name=re.compile(r"^ID$")).first.click()
    lp.wait_for_timeout(2500)

    for path, must in [
        ("/practice", ["Mode pemula", "Kesulitan", "Keluarga", "Asal pesan"]),
        ("/assess", ["Kode masuk", "Salin kodenya"]),
        ("/catalogue", ["teknik"]),
    ]:
        lp.goto(f"{BASE}{path}", wait_until="networkidle")
        lp.wait_for_timeout(1200)
        body = lp.inner_text("body").lower()
        found = sum(1 for m in must if m.lower() in body)
        chk(f"{path} renders Indonesian", f"{found}/{len(must)}", f"{len(must)}/{len(must)}")

    # The question text itself, which is the part that matters most.
    lp.goto(f"{BASE}/practice", wait_until="networkidle")
    lp.wait_for_timeout(1200)
    lp.get_by_role("button", name=re.compile("Soal baru|Buatkan", re.I)).first.click()
    lp.wait_for_timeout(4000)
    body = lp.inner_text("body")
    chk("the question itself is Indonesian", "Pulihkan pesan aslinya" in body, True)
    chk("  and no English instruction is left", "Recover the plaintext" in body, False)
    lp.close()

    ctx.close()
    browser.close()

print(f"\n  {passed} passed, {len(failures)} failed")
if failures:
    print("\n  still wrong:")
    for f in failures:
        print(f"    {f}")
print(f"\n  cleanup key: {STAMP}\n")
sys.exit(1 if failures else 0)
