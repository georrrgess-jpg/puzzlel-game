// v18.6 keeper saves, 3-D section (E of test/saves.js), split out so each suite stays well inside run_all's 600 s per-suite limit.
process.argv[2]='E'; require('./saves.js');
