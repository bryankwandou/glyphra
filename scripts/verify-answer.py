"""
An instructor types TES, and TES is what the student has to answer.

Run in a real browser against a running site. Each step is one a person takes:
fill the form, read the QR off the screen, open what it points at on another
device with no sign-in, get it wrong, then get it right. The QR is read from a
screenshot of the rendered image, so what is checked is what a phone would see.

  python scripts/verify-answer.py https://glyphra.vercel.app
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
NOTE = "uji otomatis"

env = {}
for line in Path(".env.local").read_text(encoding="utf-8-sig").splitlines():
    if "=" in line and not line.startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"')

fails = 0


def chk(label, got, want):
    global fails
    ok = got == want
    fails += 0 if ok else 1
    print(f"  {'ok  ' if ok else 'FAIL'}  {label:52} {got!r}" + ("" if ok else f" (want {want!r})"))


def read_qr(png):
    img = cv2.imdecode(np.frombuffer(png, np.uint8), cv2.IMREAD_COLOR)
    # Enlarged and given a white margin, as a phone would have the page around it.
    img = cv2.resize(img, None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST)
    img = cv2.copyMakeBorder(img, 60, 60, 60, 60, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    return cv2.QRCodeDetector().detectAndDecode(img)[0]


def caesar_back(text, shift):
    out = ""
    for ch in text:
        out += chr((ord(ch) - 65 - shift) % 26 + 65) if "A" <= ch <= "Z" else ch
    return out


with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1280, "height": 1400})
    ctx.add_cookies([{"name": "glyphra_lang", "value": "id", "url": BASE}])
    pg = ctx.new_page()
    pg.set_default_timeout(120000)

    pg.goto(f"{BASE}/instructor", wait_until="networkidle")
    pg.fill("#u", env["GLYPHRA_ADMIN_USER"])
    pg.fill("#p", env["GLYPHRA_ADMIN_PASSWORD"])
    with pg.expect_response(lambda r: "/api/auth" in r.url):
        pg.keyboard.press("Enter")
    pg.wait_for_timeout(2000)
    pg.goto(f"{BASE}/assess", wait_until="networkidle")

    print("\n  1. the instructor makes the problem\n")
    chk("the form has an answer field", pg.locator("#answer").count(), 1)
    pg.fill("#answer", "tes")
    pg.select_option("#tech", "caesar")
    pg.fill("#lbl", NOTE)
    pg.get_by_role("button", name="Buat soalnya").click()
    pg.wait_for_selector("#made-answer")

    chk("the instructor is shown the answer they wrote", pg.inner_text("#made-answer").strip(), "TES")
    panel = pg.locator("#made-answer").locator("xpath=ancestor::div[2]")
    cipher = panel.locator(".cipher-text").inner_text().strip()
    shift = int(panel.locator("dd").first.inner_text().strip())
    chk("the ciphertext deciphers to TES with the shown key", caesar_back(cipher, shift), "TES")

    link = pg.locator("p.font-mono", has_text="/p/").inner_text().strip()
    qr_box = pg.locator("svg[aria-label^='QR']").first
    print(f"        link {link}")
    chk("the QR on screen opens exactly that link", read_qr(qr_box.screenshot()), link)

    print("\n  2. the student opens it, signed out, on another device\n")
    s = b.new_context()
    s.add_cookies([{"name": "glyphra_lang", "value": "id", "url": BASE}])
    sp = s.new_page()
    sp.set_default_timeout(120000)
    sp.goto(link, wait_until="networkidle")

    chk("the student sees the same ciphertext", sp.inner_text(".cipher-text").strip(), cipher)
    chk("the page names one method", "Caesar" in sp.inner_text("h1"), True)
    chk("the length matches the word", "sepanjang 3 huruf" in sp.inner_text("body"), True)
    html = sp.content()
    chk("the answer is nowhere in the page source", '"TES"' in html or ">TES<" in html, False)
    chk("the instructor's note is not shown", NOTE in sp.inner_text("body"), False)
    chk("the instructor's note is not in the source", NOTE in html, False)

    print("\n  3. the student answers\n")
    if sp.locator("#who").count():
        sp.fill("#who", "Siswa Uji")
    sp.fill("#ans", "SALAH")
    sp.get_by_role("button", name="Kirim jawaban").click()
    sp.wait_for_timeout(3000)
    chk("a wrong answer does not win", "Anda memecahkannya" in sp.inner_text("body"), False)

    sp.fill("#ans", "tes")
    sp.get_by_role("button", name="Kirim jawaban").click()
    sp.wait_for_selector("text=Anda memecahkannya")
    chk("TES wins", "Anda memecahkannya" in sp.inner_text("body"), True)

    print("\n  4. the instructor can see it afterwards\n")
    pg.goto(f"{BASE}/instructor", wait_until="networkidle")
    body = pg.inner_text("body")
    chk("the history shows the answer", "jawaban: TES" in body, True)
    chk("the history shows who solved it", "Siswa Uji" in body, True)

    print("\n  5. a harder method, still TES\n")
    for tech, name in [("vigenere", "Vigen"), ("playfair", "Playfair")]:
        pg.goto(f"{BASE}/assess", wait_until="networkidle")
        pg.fill("#answer", "TES")
        pg.select_option("#tech", tech)
        pg.fill("#lbl", NOTE)
        pg.get_by_role("button", name="Buat soalnya").click()
        pg.wait_for_selector("#made-answer")
        url = pg.locator("p.font-mono", has_text="/p/").inner_text().strip()
        sp.goto(url, wait_until="networkidle")
        chk(f"{tech}: the page names that method", name in sp.inner_text("h1"), True)
        sp.fill("#ans", "TES")
        sp.get_by_role("button", name="Kirim jawaban").click()
        sp.wait_for_selector("text=Anda memecahkannya")
        chk(f"{tech}: TES wins", True, True)

    b.close()

print(f"\n  {'all passed' if not fails else str(fails) + ' failed'}\n")
sys.exit(1 if fails else 0)
