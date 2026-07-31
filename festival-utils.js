(function (root) {
  "use strict";

  const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
  const CATEGORY_IDS = new Set(["festival", "performance", "exhibition", "experience"]);

  function normalizeDate(value) {
    const match = typeof value === "string" ? DATE_PATTERN.exec(value.trim()) : null;
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return null;
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function normalizeFestival(item) {
    if (!item || typeof item !== "object") return null;
    const startDate = normalizeDate(item.startDate);
    const endDate = normalizeDate(item.endDate || item.startDate);
    const names = item.names || (item.name ? { ko: item.name, en: item.name, ja: item.name, zh: item.name } : null);
    if (!item.id || !names || !["ko", "en", "ja", "zh"].every((language) => typeof names[language] === "string" && names[language].trim()) || !item.place || !item.sea || !item.description || !item.sourceName || !item.sourceUrl || !item.verifiedAt || !item.scheduleNotice ||
        !startDate || !endDate || startDate > endDate || !CATEGORY_IDS.has(item.categoryId)) return null;
    return Object.freeze({ ...item, names: Object.freeze(names), startDate, endDate });
  }

  function extractYears(items) {
    const years = new Set();
    items.forEach((item) => {
      const start = normalizeDate(item?.startDate);
      const end = normalizeDate(item?.endDate || item?.startDate);
      if (!start || !end || start > end) return;
      for (let year = Number(start.slice(0, 4)); year <= Number(end.slice(0, 4)); year += 1) years.add(year);
    });
    return [...years].sort((a, b) => b - a);
  }

  function monthRange(yearValue, monthValue) {
    const year = Number(yearValue);
    const month = Number(monthValue);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return {
      start: `${year}-${String(month).padStart(2, "0")}-01`,
      end: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    };
  }

  function filterFestivals(items, year, month, categoryId = "all") {
    const range = monthRange(year, month);
    if (!range) return [];
    return items.filter((item) => item.startDate <= range.end && item.endDate >= range.start &&
      (categoryId === "all" || item.categoryId === categoryId));
  }

  const api = Object.freeze({ normalizeDate, normalizeFestival, extractYears, monthRange, filterFestivals, CATEGORY_IDS });
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BacochuFestivalUtils = api;
})(typeof window === "object" ? window : globalThis);
