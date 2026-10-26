// Configuração de cliente Firebase (não é credencial de administrador).
// NÃO incluir chaves privadas ou service accounts aqui.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAnalytics, isSupported, logEvent } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCqL7QuNRyofwb_KsiKZxfbRaAFYK3VOac",
  authDomain: "conectesaude-1.firebaseapp.com",
  projectId: "conectesaude-1",
  storageBucket: "conectesaude-1.firebasestorage.app",
  messagingSenderId: "755309214193",
  appId: "1:755309214193:web:1fafbc1e2736eedd1aec50",
  measurementId: "G-SHEPCPSL6Z"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Importado dinamicamente apenas se o visitante aceitar Analytics.
export async function enableAnalytics() {
  if (!(await isSupported())) return false;
  const analytics = getAnalytics(app);
  logEvent(analytics, "demo_site_opened");
  return true;
}

export { app, firebaseConfig };
