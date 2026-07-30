const menuButtons = document.querySelectorAll("[data-menu]");
const statusMessage = document.querySelector("#status-message");
const form = document.querySelector("#preference-form");
const formMessage = document.querySelector("#form-message");
const resultContainer = document.querySelector("#course-result");
const STORAGE_KEY = "bacochu-shared-courses";
const sharedCourseList = document.querySelector("#shared-course-list");
const sharedCourseDetail = document.querySelector("#shared-course-detail");
const courseForm = document.querySelector("#course-form");
const courseFormMessage = document.querySelector("#course-form-message");
const eventMonth = document.querySelector("#event-month");
const eventList = document.querySelector("#event-list");
const eventDetail = document.querySelector("#event-detail");
let selectedEventType = "전체";
let selectedSharedCourseId = null;

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

function getSharedCourses() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (error) {
    console.warn("저장된 코스를 불러오지 못했습니다.", error);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleSharedCourses));
  return [...sampleSharedCourses];
}

function saveSharedCourses(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
    formMessage.textContent = "여행 취향 세 항목을 모두 선택해 주세요.";
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
  sharedCourseList.innerHTML = getSharedCourses().map((course) => `
    <button class="shared-course-card" type="button" data-course-id="${escapeHtml(course.id)}">
      <span class="shared-course-card__top"><span><span class="tag">${escapeHtml(course.beach)}</span><h2>${escapeHtml(course.title)}</h2></span><span aria-hidden="true">→</span></span>
      <span class="tag">${escapeHtml(course.mood)}</span> <span class="tag">${escapeHtml(course.companion)}와 함께</span>
      <p>✍️ ${escapeHtml(course.author)} · ⏱ ${escapeHtml(course.duration)}</p>
    </button>`).join("");
}

function openCourseDetail(id) {
  const course = getSharedCourses().find((item) => String(item.id) === String(id));
  if (!course) return;
  selectedSharedCourseId = String(course.id);
  const canDeleteCourse = isUserCreatedCourse(course) && Boolean(getCourseManagementCredentials(course));
  sharedCourseDetail.innerHTML = `
    <p class="result-intro">TRAVELER'S COURSE</p><h1 id="detail-title" class="course-name">${escapeHtml(course.title)}</h1>
    <p class="detail-meta">✍️ ${escapeHtml(course.author)} · ⏱ ${escapeHtml(course.duration)}</p>
    <div class="detail-tags"><span class="tag">🌊 ${escapeHtml(course.beach)}</span><span class="tag">👥 ${escapeHtml(course.companion)}</span><span class="tag">✨ ${escapeHtml(course.mood)}</span></div>
    <section class="detail-section"><h2>📍 방문 장소 3곳</h2><ol class="detail-places">${course.places.map((place) => `<li>${escapeHtml(place)}</li>`).join("")}</ol></section>
    <section class="detail-section"><h2>💡 코스 소개와 추천 이유</h2><p>${escapeHtml(course.description)}</p></section>
    ${canDeleteCourse ? '<div class="course-management"><button class="delete-course-button" type="button" data-delete-course>코스 삭제</button><p class="delete-message" role="alert" aria-live="assertive"></p></div>' : ""}`;
  showScreen("course-detail-screen");
}

sharedCourseDetail.addEventListener("click", async (event) => {
  if (!event.target.closest("[data-delete-course]")) return;
  const courses = getSharedCourses();
  const course = courses.find((item) => String(item.id) === selectedSharedCourseId && isUserCreatedCourse(item));
  const credentials = getCourseManagementCredentials(course || {});
  if (!course || !credentials) return;

  const password = window.prompt("관리 비밀번호를 입력해 주세요.");
  if (password === null) return;
  const passwordHash = await hashPassword(password, credentials.passwordSalt);
  if (passwordHash !== credentials.passwordHash) {
    sharedCourseDetail.querySelector(".delete-message").textContent = "관리 비밀번호가 일치하지 않습니다";
    return;
  }
  if (!window.confirm("정말 이 코스를 삭제하시겠습니까?")) return;

  saveSharedCourses(courses.filter((item) => String(item.id) !== String(course.id)));
  renderSharedCourses();
  showScreen("course-list-screen");
  showListNotice("코스가 삭제되었습니다");
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
document.querySelectorAll("[data-open-form]").forEach((button) => button.addEventListener("click", () => { courseFormMessage.textContent = ""; showScreen("course-form-screen"); }));
sharedCourseList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-course-id]");
  if (card) openCourseDetail(card.dataset.courseId);
});

courseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!courseForm.checkValidity()) {
    courseFormMessage.textContent = "입력하지 않은 필수 항목이 있어요. 모든 항목을 확인해 주세요.";
    courseForm.querySelector(":invalid")?.focus();
    return;
  }
  const values = new FormData(courseForm);
  const password = values.get("adminPassword");
  const passwordSalt = createPasswordSalt();
  const course = {
    id: `course-${Date.now()}`,
    isUserCreated: true,
    title: values.get("title").trim(), author: values.get("author").trim(), beach: values.get("beach"),
    places: [values.get("place1").trim(), values.get("place2").trim(), values.get("place3").trim()],
    duration: values.get("duration").trim(), companion: values.get("companion"), mood: values.get("mood"), description: values.get("description").trim(),
    passwordSalt,
    // localStorage 기반 해시는 원문 저장을 피하기 위한 임시 구조이며 실제 서버 보안을 대신하지 않습니다.
    passwordHash: await hashPassword(password, passwordSalt)
  };
  if ([course.title, course.author, course.duration, course.description, ...course.places].some((value) => !value)) {
    courseFormMessage.textContent = "공백만 입력할 수 없어요. 모든 항목을 내용으로 채워 주세요.";
    return;
  }
  saveSharedCourses([course, ...getSharedCourses()]);
  courseForm.reset();
  courseFormMessage.textContent = "";
  renderSharedCourses();
  showScreen("course-list-screen");
});

getSharedCourses();

function renderEvents() {
  const month = Number(eventMonth.value);
  const items = sampleSeaEvents.filter((event) => event.month === month && (selectedEventType === "전체" || event.type === selectedEventType));
  eventList.innerHTML = items.length ? items.map((event) => `
    <button class="event-card" type="button" data-event-id="${event.id}">
      <span class="event-card__heading"><span class="tag">${event.type}</span><span aria-hidden="true">→</span></span>
      <h2>${event.name}</h2>
      <span class="event-card__meta"><span>📅 ${event.date}</span><span>📍 ${event.place}</span><span>🌊 ${event.sea}</span></span>
      <p class="event-card__description">${event.description}</p>
    </button>`).join("") : '<p class="event-empty">이달에는 등록된 행사가 없습니다</p>';
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
    <p class="result-intro">SAMPLE SEA EVENT · ${event.type}</p>
    <h1 id="event-detail-title" class="event-detail-title">${event.name}</h1>
    <p class="event-detail-summary">${event.description}</p>
    <div class="event-detail-grid"><p><strong>날짜</strong> ${event.date}</p><p><strong>장소</strong> ${event.place}</p><p><strong>바다</strong> ${event.sea}</p></div>
    <section class="detail-section"><h2>👥 추천 대상</h2><p>${event.audience}</p></section>
    <section class="detail-section"><h2>💡 이용 팁</h2><p>${event.tip}</p></section>
    <section class="detail-section"><h2>🚌 찾아가는 방법</h2><p>${event.directions}</p></section>`;
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
