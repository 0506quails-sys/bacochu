const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const utils = require("../festival-utils.js");

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, "../festivals.json"), "utf8"));
const festivals = raw.map(utils.normalizeFestival).filter(Boolean);
assert.ok(festivals.length > 0, "official festival data must not be empty");
assert.equal(festivals.length, raw.length, "all stored festivals must be valid");
assert.deepEqual(utils.extractYears(festivals), [2026, 2025]);
assert.ok(utils.filterFestivals(festivals, 2026, 8, "all").some((item) => item.id === "busan-sea-2026"));
assert.ok(utils.filterFestivals(festivals, 2026, 5, "all").some((item) => item.id === "haeundae-sand-2026"));
assert.deepEqual(new Set(utils.filterFestivals(festivals, 2026, 6, "all").map((item) => item.id)).has("gwangalli-eobang-2026"), true);
assert.deepEqual(new Set(utils.filterFestivals(festivals, 2026, 6, "all").map((item) => item.id)).has("busan-port-2026"), true);
assert.ok(utils.filterFestivals(festivals, 2026, 7, "experience").some((item) => item.id === "north-port-sup-2026"));
assert.ok(utils.filterFestivals(festivals, 2026, 8, "experience").some((item) => item.id === "north-port-sup-2026"));
assert.ok(utils.filterFestivals(festivals, 2025, 12, "exhibition").some((item) => item.id === "haeundae-light-2025-2026"));
assert.ok(utils.filterFestivals(festivals, 2026, 1, "exhibition").some((item) => item.id === "haeundae-light-2025-2026"));
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
for (const category of ["all", "festival", "performance", "exhibition", "experience"]) {
  assert.ok(utils.filterFestivals(festivals, 2026, 8, category).every((item) => category === "all" || item.categoryId === category));
}
console.log(`festival checks passed: total=${festivals.length}, years=${utils.extractYears(festivals).join(",")}`);
