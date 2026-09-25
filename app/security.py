from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()


def hash_pin(pin: str) -> str:
    return password_hash.hash(pin)


def verify_pin(pin: str, hashed_pin: str) -> bool:
    return password_hash.verify(pin, hashed_pin)