const menuButtons = document.querySelectorAll("[data-menu]");
const statusMessage = document.querySelector("#status-message");
const form = document.querySelector("#preference-form");
const formMessage = document.querySelector("#form-message");
const resultContainer = document.querySelector("#course-result");

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
