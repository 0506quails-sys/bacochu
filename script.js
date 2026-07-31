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

// 외부 API와 연결하지 않은 기능 확인용 가상 행사 데이터입니다. 실제 개최가 확정된 행사가 아닙니다.
const sampleSeaEvents = [
  { id: "sea-jan", month: 1, name: "송정 새해 바다 산책 주간", date: "1월 2일 ~ 1월 8일", place: "송정해수욕장 안내광장", type: "체험", description: "겨울 바다를 천천히 걸으며 해변 생태 이야기를 듣는 가상 프로그램입니다.", sea: "송정해수욕장", audience: "가벼운 산책을 좋아하는 여행자", tip: "바닷바람을 막을 따뜻한 겉옷을 준비해 주세요.", directions: "동해선 송정역에서 도보로 이동하는 설정입니다." },
  { id: "sea-mar", month: 3, name: "영도 파도 사진 전시", date: "3월 9일 ~ 3월 24일", place: "흰여울 해안 갤러리(가상)", type: "전시", description: "영도 바다의 사계절을 사진으로 만나는 가상 전시입니다.", sea: "영도 바다", audience: "사진과 조용한 실내 관람을 즐기는 분", tip: "해안 산책로와 함께 둘러보는 코스를 추천합니다.", directions: "부산역에서 영도 방면 시내버스를 이용하는 설정입니다." },
  { id: "sea-apr", month: 4, name: "다대포 노을 음악회", date: "4월 20일", place: "다대포해수욕장 잔디광장", type: "공연", description: "노을과 함께 어쿠스틱 음악을 감상하는 가상 야외 공연입니다.", sea: "다대포해수욕장", audience: "가족, 친구와 노을을 즐기고 싶은 분", tip: "돗자리와 저녁 기온에 대비할 얇은 겉옷이 유용합니다.", directions: "도시철도 1호선 다대포해수욕장역에서 도보 이동하는 설정입니다." },
  { id: "sea-may", month: 5, name: "광안리 바다 공예 마켓", date: "5월 11일 ~ 5월 12일", place: "광안리 해변 산책로", type: "체험", description: "바다를 주제로 한 소품을 보고 간단한 만들기에 참여하는 가상 행사입니다.", sea: "광안리해수욕장", audience: "공예를 좋아하는 친구와 가족", tip: "체험별 운영 시간이 다르다는 가정이므로 현장 안내를 확인해 주세요.", directions: "도시철도 2호선 광안역에서 도보 이동하는 설정입니다." },
  { id: "sea-jun", month: 6, name: "송도 해변 문화 축제", date: "6월 15일 ~ 6월 16일", place: "송도해수욕장 중앙광장", type: "축제", description: "해변 놀이와 지역 문화를 함께 즐기는 가상 축제입니다.", sea: "송도해수욕장", audience: "다양한 해변 프로그램을 즐기고 싶은 분", tip: "햇빛을 피할 모자와 개인 물병을 준비해 주세요.", directions: "남포동에서 송도 방면 시내버스를 이용하는 설정입니다." },
  { id: "sea-jul-festival", month: 7, name: "해운대 여름 파도 축제", date: "7월 19일 ~ 7월 21일", place: "해운대해수욕장 이벤트광장", type: "축제", description: "여름 바다를 주제로 공연과 체험을 선보이는 가상 축제입니다.", sea: "해운대해수욕장", audience: "활기찬 여름 바다를 좋아하는 여행자", tip: "혼잡을 피하려면 대중교통을 이용하고 자외선 차단제를 준비해 주세요.", directions: "도시철도 2호선 해운대역에서 도보 이동하는 설정입니다." },
  { id: "sea-jul-show", month: 7, name: "광안대교 달빛 버스킹", date: "7월 27일", place: "민락수변공원 공연 구역(가상)", type: "공연", description: "광안대교 야경을 배경으로 즐기는 가상 소규모 공연입니다.", sea: "광안리해수욕장", audience: "야경과 라이브 음악을 좋아하는 분", tip: "관람석이 한정된 설정이므로 조금 일찍 도착해 주세요.", directions: "도시철도 2호선 광안역에서 해변 방향으로 이동하는 설정입니다." },
  { id: "sea-aug", month: 8, name: "일광 어린이 바다 탐험", date: "8월 10일", place: "일광해수욕장 체험 구역", type: "체험", description: "안전 교육과 모래 해변 관찰을 함께하는 가상 체험입니다.", sea: "일광해수욕장", audience: "보호자를 동반한 어린이", tip: "젖어도 되는 옷과 여벌 옷을 챙겨 주세요.", directions: "동해선 일광역에서 해수욕장까지 도보 이동하는 설정입니다." },
  { id: "sea-sep", month: 9, name: "기장 바다 이야기 전시", date: "9월 5일 ~ 9월 29일", place: "기장 해안문화공간(가상)", type: "전시", description: "기장 어촌과 해안의 이야기를 그림과 기록으로 소개하는 가상 전시입니다.", sea: "기장 바다", audience: "지역 문화와 기록에 관심 있는 분", tip: "주변 해안 산책 시간을 함께 계획해 보세요.", directions: "동해선 기장역에서 지역 버스로 환승하는 설정입니다." },
  { id: "sea-oct", month: 10, name: "다대포 갈대와 바다 축제", date: "10월 12일 ~ 10월 13일", place: "다대포 고우니생태길 일대", type: "축제", description: "가을 생태길과 바다 풍경을 함께 즐기는 가상 축제입니다.", sea: "다대포해수욕장", audience: "가을 산책과 생태 관찰을 좋아하는 분", tip: "편한 신발을 신고 지정된 탐방로를 이용해 주세요.", directions: "도시철도 1호선 다대포해수욕장역에서 도보 이동하는 설정입니다." },
  { id: "sea-dec", month: 12, name: "청사포 겨울빛 공연", date: "12월 21일", place: "청사포 어울마당(가상)", type: "공연", description: "등대와 겨울 바다를 배경으로 음악을 듣는 가상 공연입니다.", sea: "청사포 바다", audience: "차분한 연말 분위기를 원하는 여행자", tip: "방한용품을 준비하고 해가 지기 전 주변을 둘러보세요.", directions: "해운대에서 청사포 방면 마을버스를 이용하는 설정입니다." }
];

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

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((screen) => {
    const active = screen.id === id;
    screen.classList.toggle("screen--active", active);
    screen.hidden = !active;
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 버튼을 누르면 어떤 메뉴를 선택했는지 안내합니다.
menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.menu === "맞춤 코스 찾기") {
      showScreen("preference-screen");
    } else if (button.dataset.menu === "여행 코스 공유") {
      showScreen("share-screen");
    } else {
      openEvents();
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
document.querySelectorAll("[data-open-form]").forEach((button) => button.addEventListener("click", () => { courseFormMessage.textContent = ""; courseForm.reset(); setPlaceCount(1, { confirmRemoval: false }); showScreen("course-form-screen"); }));
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
  if (!firestoreUserId || typeof window.bacochuFirestore.createCourse !== "function") {
    courseFormMessage.textContent = t("익명 로그인 중입니다. 잠시 후 다시 등록해 주세요.");
    return;
  }
  try {
    // 실제 저장은 firebase-client.js의 createFirestoreCourse()에서 addDoc으로 수행합니다.
    await window.bacochuFirestore.createCourse(course);
  } catch (error) {
    console.error("Firestore 코스를 등록하지 못했습니다.", error);
    courseFormMessage.textContent = t("코스를 등록하지 못했습니다. 네트워크 연결을 확인해 주세요.");
    return;
  }
  courseForm.reset();
  setPlaceCount(1, { confirmRemoval: false });
  courseFormMessage.textContent = "";
  renderSharedCourses();
  showScreen("course-list-screen");
});

placeCountSelect.addEventListener("change", () => setPlaceCount(placeCountSelect.value));
document.querySelector("[data-place-decrease]").addEventListener("click", () => setPlaceCount(Number(placeCountSelect.value) - 1));
document.querySelector("[data-place-increase]").addEventListener("click", () => setPlaceCount(Number(placeCountSelect.value) + 1));
setPlaceCount(1, { confirmRemoval: false });

getSharedCourses();

function renderEvents() {
  const month = Number(eventMonth.value);
  const items = sampleSeaEvents.filter((event) => event.month === month && (selectedEventType === "전체" || event.type === selectedEventType));
  eventList.innerHTML = items.length ? items.map((event) => `
    <button class="event-card" type="button" data-event-id="${event.id}">
      <span class="event-card__heading"><span class="tag">${t(event.type)}</span><span aria-hidden="true">→</span></span>
      <h2>${event.name}</h2>
      <span class="event-card__meta"><span>📅 ${event.date}</span><span>📍 ${event.place}</span><span>🌊 ${event.sea}</span></span>
      <p class="event-card__description">${event.description}</p>
    </button>`).join("") : `<p class="event-empty">${t("이달에는 등록된 행사가 없습니다")}</p>`;
  window.i18n.apply(eventList);
}

function openEvents() {
  eventMonth.value = String(new Date().getMonth() + 1);
  selectedEventType = "전체";
  document.querySelectorAll("[data-event-type]").forEach((button) => {
    const active = button.dataset.eventType === "전체";
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderEvents();
  showScreen("event-screen");
}

function openEventDetail(id) {
  const event = sampleSeaEvents.find((item) => item.id === id);
  if (!event) return;
  eventDetail.innerHTML = `
    <span hidden data-current-event="${event.id}"></span><p class="result-intro">SAMPLE SEA EVENT · ${t(event.type)}</p>
    <h1 id="event-detail-title" class="event-detail-title">${event.name}</h1>
    <p class="event-detail-summary">${event.description}</p>
    <div class="event-detail-grid"><p><strong>${t("날짜")}</strong> ${event.date}</p><p><strong>${t("장소")}</strong> ${event.place}</p><p><strong>${t("바다")}</strong> ${event.sea}</p></div>
    <section class="detail-section"><h2>👥 ${t("추천 대상")}</h2><p>${event.audience}</p></section>
    <section class="detail-section"><h2>💡 ${t("이용 팁")}</h2><p>${event.tip}</p></section>
    <section class="detail-section"><h2>🚌 ${t("찾아가는 방법")}</h2><p>${event.directions}</p></section>`;
  window.i18n.apply(eventDetail);
  showScreen("event-detail-screen");
}

eventMonth.addEventListener("change", renderEvents);
document.querySelector("#event-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-event-type]");
  if (!button) return;
  selectedEventType = button.dataset.eventType;
  document.querySelectorAll("[data-event-type]").forEach((item) => {
    const active = item === button;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  renderEvents();
});
eventList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-event-id]");
  if (card) openEventDetail(card.dataset.eventId);
});
document.querySelector("[data-back-events]").addEventListener("click", () => showScreen("event-screen"));
document.querySelectorAll("[data-event-home]").forEach((button) => button.addEventListener("click", () => showScreen("home-screen")));

window.addEventListener("bacochu:languagechange", () => {
  renderSharedCourses();
  if (selectedSharedCourseId && !document.querySelector("#course-detail-screen").hidden) openCourseDetail(selectedSharedCourseId);
  if (!document.querySelector("#event-screen").hidden) renderEvents();
  const openEvent = eventDetail.querySelector("[data-current-event]")?.dataset.currentEvent;
  if (openEvent) openEventDetail(openEvent);
  setPlaceCount(placeCountSelect.value, { confirmRemoval: false });
});
