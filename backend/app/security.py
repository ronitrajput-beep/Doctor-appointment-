import hashlib
import hmac
import os
import secrets
import time
import jwt
from fastapi import HTTPException, Request, Depends
from . import database as db

PRODUCTION = os.getenv("APP_ENV") == "production"
COOKIE = "aurelia_session"


def secret():
    value = os.getenv("JWT_SECRET")
    if value:
        if len(value) < 32:
            raise RuntimeError("JWT_SECRET must contain at least 32 characters")
        return value
    if PRODUCTION:
        raise RuntimeError("Production requires JWT_SECRET")
    path = db.DB_PATH.parent / ".jwt-secret"
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        try:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(fd, "w") as f:
                f.write(secrets.token_urlsafe(48))
        except FileExistsError:
            pass
    return path.read_text()


def hash_password(password):
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(
        password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1
    ).hex()
    return f"scrypt${salt}${digest}"


def verify(password, encoded):
    try:
        _, salt, expected = encoded.split("$")
        actual = hashlib.scrypt(
            password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1
        ).hex()
        return hmac.compare_digest(actual, expected)
    except ValueError:
        return False


DUMMY = hash_password("unused-dummy-password")


def public(user):
    return {k: v for k, v in dict(user).items() if k != "password_hash"}


def login_session(response, user_id):
    expiry = int(time.time()) + 8 * 3600
    jti = secrets.token_urlsafe(24)
    with db.transaction() as c:
        c.execute("DELETE FROM sessions WHERE expires_at < ?", (int(time.time()),))
        c.execute("INSERT INTO sessions VALUES(?,?,?)", (jti, user_id, expiry))
    token = jwt.encode(
        {
            "sub": user_id,
            "jti": jti,
            "exp": expiry,
            "iat": int(time.time()),
            "iss": "aurelia-care",
        },
        secret(),
        algorithm="HS256",
    )
    response.set_cookie(
        COOKIE,
        token,
        max_age=8 * 3600,
        httponly=True,
        secure=PRODUCTION,
        samesite="strict",
    )


def current(request: Request):
    try:
        data = jwt.decode(
            request.cookies.get(COOKIE, ""),
            secret(),
            algorithms=["HS256"],
            issuer="aurelia-care",
            options={"require": ["sub", "jti", "exp", "iat"]},
        )
        user = db.one(
            "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.user_id WHERE u.user_id=? AND s.jti=? AND s.expires_at>? AND u.active=1",
            (data["sub"], data["jti"], int(time.time())),
        )
        if user:
            request.state.jti = data["jti"]
            return public(user)
    except jwt.PyJWTError:
        pass
    raise HTTPException(401, "Please sign in to continue.")


def roles(*allowed):
    def check(user=Depends(current)):
        if user["role"] not in allowed:
            raise HTTPException(403, "Your account cannot perform this action.")
        return user

    return check
