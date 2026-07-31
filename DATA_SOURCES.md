# 축제와 날씨 데이터 관리

## 축제

축제 정적 데이터는 `festivals.json`에서 관리합니다. 이 목록에는 공식 페이지에서 **정확한 일정과 장소를 확인한 행사만** 넣습니다. 현재 2025년 5월 16일부터 11월 15일까지의 실제 행사 3건이 수록되어 있습니다.

현재 수록 자료(확인일: 2026-07-31):

- `2025 해운대 모래축제`: [해운대 모래축제 공식 홈페이지](https://www.haeundae.go.kr/sand/index.do)
- `제29회 부산바다축제`: [부산축제조직위원회 공식 페이지](https://www.bfo.or.kr/festival/info/01.asp?MENUDIV=1)
- `제20회 부산불꽃축제`: [부산축제조직위원회 공식 페이지](https://www.bfo.or.kr/festival/info/02.asp?MENUDIV=1)

일정을 갱신하려면 공식 자료와 대조한 뒤 `name`, `startDate`, `endDate`, `place`, `categoryId`, `description`, `sourceName`, `sourceUrl`, `verifiedAt`을 함께 수정합니다. 발표되지 않은 다음 회차의 날짜를 이전 회차에서 추정하거나 복사하면 안 됩니다. `categoryId`는 언어와 무관한 `festival`, `performance`, `exhibition`, `experience` 중 하나를 사용합니다.

`startDate`와 `endDate`는 `YYYY-MM-DD` 형식으로 저장합니다. 종료일을 생략하면 시작일과 같은 하루짜리 행사로 처리합니다. 화면에서는 선택한 달의 첫날/마지막 날과 행사 기간이 겹치는지 한국 달력 날짜 문자열로 비교하므로, 두 달 이상 이어지는 행사는 해당하는 모든 달에 표시됩니다. 잘못된 개별 자료는 콘솔 경고 후 제외하고, 파일 자체를 불러오지 못하면 “행사 없음”과 구분된 오류 및 다시 시도 버튼을 표시합니다.

## 날씨

날씨는 인증키가 필요 없는 Open-Meteo Forecast API를 사용합니다.

- 엔드포인트: `https://api.open-meteo.com/v1/forecast`
- 위치: 아래 표의 부산 7개 해수욕장별 좌표
- 요청값: `temperature_2m`, `apparent_temperature`, `weather_code`, `wind_speed_10m`
- 시간대: `Asia/Seoul`
- 단위: 섭씨(`°C`), 시속 킬로미터(`km/h`)

좌표는 `script.js`의 `BEACHES`에서 관리합니다. 정상 응답은 장소별로 10분간 별도의 localStorage 항목에 캐시합니다. 기존 코스, 댓글, 좋아요, 즐겨찾기 저장 항목은 변경하거나 지우지 않습니다.

## 부산 7개 해수욕장 좌표

해수욕장 좌표는 OpenStreetMap에서 각 해수욕장 객체/표시 위치를 확인한 2026-07-31 기준점이며, 앱의 날씨 요청과 마커가 같은 좌표를 공유합니다.

| 해수욕장 | 위도 | 경도 | OpenStreetMap 확인 링크 |
|---|---:|---:|---|
| 광안리해수욕장 | 35.153169 | 129.118666 | https://www.openstreetmap.org/?mlat=35.153169&mlon=129.118666#map=17/35.153169/129.118666 |
| 해운대해수욕장 | 35.158697 | 129.160384 | https://www.openstreetmap.org/?mlat=35.158697&mlon=129.160384#map=17/35.158697/129.160384 |
| 송정해수욕장 | 35.178617 | 129.199713 | https://www.openstreetmap.org/?mlat=35.178617&mlon=129.199713#map=17/35.178617/129.199713 |
| 송도해수욕장 | 35.075876 | 129.017917 | https://www.openstreetmap.org/?mlat=35.075876&mlon=129.017917#map=17/35.075876/129.017917 |
| 다대포해수욕장 | 35.046588 | 128.965517 | https://www.openstreetmap.org/?mlat=35.046588&mlon=128.965517#map=17/35.046588/128.965517 |
| 일광해수욕장 | 35.259631 | 129.233054 | https://www.openstreetmap.org/?mlat=35.259631&mlon=129.233054#map=17/35.259631/129.233054 |
| 임랑해수욕장 | 35.318259 | 129.264155 | https://www.openstreetmap.org/?mlat=35.318259&mlon=129.264155#map=17/35.318259/129.264155 |

- 날씨: Open-Meteo Forecast API `current` 자료. 각 선택 좌표로 `temperature_2m`, `apparent_temperature`, `weather_code`, `wind_speed_10m`을 별도로 요청합니다.

## GitHub Pages 정적 파일 갱신

`index.html`은 CSS와 JavaScript URL에 배포 버전 쿼리를 붙입니다. 정적 파일을 수정해 배포할 때에는 파일의 버전 값을 함께 올려, 이전 HTML과 새 JavaScript가 브라우저 캐시에서 섞이지 않도록 합니다. 스크립트는 `i18n.js` → `festival-utils.js` → `script.js` → `firebase-client.js` 순서로 불러옵니다. `script.js`는 `new URL("festivals.json", document.baseURI)`로 JSON 주소를 만들기 때문에 루트 도메인과 GitHub Pages 프로젝트 하위 경로에서 모두 같은 상대 경로를 사용합니다.
