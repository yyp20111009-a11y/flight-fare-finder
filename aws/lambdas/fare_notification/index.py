"""flight-fare-notification — SQS consumer.

Per message: dedup against notification_history, render a TWD-headline email
(+ optional 約 US$ line), send via Resend, and record history only after a 2xx.
Transient Resend failures (429/5xx) are reported back to SQS for redelivery;
permanent ones (4xx, e.g. demo sender to a non-account address) are dropped.
"""
import html, json, os, urllib.error, urllib.request
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

UA = "Mozilla/5.0 (compatible; flight-notifier/1.0)"
CITY = {"TPE": "台北", "TYO": "東京", "SEL": "首爾"}
FLOOR_HOURS = float(os.environ.get("NOTIFY_FLOOR_HOURS", "24"))
REALERT_PCT = Decimal(os.environ.get("REALERT_PCT", "20"))
REALERT_ABS = Decimal(os.environ.get("REALERT_ABS_TWD", "2000"))

_history = boto3.resource("dynamodb").Table("notification_history")
_resend = None


class Transient(Exception):
    pass


def resend_secret():
    global _resend
    if _resend is None:
        raw = boto3.client("secretsmanager").get_secret_value(SecretId="flight/resend")["SecretString"]
        try:
            s = json.loads(raw)
            assert s["api_key"].startswith("re_")
        except (ValueError, KeyError, TypeError, AttributeError, AssertionError):
            # A config problem, not a bad message: retry instead of dropping the alert.
            raise Transient("flight/resend secret is not valid JSON with an re_ api_key")
        _resend = s
    return _resend


# ---------- rendering ----------

def _cities(route):
    o, d = route.split("-")
    return o, d, CITY.get(o, o), CITY.get(d, d)


def _ddmm(iso):
    return f"{iso[8:10]}{iso[5:7]}" if iso and len(iso) >= 10 else ""


def booking_url(fare, marker=None):
    o, d, _, _ = _cities(fare["route"])
    path = f"{o}{_ddmm(fare.get('depart_date'))}{d}{_ddmm(fare.get('return_date'))}1"
    url = f"https://www.aviasales.com/search/{path}"
    return f"{url}?marker={marker}" if marker else url


def subject(fare):
    _, _, oc, dc = _cities(fare["route"])
    return f"✈️ {oc} → {dc} 降價通知！NT${fare['price']:,} 已達標"


def _dates(fare):
    dep, ret = (fare.get("depart_date") or "")[:10], (fare.get("return_date") or "")[:10]
    return f"{dep} → {ret}" if ret else dep


def render_html(fare, target_price, marker=None, usd_price=None):
    _, _, oc, dc = _cities(fare["route"])
    e = html.escape
    usd = f'<p style="margin:4px 0 0;color:#666;font-size:14px">約 US${usd_price:,}</p>' if usd_price else ""
    return f"""<!doctype html><html><body style="margin:0;padding:24px;font-family:-apple-system,'Segoe UI','PingFang TC','Microsoft JhengHei',sans-serif;color:#222;background:#f6f4ef">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">
<p style="margin:0;color:#2f6f62;font-size:14px">{e(oc)} → {e(dc)}</p>
<p style="margin:8px 0 0;font-size:34px;font-weight:700">NT${fare['price']:,}</p>{usd}
<p style="margin:16px 0 0;font-size:14px">你的目標價 NT${target_price:,}，現在已達標。</p>
<p style="margin:6px 0 0;font-size:14px;color:#555">航空公司 {e(str(fare.get('airline') or '-'))} · {e(_dates(fare))}</p>
<p style="margin:24px 0 0"><a href="{e(booking_url(fare, marker))}" style="display:inline-block;background:#2f6f62;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600">立即訂購</a></p>
<p style="margin:24px 0 0;font-size:12px;color:#999">票價會變動，以訂購頁面為準。Flight Price Notifier</p>
</div></body></html>"""


def render_text(fare, target_price, marker=None, usd_price=None):
    _, _, oc, dc = _cities(fare["route"])
    lines = [f"{oc} → {dc} 降價通知", f"NT${fare['price']:,}" + (f"（約 US${usd_price:,}）" if usd_price else ""),
             f"你的目標價 NT${target_price:,}，現在已達標。",
             f"航空公司 {fare.get('airline') or '-'} · {_dates(fare)}", f"立即訂購：{booking_url(fare, marker)}"]
    return "\n".join(lines)


# ---------- dedup ----------

def should_send(pk, price):
    res = _history.query(KeyConditionExpression=Key("pk").eq(pk), ScanIndexForward=False, Limit=1)["Items"]
    if not res:
        return True, "first alert"
    last = res[0]
    sent_at = datetime.fromisoformat(last["sent_at"])
    if datetime.now(timezone.utc) - sent_at >= timedelta(hours=FLOOR_HOURS):
        return True, f"last alert older than {FLOOR_HOURS:g}h"
    last_price, new = Decimal(str(last["price"])), Decimal(str(price))
    if new <= last_price * (1 - REALERT_PCT / 100) or (last_price - new) >= REALERT_ABS:
        return True, f"re-alert: {last_price} -> {new}"
    return False, f"within {FLOOR_HOURS:g}h of NT${last_price} alert"


# ---------- send ----------

def send_email(to, subj, html_body, text_body):
    s = resend_secret()
    body = {"from": s.get("from", "onboarding@resend.dev"), "to": [to], "subject": subj,
            "html": html_body, "text": text_body}
    req = urllib.request.Request("https://api.resend.com/emails", data=json.dumps(body).encode(), method="POST",
                                 headers={"Authorization": "Bearer " + s["api_key"],
                                          "Content-Type": "application/json", "User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as ex:
        detail = ex.read().decode()[:300]
        if ex.code == 429 or ex.code >= 500:
            raise Transient(f"Resend {ex.code}: {detail}")
        return ex.code, detail
    except (urllib.error.URLError, TimeoutError) as ex:
        raise Transient(f"Resend unreachable: {ex!r}")


def process(msg):
    email, route = msg["email"], msg["route"]
    fare = dict(msg["cheapest"], route=route)
    usd = (msg.get("cheapest_usd") or {}).get("price")
    pk = f"{email}#{route}"

    ok, why = should_send(pk, fare["price"])
    if not ok:
        print(f"{pk} skipped (deduped): {why}")
        return
    marker = resend_secret().get("marker")
    status, detail = send_email(email, subject(fare),
                                render_html(fare, msg["target_price"], marker, usd),
                                render_text(fare, msg["target_price"], marker, usd))
    if not 200 <= status < 300:
        print(f"{pk} DROPPED permanent Resend {status}: {detail}")
        return
    _history.put_item(Item={"pk": pk, "sent_at": datetime.now(timezone.utc).isoformat(), "email": email,
                            "route": route, "price": Decimal(str(fare["price"])), "currency": "TWD"})
    print(f"{pk} SENT NT${fare['price']} ({why}) resend={detail}")


def handler(event, context):
    failures = []
    for rec in event.get("Records", []):
        try:
            process(json.loads(rec["body"]))
        except Transient as ex:
            print("transient, will retry:", ex)
            failures.append({"itemIdentifier": rec["messageId"]})
        except (KeyError, ValueError, TypeError) as ex:
            print("bad message dropped:", repr(ex), rec.get("body", "")[:300])
    return {"batchItemFailures": failures}
