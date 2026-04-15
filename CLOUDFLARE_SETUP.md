# Setting up Cloudflare for Fera Shopkeeper

To make your domain `fera-search.tech` work with user websites, follow these steps:

## 1. DNS Configuration in Cloudflare

1.  Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2.  Select your domain `fera-search.tech`.
3.  Go to **DNS** -> **Records**.
4.  Add a **Wildcard Record**:
    *   **Type:** `A` (or `CNAME` if you use a provider like Vercel).
    *   **Name:** `*`
    *   **IPv4 address:** Point to your server's public IP address.
    *   **Proxy status:** Proxy (Orange cloud) or DNS only (Grey cloud).
5.  Add a record for the **Base Domain**:
    *   **Type:** `A`
    *   **Name:** `@` (root)
    *   **IPv4 address:** Point to your server's public IP address.

## 2. SSL/TLS Settings

1.  Go to **SSL/TLS** -> **Overview**.
2.  Set encryption mode to **Full (strict)** if your server has a certificate, or **Full** otherwise.
3.  Go to **SSL/TLS** -> **Edge Certificates**.
4.  Enable **Always Use HTTPS**.

## 3. Application Configuration

Update your `backend/.env` and `frontend/.env` files:

**Backend:**
```env
BASE_DOMAIN=fera-search.tech
FRONTEND_URL=https://fera-search.tech
```

**Frontend:**
```env
VITE_BASE_DOMAIN=fera-search.tech
VITE_API_URL=https://api.fera-search.tech/api
```

## 4. Why "Sarvam is not talking"?

I have fixed the code to:
1.  Correctly map language codes for the Sarvam AI (e.g., `hi` -> `hi-IN`).
2.  Added a **Text-to-Speech (TTS)** integration in the AI Assistant page so it can "talk" back to you.
3.  Fixed the STT integration in the backend to correctly send audio files to Sarvam's Speech API.

**To test the AI Voice:**
1.  Go to the **AI Assistant** page.
2.  Make sure the **Voice: On** button is enabled in the top bar.
3.  Send a message. The AI should now play its response using Sarvam's Bulbul model.
