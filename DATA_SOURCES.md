# 행사와 날씨 데이터 관리

## 행사 데이터 추가 방법

월별 행사 데이터는 HTML이 아니라 `festivals.json` 한 곳에서 관리합니다. 현재 공식 일정이 확인된 실제 행사 17건(2025년 3건, 2025~2026년 연跨 행사 1건, 2026년 행사 13건)이 있습니다. 요청 후보 중 공식 일정·장소를 확인할 수 없는 행사는 이전 연도 날짜를 복사하거나 추정하여 넣지 않습니다.

새 행사를 추가하려면 배열 마지막에 JSON 객체를 하나 추가합니다. `id`는 중복되지 않는 영문 ID, `names`에는 `ko`, `en`, `ja`, `zh` 이름을 모두 작성하고, 날짜는 `YYYY-MM-DD`로 씁니다. `place`, `sea`, `description`, `sourceName`, 공식 `sourceUrl`, `verifiedAt`, `scheduleNotice`도 빠짐없이 기록합니다. `categoryId`는 번역문이 아닌 `festival`, `performance`, `exhibition`, `experience` 중 하나만 사용합니다.

`festival-utils.js`가 시작일부터 종료일까지 포함되는 **모든 연도**를 숫자로 정규화해 중복 제거하고 최신순으로 정렬합니다. 따라서 새 연도 데이터를 추가하면 연도 선택지에도 자동으로 나타납니다. 현재 연도에 데이터가 있으면 현재 연도를, 없으면 가장 최신 연도를 기본으로 선택합니다. 월 필터는 행사 기간과 해당 월의 날짜 범위가 하루라도 겹치는지 검사하므로 연말·연초 및 여러 달에 걸친 행사도 양쪽에 표시됩니다.

## 2026년 공식 출처

- 해운대 빛축제·달집태우기: 해운대구 문화관광
- 광안리 M 드론라이트쇼: 수영구 공식 공연 홈페이지
- 다대포 달집문화축제·꿈의 낙조분수: 사하구 공식 홈페이지
- 수영전통 달집놀이·광안리어방축제: 수영구 공식 홈페이지
- 기장미역다시마축제: 기장군 공식 홈페이지
- 해운대 모래축제: 해운대구 공식 홈페이지
- 부산항축제·부산바다축제: 부산문화관광축제조직위원회
- 부산국제매직페스티벌 해운대 버스킹: 부산국제매직페스티벌 공식 홈페이지
- 북항 오션 SUP FESTA: 부산광역시 해양레저관광
- 부산바다도서관: 부산광역시 독서문화행사

각 행사의 정확한 공식 링크와 확인일은 `festivals.json`의 해당 항목에 함께 보존합니다. 일정은 변경될 수 있으므로 배포 전 링크의 최신 공지를 다시 확인합니다.

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
