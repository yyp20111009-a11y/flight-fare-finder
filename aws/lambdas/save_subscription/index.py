import json, re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

import boto3

PLANS = {"tokyo": {"origin": "TPE", "destination": "TYO"}, "seoul": {"origin": "TPE", "destination": "SEL"}}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
ddb = boto3.resource("dynamodb").Table("subscriptions")


def resp(status, body):
    return {"statusCode": status, "headers": {"content-type": "application/json"}, "body": json.dumps(body)}


def handler(event, context):
    try:
        data = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return resp(400, {"error": "invalid JSON"})

    email = str(data.get("email", "")).strip().lower()
    plan_name = str(data.get("plan_name", "")).strip().lower()
    if not EMAIL_RE.match(email):
        return resp(400, {"error": "invalid email"})
    if plan_name not in PLANS:
        return resp(400, {"error": "plan_name must be tokyo or seoul"})
    try:
        target = Decimal(str(data.get("target_price")))
    except (InvalidOperation, TypeError):
        return resp(400, {"error": "target_price must be a number"})
    if not target.is_finite() or target <= 0:
        return resp(400, {"error": "target_price must be positive"})

    plan = PLANS[plan_name]
    route = f"{plan['origin']}-{plan['destination']}"
    now = datetime.now(timezone.utc).isoformat()
    # M1: no subscription_status — a row means "eligible for alerts". created_at is kept on update.
    ddb.update_item(
        Key={"email": email, "route": route},
        UpdateExpression="SET plan_name=:p, origin=:o, destination=:d, target_price=:t, currency=:c, "
                         "updated_at=:u, created_at=if_not_exists(created_at, :u)",
        ExpressionAttributeValues={":p": plan_name, ":o": plan["origin"], ":d": plan["destination"],
                                   ":t": target, ":c": "TWD", ":u": now},
    )
    return resp(200, {"ok": True, "email": email, "route": route, "plan_name": plan_name,
                      "target_price": int(target) if target == target.to_integral() else float(target)})
