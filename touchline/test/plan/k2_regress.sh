#!/bin/sh
# scratch runner (not part of the suite): the regression suites the v18.7 keeper unit must keep green, one at a time
cd "$(dirname "$0")/../.." || exit 1
mkdir -p test/logs
for t in "$@"; do s=$(date +%s); timeout 1200 node "test/$t.js" > "test/logs/$t.log" 2>&1; echo "$t $? $(( $(date +%s)-s ))s"; done
