import json
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key

ddb = boto3.resource("dynamodb").Table("subscriptions")


def _num(v):
    if isinstance(v, Decimal):
        return int(v) if v == v.to_integral() else float(v)
    return v


def handler(event, context):
    # No auth in M1: trusts the client-supplied email. Production would verify the Supabase JWT here.
    email = ((event.get("queryStringParameters") or {}).get("email") or "").strip().lower()
    if not email:
        return {"statusCode": 400, "headers": {"content-type": "application/json"},
                "body": json.dumps({"error": "email is required"})}
    items = ddb.query(KeyConditionExpression=Key("email").eq(email))["Items"]
    return {"statusCode": 200, "headers": {"content-type": "application/json"},
            "body": json.dumps({"items": [{k: _num(v) for k, v in it.items()} for it in items]})}
