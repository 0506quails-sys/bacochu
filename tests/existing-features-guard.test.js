const assert = require("node:assert/strict");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const root = require("node:path").resolve(__dirname, "..");
const baseline = "e902c02";
for (const file of ["firebase-client.js", "firebase-config.json", "firestore.rules", "festival-utils.js", "festivals.json"]) {
  const committed = execFileSync("git", ["show", `${baseline}:${file}`], { cwd: root });
  assert.deepEqual(fs.readFileSync(`${root}/${file}`), committed, `${file} must remain unchanged`);
}
const currentScript = fs.readFileSync(`${root}/script.js`, "utf8");
const baselineScript = execFileSync("git", ["show", `${baseline}:script.js`], { cwd: root, encoding: "utf8" });
function section(source, start, end) {
  const from = source.indexOf(start); const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `guard markers missing: ${start}`);
  return source.slice(from, to);
}
for (const [name, start, end] of [
  ["course registration", 'courseForm.addEventListener("submit"', 'document.querySelector("[data-place-decrease]")'],
  ["events", "function showEventMessage", "const WEATHER_CACHE_KEY"],
  ["weather", "const WEATHER_CACHE_KEY", 'window.addEventListener("bacochu:languagechange"']
]) assert.equal(section(currentScript, start, end), section(baselineScript, start, end), `${name} code must remain unchanged`);
console.log("existing Firebase, registration, events and weather guards: ok");
