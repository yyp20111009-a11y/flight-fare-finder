"""flight-parser — one route per invocation.

Fetch the cheapest next-month fare in TWD (the gate) and USD (best-effort),
scan subscribers on the route, and enqueue everyone whose target_price is met.
M1 has no payment guard: no subscription_status filter.
"""
import json, os, urllib.error, urllib.parse, urllib.request
from datetime import date
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Attr

UA = "Mozilla/5.0 (compatible; flight-notifier/1.0)"
QURL = os.environ["QUEUE_URL"]
_sqs = boto3.client("sqs")
_ddb = boto3.resource("dynamodb").Table("subscriptions")
_token = None


def get_token():
    global _token
    if _token is None:
        raw = boto3.client("secretsmanager").get_secret_value(SecretId="flight/travelpayouts")["SecretString"]
        try:
            _token = json.loads(raw)["token"]
        except (json.JSONDecodeError, KeyError, TypeError):
            _token = raw.strip()
    return _token


def next_month():
    t = date.today()
    return f"{t.year + 1}-01" if t.month == 12 else f"{t.year}-{t.month + 1:02d}"


def fetch_cheapest(origin, destination, month, token, currency):
    global _token
    q = urllib.parse.urlencode({"origin": origin, "destination": destination, "depart_date": month,
                                "currency": currency, "token": token})
    req = urllib.request.Request(f"https://api.travelpayouts.com/v1/prices/cheap?{q}",
                                 headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            body = json.loads(r.read())
    except urllib.error.HTTPError as e:
        if e.code == 401:
            _token = None  # re-read the secret next invocation (it may have been rotated)
        print("fetch failed", origin, destination, currency, repr(e))
        return None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        print("fetch failed", origin, destination, currency, repr(e))
        return None
    if not body.get("success") or not body.get("data"):
        print("no data", origin, destination, currency, json.dumps(body)[:300])
        return None
    offers = body["data"].get(destination, {})
    if not offers:
        return None
    best = min(offers.values(), key=lambda o: o["price"])
    # Real keys are departure_at / return_at (not depart_date / return_date).
    return {"price": best["price"], "currency": currency.upper(), "airline": best.get("airline"),
            "depart_date": best.get("departure_at"), "return_date": best.get("return_at")}


def subscribers(route):
    kwargs = {"FilterExpression": Attr("route").eq(route)}
    while True:
        page = _ddb.scan(**kwargs)
        yield from page["Items"]
        if "LastEvaluatedKey" not in page:
            return
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]


def handler(event, context):
    origin, destination = event["origin"], event["destination"]
    route = event.get("route") or f"{origin}-{destination}"
    month = next_month()
    token = get_token()

    tw = fetch_cheapest(origin, destination, month, token, "twd")
    if not tw:
        print("no TWD fare for", route, month, "(empty/429) - skipping")
        return {"ok": True, "route": route, "matched": 0}
    us = fetch_cheapest(origin, destination, month, token, "usd")  # may be None — never block on it
    print(f"{route} {month} cheapest {tw['price']} TWD ({tw['airline']}, {tw['depart_date']})"
          + (f" / {us['price']} USD" if us else " / USD unavailable"))

    matched = 0
    for it in subscribers(route):
        tp = Decimal(str(it.get("target_price", 0)))
        if tp < Decimal(str(tw["price"])):
            continue
        body = {"email": it["email"], "route": route, "plan_name": it.get("plan_name"), "target_price": int(tp),
                "cheapest": {"price": tw["price"], "currency": "TWD", "airline": tw["airline"],
                             "depart_date": tw["depart_date"], "return_date": tw["return_date"]}}
        if us:
            body["cheapest_usd"] = {"price": us["price"], "currency": "USD", "airline": us["airline"],
                                    "depart_date": us["depart_date"], "return_date": us["return_date"]}
        _sqs.send_message(QueueUrl=QURL, MessageBody=json.dumps(body))
        matched += 1
    print(f"{route} enqueued {matched} match(es)")
    return {"ok": True, "route": route, "matched": matched, "cheapest_twd": tw["price"]}
