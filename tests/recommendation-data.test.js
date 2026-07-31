const assert = require("node:assert/strict");
const fs = require("node:fs");
const { courses, recommend, localize, tagLabels, tagLabel } = require("../recommendation-data.js");
const languages = ["ko", "en", "ja", "zh-CN"];
const legacyIds = ["legacy-yeongdo-quiet", "legacy-gwangalli-food", "legacy-songjeong-adventure"];

assert.ok(courses.length >= 17, "the 14 new and at least 3 legacy courses must be recommendable");
const fullRecommendationPool = new Set(recommend({}, courses.length).map(({ item }) => item.id));
for (const id of legacyIds) assert.ok(fullRecommendationPool.has(id), `${id} must remain in the recommendation pool`);
assert.deepEqual([...new Set(courses.filter((course) => course.id.startsWith("rec-")).map((course) => course.beach))].sort(), ["dadaepo","gwangalli","haeundae","ilgwang","imrang","songdo","songjeong"]);
for (const course of courses) for (const field of [course.name, course.duration, course.timeLabel, course.reason, ...course.places]) for (const language of languages) assert.ok(localize(field, language));

const usedTags = new Set(courses.flatMap((course) => course.tags));
for (const tag of usedTags) {
  assert.ok(tagLabels[tag], `missing tag dictionary entry: ${tag}`);
  for (const language of languages) {
    const label = tagLabel(tag, language);
    assert.ok(label && label !== tag, `${tag} must have a human-readable ${language} label`);
  }
}
for (const language of languages) {
  const renderedTraits = courses.flatMap((course) => course.tags.slice(0, 5).map((tag) => tagLabel(tag, language)));
  for (const tag of usedTags) assert.ok(!renderedTraits.includes(tag), `raw tag ${tag} leaked into ${language} card labels`);
}
const script = fs.readFileSync(require.resolve("../script.js"), "utf8");
assert.match(script, /item\.tags\.slice\(0, 5\)\.map\(\(tag\) => escapeHtml\(tagLabel\(tag, language\)\)\)/, "result cards must use localized tag labels");

const quiet = recommend({ mood:"quiet", companion:"solo", activity:"walk", time:"morning", pace:"easy", view:"sunrise", crowd:"uncrowded" });
const lively = recommend({ mood:"lively", companion:"family", activity:"sea", time:"afternoon", pace:"many", view:"day-sea", crowd:"famous" });
assert.equal(quiet.length, 3); assert.equal(lively.length, 3);
assert.equal(new Set(quiet.map(({item}) => item.beach)).size, 3);
assert.notDeepEqual(quiet.map(({item}) => item.id), lively.map(({item}) => item.id));
console.log("recommendation data: ok");
