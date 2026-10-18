import jwt

# Убираем отсюда
SECRET_KEY = "super-secret-key"
ALGORITHM = "HS256"

def encode(payload):
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token

def decode(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError as e:
        raise e
    except jwt.InvalidTokenError as e:
        raise e
