import hashlib
import os
import base64

# REPLACE the word YOUR_PASSWORD_HERE inside the quotes below with your desired password!
password = "@Rinku_123"

iterations = 100000
salt = os.urandom(16)
hash_bytes = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, iterations)

def b64url(b):
    return base64.urlsafe_b64encode(b).decode('utf-8').rstrip('=')

print("\n--- COPY THE TEXT BELOW THIS LINE ---")
print(f"pbkdf2${iterations}$SHA-256${b64url(salt)}${b64url(hash_bytes)}")
print("-------------------------------------\n")
