import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

async function loadFirebaseConfig() {
  const response = await fetch("/__/firebase/init.json");
  if (!response.ok) throw new Error(`Firebase 설정을 불러오지 못했습니다 (${response.status})`);
  return response.json();
}

function serializeCourse(snapshot) {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    source: "firestore",
    createdAt: data.createdAt?.toMillis?.() ?? null
  };
}

async function startFirestore() {
  const app = initializeApp(await loadFirebaseConfig());
  const auth = getAuth(app);
  const db = getFirestore(app);

  onAuthStateChanged(auth, (user) => window.bacochuFirestore.setUser(user?.uid ?? null));
  const credential = auth.currentUser ? { user: auth.currentUser } : await signInAnonymously(auth);
  window.bacochuFirestore.setUser(credential.user.uid);

  // 게시물 등록 폼이 호출하는 실제 Firestore 저장 함수입니다.
  async function createFirestoreCourse(course) {
    const user = auth.currentUser;
    if (!user) throw new Error("익명 로그인 완료 후에만 게시물을 등록할 수 있습니다.");
    return addDoc(collection(db, "courses"), {
      ...course,
      ownerUid: user.uid,
      createdAt: serverTimestamp()
    });
  }

  async function deleteFirestoreCourse(courseId) {
    const user = auth.currentUser;
    if (!user) throw new Error("로그인이 필요합니다.");
    return deleteDoc(doc(db, "courses", String(courseId)));
  }

  window.bacochuFirestore.createCourse = createFirestoreCourse;
  window.bacochuFirestore.deleteCourse = deleteFirestoreCourse;

  // onSnapshot으로 다른 기기에서 추가·삭제한 courses도 즉시 목록에 반영합니다.
  onSnapshot(
    query(collection(db, "courses"), orderBy("createdAt", "desc")),
    (snapshot) => window.bacochuFirestore.applyCourses(snapshot.docs.map(serializeCourse)),
    (error) => console.error("Firestore 코스 실시간 구독에 실패했습니다.", error)
  );
}

startFirestore().catch((error) => console.error("Firebase 초기화에 실패했습니다.", error));
