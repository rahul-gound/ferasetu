## 2026-08-14 - Hashed OTP and Delivery Codes
**Vulnerability:** Payment OTP and delivery codes were stored in plaintext in the database (in `orders.notes` and `orders.delivery_code`), allowing an attacker with DB access to bypass the hashed OTP requirement entirely.
**Learning:** Hashing one credential is not enough if another plaintext field exists that provides an alternative bypass in the verification logic.
**Prevention:** Always verify that no fallback mechanisms rely on plaintext credentials and securely hash all equivalent sensitive fields (both OTPs and delivery codes).
