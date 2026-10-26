#!/bin/sh
# Runs every regression suite one at a time (several are timing-sensitive and fail when run in parallel).
# Usage: sh test/run_all.sh            -> prints "name exit-code" per suite, logs in test/logs/
cd "$(dirname "$0")/.." || exit 1
python3 build.py >/dev/null || exit 1
mkdir -p test/logs; fail=0
for t in anim announcer awards browser2 capsule ext features figures goalcap goalshots kickoff leaders legacy livefull load mixer multi pause postcap replay schedule season shootout sound spectate speech squad sync traits ui3 v10 v13 v7 v8 v8ui weather stage2 v17_start stage3d_smoke stage3d previews3d walkout3d punt polish touches sideline plates replay2 realism saves saves3d skills specials motion shots keeper2 goalnames crowd celebs cards; do
  to=600; case "$t" in realism|saves|saves3d|keeper2) to=1200;; specials|shots) to=1800;; esac
  timeout $to node "test/$t.js" > "test/logs/$t.log" 2>&1; c=$?; echo "$t $c"; [ "$c" -ne 0 ] && fail=1
done
exit $fail
