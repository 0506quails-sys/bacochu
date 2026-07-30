// 첫 화면의 메뉴 버튼을 가져옵니다.
const menuButtons = document.querySelectorAll("[data-menu]");
const statusMessage = document.querySelector("#status-message");

// 버튼을 누르면 어떤 메뉴를 선택했는지 안내합니다.
menuButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedMenu = button.dataset.menu;
    statusMessage.textContent = `${selectedMenu} 메뉴를 준비하고 있어요!`;
  });
});
