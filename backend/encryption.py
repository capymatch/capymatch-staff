"""Field-level encryption for sensitive data (Gmail tokens, etc.)."""
from cryptography.fernet import Fernet
import os
import base64
import hashlib

_cipher = None


def _get_cipher():
    global _cipher
    if _cipher is None:
        key = os.environ.get("ENCRYPTION_KEY", "")
        if not key:
            seed = os.environ.get("MONGO_URL", "fallback-seed")
            derived = hashlib.sha256(seed.encode()).digest()
            key = base64.urlsafe_b64encode(derived).decode()
        if len(base64.urlsafe_b64decode(key + "==")) != 32:
            seed = key
            derived = hashlib.sha256(seed.encode()).digest()
            key = base64.urlsafe_b64encode(derived).decode()
        _cipher = Fernet(key)
    return _cipher


def encrypt_value(plaintext: str) -> str:
    if not plaintext:
        return plaintext
    return _get_cipher().encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    if not ciphertext:
        return ciphertext
    try:
        return _get_cipher().decrypt(ciphertext.encode()).decode()
    except Exception:
        return ciphertext
