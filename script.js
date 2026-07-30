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

const sampleSharedCourses = [
  { id: "sample-1", title: "다대포 노을 따라 걷는 하루", author: "노을수집가", beach: "다대포해수욕장", places: ["아미산전망대", "고우니생태길", "다대포해수욕장"], duration: "약 4시간", companion: "친구", mood: "사진 촬영", description: "낙동강과 바다가 만나는 풍경부터 붉은 노을까지 차례로 만나는 코스예요. 해 질 무렵 다대포에 도착하면 멋진 사진을 남길 수 있어 추천해요." },
  { id: "sample-2", title: "영도 바다 쉼표 코스", author: "부산갈매기", beach: "영도 바다", places: ["흰여울문화마을", "절영해안산책로", "태종대"], duration: "약 5시간", companion: "가족", mood: "휴식", description: "골목과 해안 산책로를 천천히 걸으며 부산다운 바다를 즐겨요. 볼거리와 쉬어 갈 곳이 많아 가족과 여유롭게 다녀오기 좋아요." }
];

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
      statusMessage.textContent = `${button.dataset.menu} 메뉴를 준비하고 있어요!`;
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
  const course = getSharedCourses().find((item) => item.id === id);
  if (!course) return;
  sharedCourseDetail.innerHTML = `
    <p class="result-intro">TRAVELER'S COURSE</p><h1 id="detail-title" class="course-name">${escapeHtml(course.title)}</h1>
    <p class="detail-meta">✍️ ${escapeHtml(course.author)} · ⏱ ${escapeHtml(course.duration)}</p>
    <div class="detail-tags"><span class="tag">🌊 ${escapeHtml(course.beach)}</span><span class="tag">👥 ${escapeHtml(course.companion)}</span><span class="tag">✨ ${escapeHtml(course.mood)}</span></div>
    <section class="detail-section"><h2>📍 방문 장소 3곳</h2><ol class="detail-places">${course.places.map((place) => `<li>${escapeHtml(place)}</li>`).join("")}</ol></section>
    <section class="detail-section"><h2>💡 코스 소개와 추천 이유</h2><p>${escapeHtml(course.description)}</p></section>`;
  showScreen("course-detail-screen");
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

courseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!courseForm.checkValidity()) {
    courseFormMessage.textContent = "입력하지 않은 필수 항목이 있어요. 모든 항목을 확인해 주세요.";
    courseForm.querySelector(":invalid")?.focus();
    return;
  }
  const values = new FormData(courseForm);
  const course = {
    id: `course-${Date.now()}`,
    title: values.get("title").trim(), author: values.get("author").trim(), beach: values.get("beach"),
    places: [values.get("place1").trim(), values.get("place2").trim(), values.get("place3").trim()],
    duration: values.get("duration").trim(), companion: values.get("companion"), mood: values.get("mood"), description: values.get("description").trim()
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
