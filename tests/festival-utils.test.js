const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const utils = require("../festival-utils.js");

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "../festivals.json"), "utf8"));
const festivals = raw.map(utils.normalizeFestival).filter(Boolean);
assert.ok(festivals.length > 0, "official festival data must not be empty");
assert.equal(festivals.length, raw.length, "all stored festivals must be valid");
assert.deepEqual(utils.filterFestivals(festivals, "2025", "05", "festival").map((item) => item.id), ["haeundae-sand-2025"]);
assert.equal(utils.filterFestivals(festivals, 2025, 4, "all").length, 0);
assert.equal(utils.filterFestivals(festivals, 2025, 5, "performance").length, 0);
assert.equal(utils.filterFestivals(festivals, 2025, 5, "all").length, 1);

const spanning = utils.normalizeFestival({ ...raw[0], id: "span", startDate: "2025-05-31", endDate: "2025-06-01" });
assert.equal(utils.filterFestivals([spanning], 2025, 5).length, 1);
assert.equal(utils.filterFestivals([spanning], 2025, 6).length, 1);
assert.equal(utils.filterFestivals([spanning], 2025, 7).length, 0);
const oneDay = utils.normalizeFestival({ ...raw[0], id: "one-day", startDate: "2025-05-20", endDate: "" });
assert.equal(oneDay.endDate, "2025-05-20");
assert.equal(utils.normalizeFestival({ ...raw[0], startDate: "2025-02-30" }), null);
console.log(`festival checks passed: total=${festivals.length}, 2025-05/all=${utils.filterFestivals(festivals, 2025, 5).length}`);
