#!/usr/bin/env bash
# Every door into a quiz obeys the same rules.
#
# Written after finding that the /q/[code] page did not. The fetch endpoint and
# the marking endpoint both checked the policy, so the rules looked enforced —
# but the page rendered the questions server-side without asking, which meant a
# host-only quiz refused strangers at the API while handing them every question
# through the page. A rule enforced at two of three doors is not enforced.
#
# Usage: e2e-doors.sh <base-url>

set -u
B="${1:-http://localhost:3133}"
STAMP="doors$(date +%s)"
PASS=0; FAIL=0
rm -f owner.jar stranger.jar

chk() { # label  actual  expected
  if [ "$2" = "$3" ]; then
    printf "  ok    %-46s %s\n" "$1" "$2"; PASS=$((PASS+1))
  else
    printf "  FAIL  %-46s got %s want %s\n" "$1" "$2" "$3"; FAIL=$((FAIL+1))
  fi
}

code_of() { curl -s --max-time 45 -X POST "$B/api/account/signup" \
  -H "Content-Type: application/json" -d "$1" -o /dev/null -w '%{http_code}'; }

# --- two accounts ------------------------------------------------------------
curl -s -c owner.jar --max-time 45 -X POST "$B/api/account/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$STAMP@example.invalid\",\"password\":\"a-long-enough-password\",\"displayName\":\"Doors Owner\"}" \
  -o /dev/null
curl -s -c stranger.jar --max-time 45 -X POST "$B/api/account/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"s$STAMP@example.invalid\",\"password\":\"another-long-password\",\"displayName\":\"Doors Stranger\"}" \
  -o /dev/null

CODE="CY9J-8B59"

# --- host_only: all three doors ---------------------------------------------
curl -s -b owner.jar --max-time 45 -X POST "$B/api/quiz/claim" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"mode\":\"host_only\",\"title\":\"doors\"}" -o /dev/null

echo
echo "  host_only"
chk "page, stranger"      "$(curl -s -b stranger.jar -o /dev/null -w '%{http_code}' --max-time 45 "$B/q/$CODE")" "200"
# The page returns 200 either way — what matters is whether the questions are in
# the body. Grep for a ciphertext block rather than trusting the status code.
LEAK=$(curl -s -b stranger.jar --max-time 45 "$B/q/$CODE" | grep -ci "restricted\|terkunci")
chk "page, stranger sees the refusal"  "$LEAK" "1"
QLEAK=$(curl -s -b stranger.jar --max-time 45 "$B/q/$CODE" | grep -ci "Ciphertext")
chk "page, stranger sees no ciphertext" "$QLEAK" "0"
chk "api, stranger"       "$(curl -s -b stranger.jar -o /dev/null -w '%{http_code}' --max-time 45 "$B/api/quiz?code=$CODE")" "403"
chk "mark, stranger"      "$(curl -s -b stranger.jar -o /dev/null -w '%{http_code}' --max-time 45 -X POST "$B/api/quiz/grade" -H 'Content-Type: application/json' -d "{\"code\":\"$CODE\",\"answers\":[\"x\"],\"name\":\"S\"}")" "403"
OWNSEE=$(curl -s -b owner.jar --max-time 45 "$B/q/$CODE" | grep -ci "Ciphertext")
chk "page, owner does see it"          "$([ "$OWNSEE" -ge 1 ] && echo 1 || echo 0)" "1"

# --- closed: all three doors -------------------------------------------------
curl -s -b owner.jar --max-time 45 -X POST "$B/api/quiz/claim" \
  -H "Content-Type: application/json" -d "{\"code\":\"$CODE\",\"mode\":\"open\"}" -o /dev/null
curl -s -b owner.jar --max-time 45 -X POST "$B/api/quiz/close" \
  -H "Content-Type: application/json" -d "{\"code\":\"$CODE\"}" -o /dev/null

echo
echo "  closed"
CLOSED=$(curl -s --max-time 45 "$B/q/$CODE" | grep -ci "closed\|ditutup")
chk "page says closed"    "$([ "$CLOSED" -ge 1 ] && echo 1 || echo 0)" "1"
CLEAK=$(curl -s --max-time 45 "$B/q/$CODE" | grep -ci "Ciphertext")
chk "page shows no questions"          "$CLEAK" "0"
chk "api refuses"         "$(curl -s -o /dev/null -w '%{http_code}' --max-time 45 "$B/api/quiz?code=$CODE")" "423"
chk "mark refuses"        "$(curl -s -o /dev/null -w '%{http_code}' --max-time 45 -X POST "$B/api/quiz/grade" -H 'Content-Type: application/json' -d "{\"code\":\"$CODE\",\"answers\":[\"x\"],\"name\":\"S\"}")" "423"

# --- reopened, then unclaimed ------------------------------------------------
curl -s -b owner.jar --max-time 45 -X POST "$B/api/quiz/close" \
  -H "Content-Type: application/json" -d "{\"code\":\"$CODE\",\"reopen\":true}" -o /dev/null

echo
echo "  reopened and open"
chk "api open again"      "$(curl -s -o /dev/null -w '%{http_code}' --max-time 45 "$B/api/quiz?code=$CODE")" "200"
OPENQ=$(curl -s --max-time 45 "$B/q/$CODE" | grep -ci "Ciphertext")
chk "page shows questions again"       "$([ "$OPENQ" -ge 1 ] && echo 1 || echo 0)" "1"
chk "unclaimed code untouched"         "$(curl -s -o /dev/null -w '%{http_code}' --max-time 45 "$B/api/quiz?code=0C1S-8MAD")" "200"

echo
echo "  $PASS passed, $FAIL failed"
rm -f owner.jar stranger.jar
[ "$FAIL" -eq 0 ] || exit 1
