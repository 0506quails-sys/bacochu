const t = (key, vars) => window.i18n.t(key, vars);
const currentLocale = () => ({ ko: "ko-KR", en: "en-US", ja: "ja-JP", "zh-CN": "zh-CN" })[window.i18n.language];
const menuButtons = document.querySelectorAll("[data-menu]");
const statusMessage = document.querySelector("#status-message");
const form = document.querySelector("#preference-form");
const formMessage = document.querySelector("#form-message");
const resultContainer = document.querySelector("#course-result");
const STORAGE_KEY = "bacochu-shared-courses";
const LIKES_STORAGE_KEY = "bacochu-course-likes";
const FAVORITES_STORAGE_KEY = "bacochu-course-favorites-v1";
const COMMENTS_STORAGE_KEY = "bacochu-course-comments-v1";
const COMMENT_AUTHOR_STORAGE_KEY = "bacochu-comment-author-id";
const sharedCourseList = document.querySelector("#shared-course-list");
const sharedCourseDetail = document.querySelector("#shared-course-detail");
const courseForm = document.querySelector("#course-form");
const courseFormMessage = document.querySelector("#course-form-message");
const placeCountSelect = document.querySelector("#place-count");
const placeCountDisplay = document.querySelector("#place-count-display");
const placeInputs = document.querySelector("#place-inputs");
const eventMonth = document.querySelector("#event-month");
const eventYear = document.querySelector("#event-year");
const eventList = document.querySelector("#event-list");
const eventDetail = document.querySelector("#event-detail");
let selectedEventType = "전체";
let selectedSharedCourseId = null;
let selectedCourseFilter = "all";

// Firestore 스냅샷은 localStorage와 별도로 보관합니다. 이전 브라우저 데이터는
// 마이그레이션하거나 지우지 않고 화면을 그릴 때만 서버 데이터와 합칩니다.
let firestoreCourses = [];
let firestoreCommentsByCourse = new Map();
let firestoreLikeUidsByCourse = new Map();
let firestoreUserId = null;
let firestoreAuthState = "loading";
let courseSubmissionPromise = null;

const { normalizeFestival, filterFestivals } = window.BacochuFestivalUtils;
const EVENT_DATA_URL = new URL("festivals.json", document.baseURI).href;
const EVENT_CATEGORY_LABELS = Object.freeze({ festival: "축제", performance: "공연", exhibition: "전시", experience: "체험" });
let officialFestivals = null;
let festivalLoadState = "idle";
let festivalLoadPromise = null;

const sampleSharedCourses = [
  { id: "sample-1", title: "다대포 노을 따라 걷는 하루", author: "노을수집가", beach: "다대포해수욕장", places: ["아미산전망대", "고우니생태길", "다대포해수욕장"], duration: "약 4시간", companion: "친구", mood: "사진 촬영", description: "낙동강과 바다가 만나는 풍경부터 붉은 노을까지 차례로 만나는 코스예요. 해 질 무렵 다대포에 도착하면 멋진 사진을 남길 수 있어 추천해요." },
  { id: "sample-2", title: "영도 바다 쉼표 코스", author: "부산갈매기", beach: "영도 바다", places: ["흰여울문화마을", "절영해안산책로", "태종대"], duration: "약 5시간", companion: "가족", mood: "휴식", description: "골목과 해안 산책로를 천천히 걸으며 부산다운 바다를 즐겨요. 볼거리와 쉬어 갈 곳이 많아 가족과 여유롭게 다녀오기 좋아요." }
];

const sampleSharedCourseIds = new Set(sampleSharedCourses.map((course) => String(course.id)));

function getCourseManagementCredentials(course) {
  // 이전 버전에서 사용했을 수 있는 속성명도 읽되, 새 데이터는 아래의 표준 속성명으로만 저장합니다.
  const passwordHash = course.passwordHash || course.adminPasswordHash;
  const passwordSalt = course.passwordSalt || course.adminPasswordSalt;
  return passwordHash && passwordSalt ? { passwordHash, passwordSalt } : null;
}

function isUserCreatedCourse(course) {
  if (!course || sampleSharedCourseIds.has(String(course.id))) return false;

  // 구분값이 없던 기존 코스도 관리 비밀번호 해시가 있다면 사용자가 등록한 코스로 복구합니다.
  return course.isUserCreated === true || Boolean(getCourseManagementCredentials(course));
}

function getLocalSharedCourses() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // 손상된 항목 하나 때문에 목록 전체가 멈추지 않도록 표시 가능한 객체만 읽습니다.
    // 원본 localStorage는 호환성과 복구 가능성을 위해 여기에서 덮어쓰지 않습니다.
    if (Array.isArray(saved)) return saved.filter((course) => course && typeof course === "object" && course.id != null);
  } catch (error) {
    console.warn("저장된 코스를 불러오지 못했습니다.", error);
  }
  if (localStorage.getItem(STORAGE_KEY) === null) localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleSharedCourses));
  return [...sampleSharedCourses];
}

function mergeItemsById(primaryItems, secondaryItems) {
  const merged = new Map();
  secondaryItems.forEach((item) => {
    if (item && item.id != null) merged.set(String(item.id), item);
  });
  // primary의 항목을 나중에 넣어 같은 ID가 두 저장소에 있어도 한 번만 표시합니다.
  primaryItems.forEach((item) => {
    if (item && item.id != null) merged.set(String(item.id), item);
  });
  return [...merged.values()];
}

function getSharedCourses() {
  // 로컬 코스를 우선하여 예전 관리 비밀번호 메타데이터와 삭제 호환성을 유지합니다.
  return mergeItemsById(getLocalSharedCourses(), firestoreCourses);
}

function saveSharedCourses(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// 기존 브라우저 좋아요는 Firestore 연결 뒤에도 원본 localStorage에 그대로 보관합니다.
function getCourseLikes() {
  try {
    const saved = JSON.parse(localStorage.getItem(LIKES_STORAGE_KEY));
    if (saved && typeof saved === "object" && !Array.isArray(saved)) return saved;
  } catch (error) {
    console.warn("저장된 좋아요를 불러오지 못했습니다.", error);
  }
  return {};
}

function getCourseLike(courseId) {
  const saved = getCourseLikes()[String(courseId)];
  const liked = saved?.liked === true;
  // 한 브라우저에서 한 번만 누를 수 있으므로 손상되거나 이전 형식인 개수도 0 또는 1로 정규화합니다.
  const remoteUids = firestoreLikeUidsByCourse.get(String(courseId)) || new Set();
  const remoteLiked = Boolean(firestoreUserId && remoteUids.has(firestoreUserId));
  // 로그인 사용자의 Firestore 좋아요가 있으면 같은 브라우저의 기존 좋아요를
  // 별도의 1개로 더하지 않습니다. UID를 모를 때만 로컬 좋아요를 한 번 보탭니다.
  const localContribution = liked && !remoteLiked ? 1 : 0;
  return { liked: liked || remoteLiked, count: remoteUids.size + localContribution };
}

function toggleCourseLike(courseId) {
  const id = String(courseId);
  const likes = getCourseLikes();
  const current = getCourseLike(id);
  const liked = !current.liked;
  likes[id] = { liked, count: liked ? 1 : 0 };
  localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));
}

function removeCourseLike(courseId) {
  const likes = getCourseLikes();
  delete likes[String(courseId)];
  localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(likes));
}

// 즐겨찾기는 로그인 계정이나 Firebase가 아니라 현재 브라우저에만 저장되며 다른 기기와 동기화되지 않습니다.
function getCourseFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY));
    if (saved?.version === 1 && Array.isArray(saved.courseIds)) {
      return new Set(saved.courseIds.filter((id) => typeof id === "string" || typeof id === "number").map(String));
    }
  } catch (error) {
    console.warn("저장된 즐겨찾기를 불러오지 못했습니다.", error);
  }
  return new Set();
}

function saveCourseFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ version: 1, courseIds: [...favorites] }));
    return true;
  } catch (error) {
    console.warn("즐겨찾기를 저장하지 못했습니다.", error);
    return false;
  }
}

function isCourseFavorite(courseId) {
  return getCourseFavorites().has(String(courseId));
}

function toggleCourseFavorite(courseId) {
  const id = String(courseId);
  const favorites = getCourseFavorites();
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  saveCourseFavorites(favorites);
}

function removeCourseFavorite(courseId) {
  const favorites = getCourseFavorites();
  favorites.delete(String(courseId));
  saveCourseFavorites(favorites);
}

// 기존 브라우저 댓글은 자동 업로드하지 않고 별도 localStorage 영역에 계속 저장합니다.
function getCommentStore() {
  try {
    const saved = JSON.parse(localStorage.getItem(COMMENTS_STORAGE_KEY));
    if (saved?.version === 1 && saved.byCourse && typeof saved.byCourse === "object" && !Array.isArray(saved.byCourse)) return saved;
  } catch (error) {
    console.warn("저장된 댓글을 불러오지 못했습니다.", error);
  }
  return { version: 1, byCourse: {} };
}

function saveCommentStore(store) {
  try {
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch (error) {
    console.warn("댓글을 저장하지 못했습니다.", error);
    return false;
  }
}

function getLocalCourseComments(store, courseId) {
  const id = String(courseId);
  const comments = store.byCourse[id];
  return Array.isArray(comments) ? comments.filter((comment) => comment && typeof comment === "object") : [];
}

function getCourseComments(store, courseId) {
  const id = String(courseId);
  const localComments = getLocalCourseComments(store, id);
  const remoteComments = firestoreCommentsByCourse.get(id) || [];
  // localStorage 항목을 우선해 기존 작성자 식별값과 로컬 삭제 기능을 보존합니다.
  return mergeItemsById(localComments, remoteComments);
}

function applyFirestoreSnapshot({ courses = [], commentsByCourse = {}, likeUidsByCourse = {}, userId = null } = {}) {
  firestoreCourses = Array.isArray(courses) ? courses.filter((course) => course && course.id != null) : [];
  firestoreCommentsByCourse = new Map(Object.entries(commentsByCourse).map(([courseId, comments]) => [String(courseId), Array.isArray(comments) ? comments : []]));
  firestoreLikeUidsByCourse = new Map(Object.entries(likeUidsByCourse).map(([courseId, uids]) => [String(courseId), new Set(Array.isArray(uids) ? uids.map(String) : [])]));
  firestoreUserId = userId == null ? null : String(userId);
  renderSharedCourses();
  if (selectedSharedCourseId && !document.querySelector("#course-detail-screen").hidden) openCourseDetail(selectedSharedCourseId);
}

function setFirestoreUser(userId) {
  firestoreUserId = userId == null ? null : String(userId);
  renderSharedCourses();
}

function renderCourseAuthState() {
  const submit = courseForm.querySelector('[type="submit"]');
  if (!submit || courseSubmissionPromise) return;
  // 로딩 중 클릭은 제출 핸들러가 공유 인증 Promise를 기다리므로 허용합니다.
  submit.disabled = firestoreAuthState === "error";
  if (firestoreAuthState === "loading") courseFormMessage.textContent = t("익명 로그인을 준비하고 있습니다.");
  else if (firestoreAuthState === "error") {
    courseFormMessage.innerHTML = `${escapeHtml(t("로그인에 실패했습니다. 다시 시도해 주세요."))} <button type="button" class="inline-retry" data-retry-auth>${escapeHtml(t("다시 시도"))}</button>`;
  } else if (courseFormMessage.dataset.authMessage === "true") courseFormMessage.textContent = "";
  courseFormMessage.dataset.authMessage = String(firestoreAuthState !== "ready");
}

function setFirestoreAuthState(state) {
  firestoreAuthState = state;
  renderCourseAuthState();
}

function applyFirestoreCourses(courses) {
  firestoreCourses = Array.isArray(courses) ? courses.filter((course) => course && course.id != null) : [];
  renderSharedCourses();
  if (selectedSharedCourseId && !document.querySelector("#course-detail-screen").hidden) openCourseDetail(selectedSharedCourseId);
}

// Firestore 연결 코드는 스냅샷 결과를 이 함수로 전달합니다. 이 경계 덕분에
// 서버 동기화가 localStorage를 삭제하거나 기존 데이터를 자동 업로드하지 않습니다.
window.bacochuFirestore = {
  applySnapshot: applyFirestoreSnapshot,
  applyCourses: applyFirestoreCourses,
  setUser: setFirestoreUser,
  setAuthState: setFirestoreAuthState,
  waitForAuth: null,
  retryAuth: null,
  createCourse: null,
  deleteCourse: null
};

function createLocalId(prefix) {
  if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  const bytes = crypto.getRandomValues(new Uint32Array(4));
  return `${prefix}-${Array.from(bytes, (value) => value.toString(16)).join("")}`;
}

function getCommentAuthorId() {
  try {
    const saved = localStorage.getItem(COMMENT_AUTHOR_STORAGE_KEY);
    if (saved) return saved;
    const authorId = createLocalId("browser");
    localStorage.setItem(COMMENT_AUTHOR_STORAGE_KEY, authorId);
    return authorId;
  } catch (error) {
    // 로그인 대신 쓰는 임의 식별값일 뿐 실제 사용자 인증이나 보안 기능이 아닙니다.
    console.warn("댓글 작성자 식별값을 저장하지 못했습니다.", error);
    return "browser-storage-unavailable";
  }
}

function removeCourseComments(courseId) {
  const store = getCommentStore();
  delete store.byCourse[String(courseId)];
  saveCommentStore(store);
}

function likeButtonMarkup(courseId) {
  const { liked, count } = getCourseLike(courseId);
  const action = liked ? t("좋아요 취소") : t("좋아요");
  return `<button class="like-button${liked ? " is-liked" : ""}" type="button" data-like-course="${escapeHtml(courseId)}" aria-label="${action}, 현재 ${count}개" aria-pressed="${liked}"><span class="like-button__heart" aria-hidden="true">${liked ? "♥" : "♡"}</span><span class="like-button__count" aria-hidden="true">${count}</span></button>`;
}

function favoriteButtonMarkup(courseId) {
  const saved = isCourseFavorite(courseId);
  const label = saved ? t("즐겨찾기 해제") : t("즐겨찾기 저장");
  return `<button class="favorite-button${saved ? " is-saved" : ""}" type="button" data-favorite-course="${escapeHtml(courseId)}" aria-label="${label}" aria-pressed="${saved}"><svg class="favorite-button__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.75 3.75h10.5v16.5L12 16.5l-5.25 3.75V3.75Z" /></svg><span>${saved ? t("저장됨") : t("즐겨찾기")}</span></button>`;
}

function createPasswordSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function normalizePlaces(course) {
  const source = Array.isArray(course?.places) ? course.places : [course?.place1, course?.place2, course?.place3];
  return source.slice(0, 6).map((place) => {
    if (typeof place === "string") return { name: place.trim(), description: "", address: "" };
    if (!place || typeof place !== "object") return null;
    return {
      name: String(place.name ?? place.title ?? "").trim(),
      description: String(place.description ?? place.detail ?? "").trim(),
      address: String(place.address ?? "").trim()
    };
  }).filter((place) => place?.name);
}

function placeCardMarkup(index, values = {}) {
  const number = index + 1;
  return `<article class="place-input-card" data-place-index="${index}">
    <div class="place-input-card__heading"><span>${number}</span><strong>${number}번째 장소</strong></div>
    <label for="place-name-${index}">장소명 <span aria-hidden="true">*</span></label>
    <input id="place-name-${index}" name="placeName${index}" type="text" maxlength="60" required value="${escapeHtml(values.name || "")}" placeholder="예: 흰여울문화마을" />
    <label for="place-description-${index}">장소 설명 <span aria-hidden="true">*</span></label>
    <textarea id="place-description-${index}" name="placeDescription${index}" rows="3" maxlength="300" required placeholder="이 장소에서 무엇을 즐길 수 있는지 알려주세요.">${escapeHtml(values.description || "")}</textarea>
    <label for="place-address-${index}">주소 <span aria-hidden="true">*</span></label>
    <input id="place-address-${index}" name="placeAddress${index}" type="text" maxlength="120" required value="${escapeHtml(values.address || "")}" placeholder="예: 부산 영도구 영선동4가" />
  </article>`;
}

function getDraftPlaces() {
  return [...placeInputs.querySelectorAll(".place-input-card")].map((card) => ({
    name: card.querySelector('[name^="placeName"]').value,
    description: card.querySelector('[name^="placeDescription"]').value,
    address: card.querySelector('[name^="placeAddress"]').value
  }));
}

function setPlaceCount(nextCount, { confirmRemoval = true } = {}) {
  const currentPlaces = getDraftPlaces();
  const count = Math.max(1, Math.min(6, Number(nextCount) || 1));
  if (count < currentPlaces.length && confirmRemoval) {
    const removedHasContent = currentPlaces.slice(count).some((place) => Object.values(place).some((value) => value.trim()));
    if (removedHasContent && !window.confirm(t("작성한 장소 정보가 삭제됩니다. 줄이시겠습니까?"))) {
      placeCountSelect.value = String(currentPlaces.length);
      return false;
    }
  }
  placeInputs.innerHTML = Array.from({ length: count }, (_, index) => placeCardMarkup(index, currentPlaces[index])).join("");
  placeCountSelect.value = String(count);
  placeCountDisplay.value = t("총 {count}개의 장소", { count });
  window.i18n.apply(placeInputs);
  document.querySelector("[data-place-decrease]").disabled = count === 1;
  document.querySelector("[data-place-increase]").disabled = count === 6;
  return true;
}

// 서버 없이도 바로 시험해 볼 수 있는 부산 바다 코스 예시 데이터입니다.
const courses = [
  { name: "영도 고요한 바다 산책", tags: ["quiet", "solo", "walk"], time: "약 3시간", places: [["흰여울문화마을", "바다 절벽을 따라 걷는 골목"], ["절영해안산책로", "파도 소리를 듣는 해안 산책"], ["태종대", "숲과 바다가 만나는 전망대"]], reason: "한적한 해안길과 탁 트인 전망이 이어져 천천히 쉬며 걷고 싶은 여행자에게 잘 맞아요." },
  { name: "광안리 맛있는 하루", tags: ["lively", "friends", "food"], time: "약 4시간", places: [["민락수변공원", "바다를 보며 여는 여정"], ["민락회타운", "싱싱한 부산 해산물 맛보기"], ["광안리해수욕장", "광안대교 야경과 카페 거리"]], reason: "친구와 부산의 맛을 즐기고 활기찬 해변과 야경까지 한 번에 만나기 좋은 코스예요." },
  { name: "송정 바다 모험 코스", tags: ["lively", "family", "sea"], time: "약 5시간", places: [["송정해수욕장", "초보자도 즐기기 좋은 바다"], ["해운대 블루라인파크", "해변열차로 보는 해안 풍경"], ["청사포 다릿돌전망대", "바다 위를 걷는 특별한 체험"]], reason: "즐길 거리와 편안한 이동이 어우러져 가족과 함께 신나는 바다 체험을 하기 좋아요." },
  { name: "청사포 인생 사진 여행", tags: ["photo", "friends", "walk"], time: "약 3시간 30분", places: [["미포철길", "바다 옆 감성 철길"], ["청사포 등대", "빨간 등대가 만드는 포토 스팟"], ["다릿돌전망대", "푸른 바다 위 파노라마"]], reason: "걷는 곳마다 부산다운 색과 바다 풍경이 펼쳐져 소중한 사람과 사진을 남기기에 좋아요." },
  { name: "다대포 노을 쉼표", tags: ["quiet", "family", "photo"], time: "약 4시간", places: [["아미산전망대", "낙동강 모래섬 풍경"], ["다대포 꿈의 낙조분수", "가족이 함께 즐기는 볼거리"], ["다대포해수욕장", "넓은 백사장과 황금빛 노을"]], reason: "여유로운 공간에서 가족과 쉬면서 부산 최고의 노을을 사진으로 담을 수 있어요." },
  { name: "기장 바다 미식 드라이브", tags: ["quiet", "solo", "food"], time: "약 4시간 30분", places: [["죽성성당", "바다 곁 이국적인 풍경"], ["대변항", "기장의 신선한 해산물"], ["오랑대공원", "조용히 파도를 보는 쉼터"]], reason: "복잡함을 벗어나 바다 풍경과 기장의 싱싱한 먹거리를 느긋하게 즐길 수 있어요." }
];

const SCREEN_IDS = new Set([...document.querySelectorAll(".screen")].map((screen) => screen.id));

function showScreen(id, { historyMode = "push" } = {}) {
  const targetId = SCREEN_IDS.has(id) ? id : "home-screen";
  document.querySelectorAll(".screen").forEach((screen) => {
    const active = screen.id === targetId;
    screen.classList.toggle("screen--active", active);
    screen.hidden = !active;
  });
  const state = { ...(history.state || {}), bacochuScreen: targetId };
  if (historyMode === "replace") history.replaceState(state, "", location.href);
  else if (historyMode === "push" && history.state?.bacochuScreen !== targetId) history.pushState(state, "", location.href);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

window.addEventListener("popstate", (event) => {
  const targetId = SCREEN_IDS.has(event.state?.bacochuScreen) ? event.state.bacochuScreen : "home-screen";
  if (targetId === "event-screen") prepareEvents({ resetFilters: false });
  showScreen(targetId, { historyMode: "none" });
  if (targetId === "weather-screen") prepareWeather();
});
showScreen("home-screen", { historyMode: "replace" });

// 버튼을 누르면 어떤 메뉴를 선택했는지 안내합니다.
menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.screenTarget;
    if (target === "event-screen") {
      openEvents();
    } else if (target === "weather-screen") {
      openWeather();
    } else if (SCREEN_IDS.has(target)) {
      showScreen(target);
    }
  });
});

document.querySelector("[data-back]").addEventListener("click", () => showScreen("home-screen"));
document.querySelector("[data-back-to-form]").addEventListener("click", () => showScreen("preference-screen"));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const answers = new FormData(form);
  const selections = [answers.get("mood"), answers.get("companion"), answers.get("activity")];
  if (selections.some((value) => !value)) {
    formMessage.textContent = t("여행 취향 세 항목을 모두 선택해 주세요.");
    return;
  }

  formMessage.textContent = "";
  const course = courses.map((item) => ({ item, score: item.tags.filter((tag) => selections.includes(tag)).length }))
    .sort((a, b) => b.score - a.score)[0].item;
  resultContainer.innerHTML = `
    <p class="result-intro">BACOCU'S PICK</p>
    <h1 id="result-title" class="course-name">${course.name}</h1>
    <p class="course-summary">⏱ 예상 소요 시간 ${course.time}</p>
    <div class="course-places" aria-label="추천 장소 3곳">${course.places.map((place, index) => `
      <article class="place-card"><span class="place-number">${index + 1}</span><div><strong>${place[0]}</strong><small>${place[1]}</small></div></article>`).join("")}
    </div>
    <section class="reason-card"><h3>💡 이 코스를 추천하는 이유</h3><p>${course.reason}</p></section>`;
  showScreen("result-screen");
});

document.querySelector("#restart-button").addEventListener("click", () => {
  form.reset();
  formMessage.textContent = "";
  showScreen("preference-screen");
});

function renderSharedCourses() {
  const favorites = getCourseFavorites();
  const coursesToShow = getSharedCourses().filter((course) => selectedCourseFilter !== "favorites" || favorites.has(String(course.id)));
  if (!coursesToShow.length && selectedCourseFilter === "favorites") {
    sharedCourseList.innerHTML = `<div class="favorite-empty"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.75 3.75h10.5v16.5L12 16.5l-5.25 3.75V3.75Z" /></svg><strong>아직 즐겨찾기한 코스가 없습니다.</strong><p>마음에 드는 코스의 북마크 버튼을 눌러 저장해보세요!</p></div>`;
    return;
  }
  sharedCourseList.innerHTML = coursesToShow.map((course) => `
    <article class="shared-course-card" data-course-card="${escapeHtml(course.id)}">
      <button class="shared-course-card__open" type="button" data-course-id="${escapeHtml(course.id)}" aria-label="${escapeHtml(course.title)} 상세 보기">
        <span class="shared-course-card__top"><span><span class="tag">${escapeHtml(course.beach)}</span><span class="shared-course-card__title">${escapeHtml(course.title)}</span></span><span aria-hidden="true">→</span></span>
        <span class="tag">${escapeHtml(course.mood)}</span> <span class="tag">${escapeHtml(course.companion)}와 함께</span>
        <span class="shared-course-card__meta">✍️ ${escapeHtml(course.author)} · ⏱ ${escapeHtml(course.duration)}</span>
      </button>
      <div class="shared-course-card__actions">${favoriteButtonMarkup(course.id)}${likeButtonMarkup(course.id)}</div>
    </article>`).join("");
  window.i18n.apply(sharedCourseList);
}

function openCourseDetail(id) {
  const course = getSharedCourses().find((item) => String(item.id) === String(id));
  if (!course) return;
  selectedSharedCourseId = String(course.id);
  const canDeleteCourse = (course.source === "firestore" && course.ownerUid === firestoreUserId)
    || (isUserCreatedCourse(course) && Boolean(getCourseManagementCredentials(course)));
  const places = normalizePlaces(course);
  sharedCourseDetail.innerHTML = `
    <p class="result-intro">TRAVELER'S COURSE</p><h1 id="detail-title" class="course-name">${escapeHtml(course.title)}</h1>
    <p class="detail-meta">✍️ ${escapeHtml(course.author)} · ⏱ ${escapeHtml(course.duration)}</p>
    <div class="detail-actions">${favoriteButtonMarkup(course.id)}${likeButtonMarkup(course.id)}</div>
    <div class="detail-tags"><span class="tag">🌊 ${escapeHtml(course.beach)}</span><span class="tag">👥 ${escapeHtml(course.companion)}</span><span class="tag">✨ ${escapeHtml(course.mood)}</span></div>
    <section class="detail-section"><h2>📍 방문 장소 ${places.length}곳</h2>${places.length ? `<ol class="detail-places">${places.map((place) => `<li><div><strong>${escapeHtml(place.name)}</strong>${place.description ? `<p>${escapeHtml(place.description)}</p>` : ""}${place.address ? `<address>${escapeHtml(place.address)}</address>` : ""}</div></li>`).join("")}</ol>` : '<p class="detail-place-empty">표시할 장소 정보가 없습니다.</p>'}</section>
    <section class="detail-section"><h2>💡 코스 소개와 추천 이유</h2><p>${escapeHtml(course.description)}</p></section>
    <section class="comments" aria-labelledby="comments-title">
      <div class="comments__heading"><h2 id="comments-title">댓글</h2><strong id="comment-count"></strong></div>
      <p class="comments__local-guide">댓글은 현재 이 브라우저에만 저장되며 다른 이용자와 공유되지 않습니다.</p>
      <form id="comment-form" class="comment-form" novalidate>
        <label for="comment-nickname">별명</label>
        <div class="comment-field"><input id="comment-nickname" name="nickname" type="text" maxlength="20" required autocomplete="nickname" aria-describedby="nickname-count" /><span id="nickname-count" class="character-count">0 / 20</span></div>
        <label for="comment-content">댓글 내용</label>
        <div class="comment-field"><textarea id="comment-content" name="content" rows="4" maxlength="300" required aria-describedby="content-count comment-shortcut"></textarea><span id="content-count" class="character-count">0 / 300</span></div>
        <small id="comment-shortcut" class="comment-shortcut">Ctrl 또는 ⌘ + Enter로도 등록할 수 있어요.</small>
        <p id="comment-message" class="comment-message" role="status" aria-live="polite"></p>
        <button class="comment-submit" type="submit" aria-label="댓글 등록하기">댓글 등록</button>
      </form>
      <div id="comment-list" class="comment-list" aria-live="polite"></div>
    </section>
    ${canDeleteCourse ? '<div class="course-management"><button class="delete-course-button" type="button" data-delete-course>코스 삭제</button><p class="delete-message" role="alert" aria-live="assertive"></p></div>' : ""}`;
  window.i18n.apply(sharedCourseDetail);
  renderComments(course.id);
  showScreen("course-detail-screen");
}

function renderComments(courseId, message = "") {
  const list = sharedCourseDetail.querySelector("#comment-list");
  const count = sharedCourseDetail.querySelector("#comment-count");
  if (!list || !count) return;
  const validComments = getCourseComments(getCommentStore(), courseId);
  const authorId = getCommentAuthorId();
  count.textContent = `댓글 ${validComments.length}개`;
  list.replaceChildren();

  if (!validComments.length) {
    const empty = document.createElement("p");
    empty.className = "comment-empty";
    empty.textContent = t("아직 작성된 댓글이 없습니다. 첫 댓글을 남겨보세요!");
    list.append(empty);
  } else {
    [...validComments].sort((a, b) => Number(a.createdAt) - Number(b.createdAt)).forEach((comment) => {
      const card = document.createElement("article");
      card.className = "comment-card";
      const header = document.createElement("div");
      header.className = "comment-card__header";
      const meta = document.createElement("div");
      const nickname = document.createElement("strong");
      nickname.textContent = String(comment.nickname || "");
      const time = document.createElement("time");
      const date = new Date(comment.createdAt);
      time.dateTime = Number.isNaN(date.getTime()) ? "" : date.toISOString();
      time.textContent = Number.isNaN(date.getTime()) ? "작성 시각 정보 없음" : new Intl.DateTimeFormat(currentLocale(), { dateStyle: "medium", timeStyle: "short" }).format(date);
      meta.append(nickname, time);
      header.append(meta);
      // 이 브라우저 식별값 비교는 삭제 버튼 구분용일 뿐 실제 인증이나 보안 기능이 아닙니다.
      if (comment.authorId === authorId) {
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "comment-delete";
        deleteButton.dataset.deleteComment = String(comment.id);
        deleteButton.setAttribute("aria-label", `${nickname.textContent}님의 댓글 삭제`);
        deleteButton.textContent = t("삭제");
        header.append(deleteButton);
      }
      const content = document.createElement("p");
      // 사용자 입력은 innerHTML이 아닌 textContent로 출력해 HTML이나 스크립트가 실행되지 않게 합니다.
      content.textContent = String(comment.content || "");
      card.append(header, content);
      list.append(card);
    });
  }
  const status = sharedCourseDetail.querySelector("#comment-message");
  if (status) status.textContent = message;
}

sharedCourseDetail.addEventListener("click", async (event) => {
  const commentDeleteButton = event.target.closest("[data-delete-comment]");
  if (commentDeleteButton) {
    if (!window.confirm(t("이 댓글을 삭제하시겠습니까?"))) return;
    const store = getCommentStore();
    const courseId = String(selectedSharedCourseId);
    const comments = getLocalCourseComments(store, courseId);
    const authorId = getCommentAuthorId();
    const commentId = commentDeleteButton.dataset.deleteComment;
    const target = comments.find((comment) => String(comment.id) === commentId);
    if (!target || target.authorId !== authorId) {
      renderComments(courseId, "이 브라우저에서 작성한 댓글만 삭제할 수 있습니다.");
      return;
    }
    store.byCourse[courseId] = comments.filter((comment) => String(comment.id) !== commentId);
    renderComments(courseId, saveCommentStore(store) ? "댓글이 삭제되었습니다." : "댓글을 삭제하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.");
    return;
  }
  const likeButton = event.target.closest("[data-like-course]");
  if (likeButton) {
    toggleCourseLike(likeButton.dataset.likeCourse);
    renderSharedCourses();
    openCourseDetail(likeButton.dataset.likeCourse);
    return;
  }
  const favoriteButton = event.target.closest("[data-favorite-course]");
  if (favoriteButton) {
    toggleCourseFavorite(favoriteButton.dataset.favoriteCourse);
    renderSharedCourses();
    openCourseDetail(favoriteButton.dataset.favoriteCourse);
    return;
  }
  if (!event.target.closest("[data-delete-course]")) return;
  const remoteCourse = firestoreCourses.find((item) => String(item.id) === selectedSharedCourseId);
  if (remoteCourse) {
    if (remoteCourse.ownerUid !== firestoreUserId || typeof window.bacochuFirestore.deleteCourse !== "function") {
      sharedCourseDetail.querySelector(".delete-message").textContent = t("본인이 작성한 게시물만 삭제할 수 있습니다.");
      return;
    }
    if (!window.confirm(t("정말 이 코스를 삭제하시겠습니까?"))) return;
    try {
      await window.bacochuFirestore.deleteCourse(remoteCourse.id);
      showScreen("course-list-screen");
      showListNotice("코스가 삭제되었습니다");
    } catch (error) {
      console.error("Firestore 코스를 삭제하지 못했습니다.", error);
      sharedCourseDetail.querySelector(".delete-message").textContent = t("코스를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    return;
  }
  // 관리 비밀번호는 예전 localStorage 코스에만 적용합니다. Firestore 코스는
  // 반드시 서버 인증/보안 규칙으로 관리하며 이 경로에서 삭제하지 않습니다.
  const courses = getLocalSharedCourses();
  const course = courses.find((item) => String(item.id) === selectedSharedCourseId && isUserCreatedCourse(item));
  const credentials = getCourseManagementCredentials(course || {});
  if (!course || !credentials) return;

  const password = window.prompt(t("관리 비밀번호를 입력해 주세요."));
  if (password === null) return;
  const passwordHash = await hashPassword(password, credentials.passwordSalt);
  if (passwordHash !== credentials.passwordHash) {
    sharedCourseDetail.querySelector(".delete-message").textContent = t("관리 비밀번호가 일치하지 않습니다");
    return;
  }
  if (!window.confirm(t("정말 이 코스를 삭제하시겠습니까?"))) return;

  saveSharedCourses(courses.filter((item) => String(item.id) !== String(course.id)));
  removeCourseLike(course.id);
  removeCourseFavorite(course.id);
  removeCourseComments(course.id);
  renderSharedCourses();
  showScreen("course-list-screen");
  showListNotice("코스가 삭제되었습니다");
});

sharedCourseDetail.addEventListener("input", (event) => {
  if (event.target.matches("#comment-nickname")) sharedCourseDetail.querySelector("#nickname-count").textContent = `${event.target.value.length} / 20`;
  if (event.target.matches("#comment-content")) sharedCourseDetail.querySelector("#content-count").textContent = `${event.target.value.length} / 300`;
});

sharedCourseDetail.addEventListener("keydown", (event) => {
  if (event.target.matches("#comment-content") && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    sharedCourseDetail.querySelector("#comment-form")?.requestSubmit();
  }
});

sharedCourseDetail.addEventListener("submit", (event) => {
  if (!event.target.matches("#comment-form")) return;
  event.preventDefault();
  const nicknameInput = event.target.elements.nickname;
  const contentInput = event.target.elements.content;
  const nickname = nicknameInput.value.trim();
  const content = contentInput.value.trim();
  const message = sharedCourseDetail.querySelector("#comment-message");
  if (!nickname && !content) {
    message.textContent = t("별명과 댓글 내용을 모두 입력해 주세요.");
    nicknameInput.focus();
    return;
  }
  if (!nickname) {
    message.textContent = t("별명을 입력해 주세요.");
    nicknameInput.focus();
    return;
  }
  if (!content) {
    message.textContent = t("댓글 내용을 입력해 주세요.");
    contentInput.focus();
    return;
  }
  if (nickname.length > 20 || content.length > 300) {
    message.textContent = t("별명은 20자, 댓글은 300자 이내로 입력해 주세요.");
    return;
  }
  const courseId = String(selectedSharedCourseId);
  const store = getCommentStore();
  const comments = getLocalCourseComments(store, courseId);
  store.byCourse[courseId] = [...comments, { id: createLocalId("comment"), authorId: getCommentAuthorId(), nickname, content, createdAt: Date.now() }];
  if (!saveCommentStore(store)) {
    message.textContent = t("댓글을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.");
    return;
  }
  contentInput.value = "";
  sharedCourseDetail.querySelector("#content-count").textContent = "0 / 300";
  renderComments(courseId, "댓글이 등록되었습니다.");
});

function showListNotice(message) {
  let notice = document.querySelector("#course-list-notice");
  if (!notice) {
    notice = document.createElement("p");
    notice.id = "course-list-notice";
    notice.className = "list-notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    document.querySelector(".list-heading").after(notice);
  }
  notice.textContent = message;
}

document.querySelectorAll("[data-home]").forEach((button) => button.addEventListener("click", () => showScreen("home-screen")));
document.querySelectorAll("[data-back-share]").forEach((button) => button.addEventListener("click", () => showScreen("share-screen")));
document.querySelector("[data-back-list]").addEventListener("click", () => { renderSharedCourses(); showScreen("course-list-screen"); });
document.querySelector("[data-open-list]").addEventListener("click", () => { renderSharedCourses(); showScreen("course-list-screen"); });
document.querySelectorAll("[data-open-form]").forEach((button) => button.addEventListener("click", () => { courseFormMessage.textContent = ""; courseForm.reset(); setPlaceCount(1, { confirmRemoval: false }); renderCourseAuthState(); showScreen("course-form-screen"); }));
courseFormMessage.addEventListener("click", async (event) => {
  if (!event.target.closest("[data-retry-auth]") || typeof window.bacochuFirestore.retryAuth !== "function") return;
  try { await window.bacochuFirestore.retryAuth(); } catch (_) { /* firebase-client가 상태와 상세 로그를 처리합니다. */ }
});
sharedCourseList.addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-favorite-course]");
  if (favoriteButton) {
    event.stopPropagation();
    toggleCourseFavorite(favoriteButton.dataset.favoriteCourse);
    renderSharedCourses();
    return;
  }
  const likeButton = event.target.closest("[data-like-course]");
  if (likeButton) {
    event.stopPropagation();
    toggleCourseLike(likeButton.dataset.likeCourse);
    renderSharedCourses();
    return;
  }
  const openButton = event.target.closest("[data-course-id]");
  const card = event.target.closest("[data-course-card]");
  const courseId = openButton?.dataset.courseId || card?.dataset.courseCard;
  if (courseId) openCourseDetail(courseId);
});

document.querySelector(".course-list-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-course-filter]");
  if (!button) return;
  selectedCourseFilter = button.dataset.courseFilter;
  document.querySelectorAll("[data-course-filter]").forEach((item) => {
    const active = item === button;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  renderSharedCourses();
});

window.addEventListener("storage", (event) => {
  if (event.key === LIKES_STORAGE_KEY) {
    renderSharedCourses();
    if (selectedSharedCourseId && !document.querySelector("#course-detail-screen").hidden) openCourseDetail(selectedSharedCourseId);
  }
  if (event.key === FAVORITES_STORAGE_KEY) {
    renderSharedCourses();
    if (selectedSharedCourseId && !document.querySelector("#course-detail-screen").hidden) openCourseDetail(selectedSharedCourseId);
  }
  if (event.key === COMMENTS_STORAGE_KEY && selectedSharedCourseId && !document.querySelector("#course-detail-screen").hidden) renderComments(selectedSharedCourseId);
});

courseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (courseSubmissionPromise) return courseSubmissionPromise;
  if (!courseForm.checkValidity()) {
    const invalid = courseForm.querySelector(":invalid");
    const card = invalid?.closest(".place-input-card");
    const fieldLabel = invalid?.labels?.[0]?.textContent.trim().replace("*", "").trim();
    courseFormMessage.textContent = card ? `${Number(card.dataset.placeIndex) + 1}번째 장소의 ${fieldLabel} 항목을 작성해 주세요.` : "입력하지 않은 필수 항목이 있어요. 모든 항목을 확인해 주세요.";
    invalid?.focus();
    return;
  }
  const values = new FormData(courseForm);
  const places = getDraftPlaces().map((place) => ({ name: place.name.trim(), description: place.description.trim(), address: place.address.trim() }));
  const course = {
    isUserCreated: true,
    title: values.get("title").trim(), author: values.get("author").trim(), beach: values.get("beach"),
    places,
    duration: values.get("duration").trim(), companion: values.get("companion"), mood: values.get("mood"), description: values.get("description").trim()
  };
  const emptyPlaceIndex = places.findIndex((place) => !place.name || !place.description || !place.address);
  if ([course.title, course.author, course.duration, course.description].some((value) => !value) || emptyPlaceIndex >= 0) {
    courseFormMessage.textContent = emptyPlaceIndex >= 0 ? `${emptyPlaceIndex + 1}번째 장소의 모든 항목을 공백 없이 작성해 주세요.` : "공백만 입력할 수 없어요. 모든 항목을 내용으로 채워 주세요.";
    return;
  }
  const submit = courseForm.querySelector('[type="submit"]');
  courseSubmissionPromise = (async () => {
    try {
      submit.disabled = true;
      if (typeof window.bacochuFirestore.waitForAuth !== "function") throw Object.assign(new Error("Firebase가 준비되지 않았습니다."), { authFailure: true });
      courseFormMessage.textContent = t("익명 로그인을 준비하고 있습니다.");
      await window.bacochuFirestore.waitForAuth();
      courseFormMessage.textContent = t("코스를 등록하고 있습니다.");
      await window.bacochuFirestore.createCourse(course);
      courseForm.reset();
      setPlaceCount(1, { confirmRemoval: false });
      renderSharedCourses();
      showScreen("course-list-screen");
      showListNotice(t("코스가 등록되었습니다."));
    } catch (error) {
      console.error("코스 등록 흐름에 실패했습니다.", error);
      const authFailure = error.authFailure || firestoreAuthState === "error" || String(error.code || "").startsWith("auth/");
      courseFormMessage.textContent = t(authFailure ? "로그인에 실패했습니다. 다시 시도해 주세요." : "코스를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      courseSubmissionPromise = null;
      submit.disabled = firestoreAuthState === "error";
    }
  })();
  return courseSubmissionPromise;
});

placeCountSelect.addEventListener("change", () => setPlaceCount(placeCountSelect.value));
document.querySelector("[data-place-decrease]").addEventListener("click", () => setPlaceCount(Number(placeCountSelect.value) - 1));
document.querySelector("[data-place-increase]").addEventListener("click", () => setPlaceCount(Number(placeCountSelect.value) + 1));
setPlaceCount(1, { confirmRemoval: false });

getSharedCourses();

function eventStatus(item) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const today = `${value.year}-${value.month}-${value.day}`;
  if (item.endDate < today) return t("종료");
  if (item.startDate > today) return t("예정");
  return t("진행 중");
}

function formatFestivalDate(item) {
  const formatter = new Intl.DateTimeFormat(currentLocale(), { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Seoul" });
  const format = (date) => formatter.format(new Date(`${date}T00:00:00+09:00`));
  return item.startDate === item.endDate ? format(item.startDate) : `${format(item.startDate)} ~ ${format(item.endDate)}`;
}

function showEventMessage(key, { error = false, retry = false } = {}) {
  eventList.replaceChildren();
  const message = document.createElement("p");
  message.className = `event-empty${error ? " event-error" : ""}`;
  message.textContent = t(key);
  eventList.append(message);
  if (retry) {
    const button = document.createElement("button");
    button.className = "event-retry-button";
    button.type = "button";
    button.textContent = t("다시 시도");
    button.addEventListener("click", () => loadFestivals({ force: true }));
    eventList.append(button);
  }
}

function populateEventYears() {
  const years = [...new Set((officialFestivals || []).flatMap((item) => [item.startDate.slice(0, 4), item.endDate.slice(0, 4)]))].sort((a, b) => b.localeCompare(a));
  eventYear.replaceChildren(...years.map((year) => Object.assign(document.createElement("option"), { value: year, textContent: year })));
}

async function loadFestivals({ force = false } = {}) {
  if (!force && festivalLoadState === "loaded") return officialFestivals;
  if (!force && festivalLoadPromise) return festivalLoadPromise;
  festivalLoadState = "loading";
  showEventMessage("행사 정보를 불러오는 중입니다.");
  festivalLoadPromise = (async () => {
    try {
      const response = await fetch(EVENT_DATA_URL, { cache: "no-cache" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rawItems = await response.json();
      if (!Array.isArray(rawItems)) throw new TypeError("festival data is not an array");
      const validItems = [];
      rawItems.forEach((item, index) => {
        const normalized = normalizeFestival(item);
        if (normalized) validItems.push(normalized);
        else console.warn(`[월별 바다 행사] 잘못된 행사 데이터 제외 (index ${index})`, item);
      });
      officialFestivals = Object.freeze(validItems);
      festivalLoadState = "loaded";
      console.info(`[월별 바다 행사] 전체 ${rawItems.length}개, 유효 ${validItems.length}개`);
      populateEventYears();
      if (!eventYear.value && validItems.length) {
        eventYear.value = validItems[0].startDate.slice(0, 4);
        eventMonth.value = String(Number(validItems[0].startDate.slice(5, 7)));
      }
      renderEvents();
      return officialFestivals;
    } catch (error) {
      officialFestivals = null;
      festivalLoadState = "error";
      console.error("[월별 바다 행사] 행사 데이터 로딩 실패", error);
      showEventMessage("행사 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", { error: true, retry: true });
      return null;
    } finally {
      festivalLoadPromise = null;
    }
  })();
  return festivalLoadPromise;
}

function renderEvents() {
  if (festivalLoadState === "idle" || festivalLoadState === "loading") {
    showEventMessage("행사 정보를 불러오는 중입니다.");
    return;
  }
  if (festivalLoadState === "error" || !officialFestivals) {
    showEventMessage("행사 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.", { error: true, retry: true });
    return;
  }
  const items = filterFestivals(officialFestivals, eventYear.value, eventMonth.value, selectedEventType);
  console.info(`[월별 바다 행사] 필터 전 ${officialFestivals.length}개, 필터 후 ${items.length}개`, { year: eventYear.value, month: eventMonth.value, categoryId: selectedEventType });
  eventList.replaceChildren();
  if (!items.length) {
    showEventMessage("현재 공식 자료에서 확인된 행사가 없습니다.");
    return;
  }
  items.forEach((item) => {
    const card = document.createElement("button"); card.className = "event-card"; card.type = "button"; card.dataset.eventId = item.id;
    const heading = document.createElement("span"); heading.className = "event-card__heading";
    const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = `${t(EVENT_CATEGORY_LABELS[item.categoryId])} · ${eventStatus(item)}`;
    const arrow = document.createElement("span"); arrow.ariaHidden = "true"; arrow.textContent = "→"; heading.append(tag, arrow);
    const title = document.createElement("h2"); title.textContent = item.name;
    const meta = document.createElement("span"); meta.className = "event-card__meta";
    [`📅 ${formatFestivalDate(item)}`, `📍 ${item.place}`, `🌊 ${item.sea}`].forEach((value) => { const row = document.createElement("span"); row.textContent = value; meta.append(row); });
    const description = document.createElement("p"); description.className = "event-card__description"; description.textContent = item.description;
    card.append(heading, title, meta, description); eventList.append(card);
  });
}

async function prepareEvents({ resetFilters = true } = {}) {
  if (resetFilters) {
    selectedEventType = "all";
    document.querySelectorAll("[data-event-type]").forEach((button) => { const active = button.dataset.eventType === "all"; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
  }
  await loadFestivals();
}
function openEvents() { showScreen("event-screen"); prepareEvents(); }

function openEventDetail(id) {
  if (!officialFestivals) return;
  const item = officialFestivals.find((festival) => festival.id === id); if (!item) return;
  eventDetail.replaceChildren();
  const marker = document.createElement("span"); marker.hidden = true; marker.dataset.currentEvent = item.id;
  const intro = document.createElement("p"); intro.className = "result-intro"; intro.textContent = `${t("공식 축제 정보")} · ${eventStatus(item)}`;
  const title = document.createElement("h1"); title.id = "event-detail-title"; title.className = "event-detail-title"; title.textContent = item.name;
  const summary = document.createElement("p"); summary.className = "event-detail-summary"; summary.textContent = item.description;
  const grid = document.createElement("div"); grid.className = "event-detail-grid";
  [["날짜", formatFestivalDate(item)], ["장소", item.place], ["바다", item.sea], ["공식 출처", item.sourceName], ["자료 확인일", item.verifiedAt]].forEach(([label, value]) => { const row = document.createElement("p"); const strong = document.createElement("strong"); strong.textContent = t(label); row.append(strong, ` ${value}`); grid.append(row); });
  const source = document.createElement("a"); source.className = "event-source"; source.href = item.sourceUrl; source.target = "_blank"; source.rel = "noopener noreferrer"; source.textContent = t("공식 정보 확인");
  const notice = document.createElement("p"); notice.className = "event-notice"; notice.textContent = t("행사 일정은 변경될 수 있으므로 방문 전 공식 홈페이지를 확인해 주세요.");
  eventDetail.append(marker, intro, title, summary, grid, source, notice); showScreen("event-detail-screen");
}

eventYear.addEventListener("change", renderEvents);
eventMonth.addEventListener("change", renderEvents);
document.querySelector("#event-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-event-type]"); if (!button) return; selectedEventType = button.dataset.eventType;
  document.querySelectorAll("[data-event-type]").forEach((item) => { const active = item === button; item.classList.toggle("is-active", active); item.setAttribute("aria-pressed", String(active)); }); renderEvents();
});
eventList.addEventListener("click", (event) => { const card = event.target.closest("[data-event-id]"); if (card) openEventDetail(card.dataset.eventId); });
document.querySelector("[data-back-events]").addEventListener("click", () => showScreen("event-screen"));
document.querySelectorAll("[data-event-home]").forEach((button) => button.addEventListener("click", () => showScreen("home-screen")));

const BEACHES = Object.freeze([
  { id: "gwangalli", nameKey: "광안리해수욕장", shortKey: "광안리", latitude: 35.153169, longitude: 129.118666 },
  { id: "haeundae", nameKey: "해운대해수욕장", shortKey: "해운대", latitude: 35.158697, longitude: 129.160384 },
  { id: "songjeong", nameKey: "송정해수욕장", shortKey: "송정", latitude: 35.178617, longitude: 129.199713 },
  { id: "songdo", nameKey: "송도해수욕장", shortKey: "송도", latitude: 35.075876, longitude: 129.017917 },
  { id: "dadaepo", nameKey: "다대포해수욕장", shortKey: "다대포", latitude: 35.046588, longitude: 128.965517 },
  { id: "ilgwang", nameKey: "일광해수욕장", shortKey: "일광", latitude: 35.259631, longitude: 129.233054 },
  { id: "imrang", nameKey: "임랑해수욕장", shortKey: "임랑", latitude: 35.318259, longitude: 129.264155 }
]);
const WEATHER_SELECTION_KEY = "bacochu-selected-beach-v1";
const WEATHER_CACHE_KEY = "bacochu-beach-weather-cache-v1";
const WEATHER_CACHE_MS = 10 * 60 * 1000;
let selectedBeachId = (() => { try { const id = localStorage.getItem(WEATHER_SELECTION_KEY); return BEACHES.some((b) => b.id === id) ? id : "gwangalli"; } catch (_) { return "gwangalli"; } })();
const beachSelect = document.querySelector("#beach-select");
const detailRefresh = document.querySelector("#beach-weather-refresh");

function selectedBeach() { return BEACHES.find((beach) => beach.id === selectedBeachId) || BEACHES[0]; }
function weatherCodeInfo(code) {
  if (code === 0) return ["맑음", "☀️"];
  if ([1, 2, 3].includes(code)) return ["흐림", "☁️"];
  if ([45, 48].includes(code)) return ["안개", "🌫️"];
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67].includes(code)) return ["비", "🌧️"];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ["눈", "❄️"];
  if ([80, 81, 82].includes(code)) return ["소나기", "🌦️"];
  if ([95, 96, 99].includes(code)) return ["뇌우", "⛈️"];
  return ["알 수 없음", "🌡️"];
}
function validWeather(value) { return value && Number.isFinite(value.fetchedAt) && Number.isFinite(value.temperature) && Number.isFinite(value.apparent) && Number.isFinite(value.wind) && Number.isInteger(value.code); }
function readWeatherCache(id = selectedBeachId) { try { const store = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY)) || {}; return validWeather(store[id]) ? store[id] : null; } catch (_) { return null; } }
function saveWeatherCache(id, data) { try { const store = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY)) || {}; store[id] = data; localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(store)); } catch (_) {} }
function weatherTime(timestamp) { return new Intl.DateTimeFormat(currentLocale(), { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Seoul" }).format(timestamp); }

function displayWeather(data) {
  const beach = selectedBeach(); const [condition, icon] = weatherCodeInfo(data.code);
  document.querySelector("#beach-weather-icon").textContent = icon;
  document.querySelector("#beach-weather-status").textContent = t(condition);
  document.querySelector("#beach-weather-details").hidden = false;
  document.querySelector("#beach-temperature").textContent = `${data.temperature} °C`;
  document.querySelector("#beach-apparent").textContent = `${data.apparent} °C`;
  document.querySelector("#beach-condition").textContent = t(condition);
  document.querySelector("#beach-wind").textContent = `${data.wind} km/h`;
  document.querySelector("#beach-updated").textContent = weatherTime(data.fetchedAt);
}
function showWeatherError() {
  const message = t("현재 날씨 정보를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.");
  document.querySelector("#beach-weather-details").hidden = true; document.querySelector("#beach-weather-status").textContent = message;
}
async function loadWeather({ force = false } = {}) {
  const requestBeach = selectedBeach(); const cached = readWeatherCache(requestBeach.id);
  if (!force && cached && Date.now() - cached.fetchedAt < WEATHER_CACHE_MS) { displayWeather(cached); return; }
  detailRefresh.disabled = true;
  document.querySelector("#beach-weather-details").hidden = true;
  document.querySelector("#beach-weather-status").textContent = t("불러오는 중");
  const params = new URLSearchParams({ latitude: String(requestBeach.latitude), longitude: String(requestBeach.longitude), current: "temperature_2m,apparent_temperature,weather_code,wind_speed_10m", timezone: "Asia/Seoul", temperature_unit: "celsius", wind_speed_unit: "kmh" });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`); if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json(); const current = body.current; const units = body.current_units;
    if (!current || units?.temperature_2m !== "°C" || units?.apparent_temperature !== "°C" || units?.wind_speed_10m !== "km/h") throw new Error("Unexpected Open-Meteo response");
    const data = { fetchedAt: Date.now(), temperature: Number(current.temperature_2m), apparent: Number(current.apparent_temperature), wind: Number(current.wind_speed_10m), code: Number(current.weather_code) };
    if (!validWeather(data)) throw new Error("Invalid Open-Meteo values"); saveWeatherCache(requestBeach.id, data);
    if (selectedBeachId === requestBeach.id) displayWeather(data);
  } catch (error) { console.warn("Open-Meteo 날씨 요청에 실패했습니다.", error); if (selectedBeachId === requestBeach.id) showWeatherError(); }
  finally { detailRefresh.disabled = false; }
}
function updateBeachUI({ force = false } = {}) {
  const beach = selectedBeach(); try { localStorage.setItem(WEATHER_SELECTION_KEY, beach.id); } catch (_) {}
  beachSelect.value = beach.id; document.querySelector("#beach-weather-name").textContent = t(beach.nameKey);
  document.querySelectorAll("[data-beach-id]").forEach((button) => { const active = button.dataset.beachId === beach.id; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
  loadWeather({ force });
}
function selectBeach(id, options) { if (!BEACHES.some((b) => b.id === id)) return; selectedBeachId = id; updateBeachUI(options); }
function renderBeachControls() {
  beachSelect.replaceChildren(...BEACHES.map((beach) => { const option = document.createElement("option"); option.value = beach.id; option.textContent = t(beach.nameKey); return option; }));
  const shortcuts = document.querySelector("#beach-shortcuts"); shortcuts.replaceChildren(...BEACHES.map((beach) => { const button = document.createElement("button"); button.type = "button"; button.dataset.beachId = beach.id; button.textContent = t(beach.shortKey); return button; }));
}
function prepareWeather() {
  renderBeachControls();
  updateBeachUI();
}
function openWeather() { showScreen("weather-screen"); prepareWeather(); }
beachSelect.addEventListener("change", () => selectBeach(beachSelect.value));
document.querySelector("#beach-shortcuts").addEventListener("click", (event) => { const button = event.target.closest("[data-beach-id]"); if (button) selectBeach(button.dataset.beachId); });
detailRefresh.addEventListener("click", () => loadWeather({ force: true }));
document.querySelectorAll("[data-weather-home]").forEach((button) => button.addEventListener("click", () => showScreen("home-screen")));
renderBeachControls();
document.querySelector("#beach-weather-name").textContent = t(selectedBeach().nameKey);
window.addEventListener("bacochu:languagechange", () => {
  renderBeachControls(); const cached = readWeatherCache(); document.querySelector("#beach-weather-name").textContent = t(selectedBeach().nameKey); if (cached) displayWeather(cached); else showWeatherError();
  detailRefresh.textContent = `↻ ${t("새로고침")}`;
  renderSharedCourses(); if (selectedSharedCourseId && !document.querySelector("#course-detail-screen").hidden) openCourseDetail(selectedSharedCourseId);
  if (!document.querySelector("#event-screen").hidden) renderEvents(); const openEvent = eventDetail.querySelector("[data-current-event]")?.dataset.currentEvent; if (openEvent) openEventDetail(openEvent);
  setPlaceCount(placeCountSelect.value, { confirmRemoval: false });
  renderCourseAuthState();
});
