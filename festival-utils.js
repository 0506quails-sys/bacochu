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
    if (!item.id || !item.name || !item.place || !item.sourceName || !item.sourceUrl ||
        !startDate || !endDate || startDate > endDate || !CATEGORY_IDS.has(item.categoryId)) return null;
    return Object.freeze({ ...item, startDate, endDate });
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

  const api = Object.freeze({ normalizeDate, normalizeFestival, monthRange, filterFestivals, CATEGORY_IDS });
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BacochuFestivalUtils = api;
})(typeof window === "object" ? window : globalThis);
