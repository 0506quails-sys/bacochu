# 축제와 날씨 데이터 관리

## 축제

축제 정적 데이터는 `festivals.js`의 `window.BACOCHU_FESTIVALS` 배열에서 관리합니다. 이 목록에는 공식 페이지에서 **정확한 일정과 장소를 확인한 행사만** 넣습니다. 기존의 기능 확인용 가상 행사 11개는 모두 삭제했습니다.

현재 수록 자료(확인일: 2026-07-31):

- `2025 해운대 모래축제`: [해운대 모래축제 공식 홈페이지](https://www.haeundae.go.kr/sand/index.do)
- `제29회 부산바다축제`: [부산축제조직위원회 공식 페이지](https://www.bfo.or.kr/festival/info/01.asp?MENUDIV=1)
- `제20회 부산불꽃축제`: [부산축제조직위원회 공식 페이지](https://www.bfo.or.kr/festival/info/02.asp?MENUDIV=1)

일정을 갱신하려면 공식 자료와 대조한 뒤 `name`, `startDate`, `endDate`, `place`, `description`, `sourceUrl`, `verifiedAt`을 함께 수정합니다. 발표되지 않은 다음 회차의 날짜를 이전 회차에서 추정하거나 복사하면 안 됩니다. 공공데이터포털 OpenAPI는 현재 앱에 연결하지 않았으므로 인증키가 필요하지 않습니다. 향후 인증키가 필요한 API를 GitHub Pages에서 직접 호출하면 브라우저에 전달된 키를 완전히 숨길 수 없으므로, 운영 환경에서는 별도 서버 프록시를 사용하는 편이 안전합니다.

## 날씨

날씨는 인증키가 필요 없는 Open-Meteo Forecast API를 사용합니다.

- 엔드포인트: `https://api.open-meteo.com/v1/forecast`
- 위치: 광안리해수욕장 (`35.1532`, `129.1187`)
- 요청값: `temperature_2m`, `apparent_temperature`, `weather_code`, `wind_speed_10m`
- 시간대: `Asia/Seoul`
- 단위: 섭씨(`°C`), 시속 킬로미터(`km/h`)

좌표는 `script.js`의 `WEATHER_LOCATION`에서 관리합니다. 정상 응답은 10분간 별도의 localStorage 항목에 캐시합니다. 기존 코스, 댓글, 좋아요, 즐겨찾기 저장 항목은 변경하거나 지우지 않습니다.
