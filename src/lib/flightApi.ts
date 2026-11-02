// AWS HTTP API (API Gateway → Lambda → DynamoDB). Public URL — no AWS credentials in the browser.
const API_URL: string =
  import.meta.env["VITE_FLIGHT_API_URL"] ??
  "https://9t2xhvrw0a.execute-api.us-east-1.amazonaws.com";

export type PlanName = "tokyo" | "seoul";

export interface Subscription {
  email: string;
  route: string;
  plan_name: PlanName;
  target_price: number;
  currency: "TWD";
  created_at: string;
  updated_at: string;
}

export const PLANS: {
  plan_name: PlanName;
  route: string;
  label: string;
  en: string;
  hint: number;
}[] = [
  { plan_name: "tokyo", route: "TPE-TYO", label: "台北 ✈ 東京", en: "Taipei → Tokyo", hint: 9325 },
  { plan_name: "seoul", route: "TPE-SEL", label: "台北 ✈ 首爾", en: "Taipei → Seoul", hint: 5989 },
];

async function parse<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body as T;
}

export async function listSubscriptions(email: string): Promise<Subscription[]> {
  const res = await fetch(`${API_URL}/subscriptions?email=${encodeURIComponent(email)}`);
  return (await parse<{ items: Subscription[] }>(res)).items;
}

export async function saveSubscription(email: string, plan_name: PlanName, target_price: number) {
  const res = await fetch(`${API_URL}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, plan_name, target_price }),
  });
  return parse<{ ok: true; route: string; target_price: number }>(res);
}
