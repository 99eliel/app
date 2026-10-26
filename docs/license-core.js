/**
 * Núcleo puro de licenciamento. Não importa Firebase e é testável em Node.
 * Datas de validade representam um instante (Timestamp do Firestore no app).
 */
export const LICENSE_STATUS = Object.freeze(["trial","active","grace","suspended","canceled"]);
export const PLAN_OPTIONS = Object.freeze(["Inicial","Essencial","Profissional","Municipal","Personalizado"]);

export function toMillis(value) {
  if (!value) return NaN;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return NaN;
}

export function effectiveLicenseStatus(license, now = Date.now()) {
  if (!license) return "unconfigured";
  if (license.status === "suspended" || license.status === "canceled") return license.status;
  if (!["trial","active","grace"].includes(license.status)) return "invalid";
  const expires = toMillis(license.validUntil);
  if (!Number.isFinite(expires) || expires <= now) return "expired";
  return license.status;
}

export function isLicenseWritable(license, now = Date.now()) {
  return ["trial","active","grace"].includes(effectiveLicenseStatus(license, now));
}

export function parseBrlToCents(input) {
  const normalized = String(input).trim();
  if (!/^\d{1,7}(?:[.,]\d{1,2})?$/.test(normalized)) return null;
  const [reais, centavos = ""] = normalized.replace(",", ".").split(".");
  const cents = Number(reais) * 100 + Number(centavos.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents >= 0 && cents <= 100000000 ? cents : null;
}

export function centsToBrlInput(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) return "0,00";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function dateInputFromTimestamp(value) {
  const millis = toMillis(value);
  if (!Number.isFinite(millis)) return "";
  const date = new Date(millis);
  return [date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");
}

export function endOfLocalDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return null;
  const [y,m,d] = dateString.split("-").map(Number);
  const date = new Date(y,m-1,d,23,59,59,999);
  if (date.getFullYear() !== y || date.getMonth() !== m-1 || date.getDate() !== d) return null;
  return date;
}

export function formatBrl(cents) {
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format((cents||0)/100);
}

export const STATUS_LABELS = Object.freeze({
  unconfigured:"Sem licença",trial:"Em teste",active:"Ativa",grace:"Em carência",
  suspended:"Suspensa",canceled:"Encerrada",expired:"Vencida",invalid:"Inválida"
});
