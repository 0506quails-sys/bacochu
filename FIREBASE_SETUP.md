# Firebase 배포 점검

바코추는 화면에 계정 기능을 제공하지 않지만, 작성자를 구분하고 Firestore 쓰기
규칙을 지키기 위해 Firebase 익명 인증을 내부적으로 사용합니다.

## 현재 확인된 배포 문제

GitHub Pages에는 Firebase Hosting 전용 주소인 `/__/firebase/init.json`이 없습니다.
현재 저장소에도 `firebase-config.json`이 없으므로 배포된 앱의 설정 요청은 404가
되고, Firebase 앱 초기화 전에 중단됩니다. 따라서 현재 확인 가능한 실제 실패는
Firebase Auth 오류 코드가 아니라 **설정 파일 HTTP 404**입니다. 초기화되지 않은
상태에서는 익명 로그인 요청 자체가 전송되지 않아 `auth/...` 오류 코드도 발생하지
않습니다.

## 배포 전에 할 일

1. Firebase Console에서 해당 프로젝트를 엽니다.
2. **프로젝트 설정(톱니바퀴) → 일반 → 내 앱 → 웹 앱 → SDK 설정 및 구성**에서
   구성 객체를 확인합니다.
3. 저장소 루트에 `firebase-config.json`을 만들고 `apiKey`, `authDomain`,
   `projectId`, `storageBucket`, `messagingSenderId`, `appId` 값을 넣습니다. Firebase
   웹 API 키는 클라이언트 식별 설정이며, 보안은 `firestore.rules`와 인증으로
   적용합니다. 별도의 서비스 계정 키나 비공개 키는 넣지 않습니다.
4. **빌드 → Authentication → Sign-in method → 새 제공업체 추가 → 익명**을
   사용 설정하고 저장합니다.
5. **빌드 → Firestore Database → 규칙**에서 이 저장소의 `firestore.rules`를
   배포합니다. 읽기는 공개지만 생성·수정·삭제는 익명 UID와 `ownerUid`가 맞아야
   합니다.
6. GitHub Pages를 다시 배포한 뒤 개발자 도구의 Network에서
   `firebase-config.json`이 200인지, Console에서 `auth/...` 오류가 있는지
   확인합니다. 익명 인증은 이메일 링크나 OAuth 리디렉션 방식이 아니므로 먼저
   승인 도메인을 원인으로 추정하지 말고 실제 오류 코드를 확인합니다.

캐시된 이전 JavaScript 실행을 피하도록 `index.html`의 스크립트 버전 쿼리를
변경했습니다. 배포 확인 시 Network의 `script.js`와 `firebase-client.js` 요청 URL이
최신 버전인지도 확인합니다.
