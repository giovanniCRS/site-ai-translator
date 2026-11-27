# 🌐 SiteTranslator

**Client-side AI translator for static websites (`HTML`, `JS`, `PHP`) powered by the Groq API.**  
Drag & drop your project folder or a `.zip` archive, keep your CSS and assets 100% intact, and download the localized website directly from your browser — **zero backend required**.

🔗 **Live Demo:** [https://giovannicrs.github.io/site-ai-translator/](https://giovannicrs.github.io/site-ai-translator/)

---

## ✨ Key Features

* **100% Browser-Side & Privacy-First:** No files are uploaded to any third-party server. Your Groq API key is stored locally in your browser's `localStorage` and only extracted text strings are sent to the API.
* **CSS & Layout Safe:** Uses the browser's native `DOMParser` to extract only visible text nodes and translatable attributes (`alt`, `title`, `placeholder`, `aria-label`, `meta` tags), completely ignoring `<script>`, `<style>`, `<svg>`, `<code>`, and `<pre>`.
* **XML Micro-Batching & Code Chunking:** Splits HTML texts into lightweight `<t id="...">` XML batches (immune to JSON quote-escaping errors) and chunks `.js` / `.php` files to avoid output truncation on large pages.
* **Deterministic Link & Lang Updates:** Automatically updates `<html lang="...">` and prepends the chosen language prefix (e.g., `/en/`, `/fr/`) to internal `.html` and `.php` links.
* **Live Groq Model Sync & Quality Rating:** Automatically fetches active chat models from your Groq account (`GET /openai/v1/models`), filters out audio/moderation models, and ranks them with a **Green / Orange / Red** suitability indicator for web localization.
* **Smart Rate-Limit Recovery:** Automatically reads `retry-after` headers and Groq `429` error messages to wait the exact cooldown time before retrying.
* **Instant ZIP Export:** Copies all static assets (images, CSS, fonts) and packages the translated project into a ready-to-deploy `.zip` via `JSZip`.

---

## 🚀 How to Use

1. Get a free API key from the [Groq Console](https://console.groq.com/keys).
2. Open the **[Live App](https://YOUR-USERNAME.github.io/site-translator/)** (or open `index.html` locally in your browser).
3. Click the **Settings (gear icon)** in the sidebar and paste your Groq API key — the app will automatically load and recommend the best models available on your account.
4. Choose your target language and URL prefix (e.g., `English` / `/en/`).
5. **Drag & drop** your website folder (or `.zip` file) into the dropzone and click **Avvia traduzione**.
6. Monitor progress in the resizable live terminal and download your localized `.zip` when done.

---

## 🛠️ Tech Stack

* **Frontend:** Vanilla HTML5, CSS3, JavaScript (single-file architecture)
* **HTML Parsing:** Native Browser `DOMParser`
* **ZIP Handling:** [JSZip](https://stuk.github.io/jszip/) (via CDN)
* **AI Inference:** [Groq API](https://groq.com/) (OpenAI-compatible endpoint)

---

## 📦 Self-Hosting (GitHub Pages)

Since the entire application lives in a single `index.html` file:

1. Fork or clone this repository.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, select the `main` branch and `/ (root)` folder, then click **Save**.

---

## 📄 License

This project is licensed under the **MIT License**.