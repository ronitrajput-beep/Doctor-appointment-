export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const form = body instanceof FormData;
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: body && !form ? { "Content-Type": "application/json" } : undefined,
    body: body ? (form ? body : JSON.stringify(body)) : undefined,
  });
  const data = await response
    .json()
    .catch(() => ({ detail: "The server returned an unexpected response." }));
  if (!response.ok) {
    const d = data.detail;
    throw new Error(
      Array.isArray(d)
        ? d.map((x: { msg: string }) => x.msg).join(" ")
        : d || "Something went wrong. Please try again.",
    );
  }
  return data;
}
export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export const day = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const future = (date: string, time: string) =>
  new Date(`${date}T${time}:00+05:30`).getTime() > Date.now();
