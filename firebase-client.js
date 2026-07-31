import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
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

const client = window.bacochuFirestore;
let auth;
let db;
let authPromise = null;
let initialAuthStatePromise = null;

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Firebase 설정 요청 실패: ${response.status} (${url})`);
  return response.json();
}

async function loadFirebaseConfig() {
  // Firebase Hosting은 /__/firebase/init.json을 제공하지만 GitHub Pages는 제공하지
  // 않습니다. GitHub Pages에서는 저장소 하위 경로의 firebase-config.json을 읽습니다.
  if (window.__FIREBASE_CONFIG__) return window.__FIREBASE_CONFIG__;
  const candidates = [new URL("firebase-config.json", document.baseURI).href];
  if (location.hostname.endsWith("web.app") || location.hostname.endsWith("firebaseapp.com")) {
    candidates.push(new URL("/__/firebase/init.json", location.origin).href);
  }
  let lastError;
  for (const url of candidates) {
    try {
      const config = await fetchJson(url);
      if (config?.apiKey && config?.projectId && config?.authDomain) return config;
      throw new Error(`필수 Firebase 설정값이 없습니다 (${url})`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Firebase 설정을 찾지 못했습니다.");
}

function serializeCourse(snapshot) {
  const data = snapshot.data();
  return { ...data, id: snapshot.id, source: "firestore", createdAt: data.createdAt?.toMillis?.() ?? null };
}

function waitForInitialAuthState() {
  if (auth?.currentUser) return Promise.resolve(auth.currentUser);
  if (initialAuthStatePromise) return initialAuthStatePromise;
  initialAuthStatePromise = new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    const timeout = window.setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser);
    }, 5000);
    unsubscribe = onAuthStateChanged(auth, (user) => {
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    }, (error) => {
      window.clearTimeout(timeout);
      unsubscribe();
      reject(error);
    });
  }).finally(() => {
    initialAuthStatePromise = null;
  });
  return initialAuthStatePromise;
}

function ensureAnonymousUser() {
  if (auth?.currentUser) return Promise.resolve(auth.currentUser);
  if (authPromise) return authPromise;
  client.setAuthState("loading");
  authPromise = (async () => {
    // 영속 인증 복원이 끝난 첫 onAuthStateChanged 결과를 기다린 뒤에만 새 로그인을
    // 요청합니다. 모든 호출자는 이 Promise 하나를 공유합니다.
    const restoredUser = await waitForInitialAuthState();
    const user = restoredUser || (await signInAnonymously(auth)).user;
    if (!user?.uid) throw new Error("익명 로그인 결과에 UID가 없습니다.");
    client.setUser(user.uid);
    client.setAuthState("ready");
    return user;
  })().catch((error) => {
    console.error("Firebase 익명 로그인에 실패했습니다.", error);
    client.setUser(null);
    client.setAuthState("error", error.code || error.message);
    throw Object.assign(error, { stage: "auth" });
  }).finally(() => {
    authPromise = null;
  });
  return authPromise;
}

async function startFirestore() {
  client.setAuthState("loading");
  const config = await loadFirebaseConfig();
  const app = getApps().length ? getApp() : initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);

  client.createCourse = async (course) => {
    const user = await ensureAnonymousUser();
    return addDoc(collection(db, "courses"), { ...course, ownerUid: user.uid, createdAt: serverTimestamp() });
  };
  client.deleteCourse = async (courseId) => {
    const user = await ensureAnonymousUser();
    if (!user) throw new Error("로그인이 필요합니다.");
    return deleteDoc(doc(db, "courses", String(courseId)));
  };

  onAuthStateChanged(auth, (user) => {
    client.setUser(user?.uid ?? null);
    if (user) client.setAuthState("ready");
  }, (error) => {
    console.error("Firebase 인증 상태 확인에 실패했습니다.", error);
    client.setAuthState("error", error.code || error.message);
  });
  // 초기 인증 실패가 Firebase/Firestore 자체 초기화를 영구적으로 거부하지 않게 하여
  // 사용자가 다시 시도할 수 있도록 합니다.
  ensureAnonymousUser().catch(() => {});
  onSnapshot(
    query(collection(db, "courses"), orderBy("createdAt", "desc")),
    (snapshot) => client.applyCourses(snapshot.docs.map(serializeCourse)),
    (error) => console.error("Firestore 코스 실시간 구독에 실패했습니다.", error)
  );
}

const initializationPromise = startFirestore().catch((error) => {
  console.error("Firebase 초기화에 실패했습니다.", error);
  client.setAuthState("error", error.code || error.message);
  throw Object.assign(error, { stage: error.stage || "firebase" });
});
client.waitForAuth = async () => {
  await initializationPromise;
  return ensureAnonymousUser();
};
client.retryAuth = client.waitForAuth;
