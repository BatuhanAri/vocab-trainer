# Vocab Trainer

## English

An SRS-focused vocabulary study app for organizing English word practice.

## Features
- Review due cards (SRS, SM-2-like).
- EN → TR / TR → EN study with grading (Forgot/Hard/Easy).
- Level filters (1-5) to adjust practice intensity.
- Remember mode to reinforce missed words.
- Remember mode with 3 study types: Typing, Matching, True/False.
- Library search with category and level filters.
- Single word add and bulk add.
- Offline usage with local SQLite database.

## Tech
- React + TypeScript + Vite
- Tauri (desktop app)
- SQLite (`@tauri-apps/plugin-sql`)

## Setup

Requirements:
- Node.js v20.19+ (or v22.12+)
- pnpm
- Rust + Tauri toolchain for desktop

## Smooth Setup on Any PC (Windows / macOS / Linux)

This project runs both as web (Vite) and desktop (Tauri).
- For web only, `Node.js v18+` and `pnpm` are enough.
- For desktop, install the Tauri system dependencies below.

### Windows
- Microsoft C++ Build Tools (select “Desktop development with C++” in Visual Studio Installer).
- Microsoft Edge WebView2 Runtime.
- Rust (install via rustup).

### macOS
- Xcode (or Command Line Tools if you only target desktop).
```bash
xcode-select --install
```
- Rust (install via rustup).

### Linux (Debian/Ubuntu)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```
- Rust (install via rustup).

You may need to restart the terminal after installing Rust.

```bash
pnpm install
```

## Run

Web (Vite):
```bash
pnpm dev
```

Web (Docker Compose):
```bash
docker compose up --build
```

Desktop (Tauri):
```bash
pnpm tauri:dev
```

## Build

Web build:
```bash
pnpm build
```

Desktop build:
```bash
pnpm tauri:build
```

## Docker (Web Only)

The Tauri desktop app does not run in Docker. Docker is only for the web (Vite) app.

Run:
```bash
docker compose up --build
```

Open in browser:
```text
http://localhost:5173
```

Prod-like (build + preview):
```bash
docker compose --profile prod up --build web_prod
```

Open in browser:
```text
http://localhost:4173
```

## Security Notes

- CSP is enabled for production. If you use external sources, update the `csp` field in `src-tauri/tauri.conf.json`.
- In Docker Compose, the dev server is bound only to `127.0.0.1` (not exposed to the LAN).

## Bulk Add Format

Each line must follow this format:

```text
term | turkce anlam | kategori | seviye
```

Steps:
1. Open the **Add Word** page in the app.
2. Paste your lines into the “Bulk” area (one word per line).
3. Click the `Add`/`Save` button.
4. On success, the app shows how many words were added.

Example:

```text
abandon | terk etmek | verb | 2
accurate | doğru | adjective | 1
achieve | başarmak | verb | 2
ancient | antik | adjective | 3
anxiety | kaygı | noun | 3
arrange | düzenlemek | verb | 2
attempt | girişim | noun | 2
benefit | fayda | noun | 1
brief | kısa | adjective | 1
capture | yakalamak | verb | 2
choice | seçim | noun | 1
crucial | kritik | adjective | 4
decline | reddetmek | verb | 3
efficient | verimli | adjective | 3
expand | genişletmek | verb | 2
frequent | sık | adjective | 2
glance | göz atmak | verb | 2
impact | etki | noun | 3
likely | muhtemel | adjective | 2
resource | kaynak | noun | 2
```

Level must be an integer between `1-5`.

## Single Add

Steps:
1. Open the **Add Word** page in the app.
2. Fill `Term`, `Turkish Meaning`, `Category`, `Level`.
3. Click `Save`.
4. On success, you’ll see the “Saved ✅” message.

## Scripts
- `pnpm dev`: Vite dev server
- `pnpm build`: TypeScript build + Vite build
- `pnpm tauri:dev`: Tauri dev
- `pnpm tauri:build`: Tauri build
- `pnpm lint`: ESLint
- `pnpm preview`: Vite preview

---

## Türkçe

İngilizce kelime çalışmasını düzenlemek için hazırlanmış, tekrar (SRS) ve pekiştirme odaklı bir kelime çalışma uygulaması.

## Özellikler
- Review ekranında zamanı gelen kartları görme (SRS, SM-2 benzeri).
- EN → TR / TR → EN yönüyle çalışma ve notlandırma (Forgot/Hard/Easy).
- Seviye filtreleri ile (1-5) pratik yoğunluğu seçimi.
- Remember modu ile yanlış yapılan kelimeleri pekiştirme.
- Remember modunda 3 çalışma türü: Yazarak, Eşleştirme, Doğru/Yanlış.
- Kütüphane ekranında arama, kategori ve seviye filtreleme.
- Tekli kelime ekleme ve toplu (bulk) ekleme.
- Yerel SQLite veritabanı ile offline kullanım.

## Teknoloji
- React + TypeScript + Vite
- Tauri (desktop uygulama)
- SQLite (`@tauri-apps/plugin-sql`)

## Kurulum

Gereksinimler:
- Node.js v20.19+ (veya v22.12+)
- pnpm
- Masaüstü için Rust + Tauri ortamı

## Her PC’de Sorunsuz Kurulum (Windows / macOS / Linux)

Bu proje hem web (Vite) hem de masaüstü (Tauri) olarak çalışır.
- Sadece web için `Node.js v18+` ve `pnpm` yeterli.
- Masaüstü için aşağıdaki Tauri sistem bağımlılıklarını da kurmalısın.

### Windows
- Microsoft C++ Build Tools (Visual Studio Installer içinde “Desktop development with C++” seç).
- Microsoft Edge WebView2 Runtime.
- Rust (rustup ile kurulum).

### macOS
- Xcode (ya da sadece masaüstü hedefliyorsan Xcode Command Line Tools).
```bash
xcode-select --install
```
- Rust (rustup ile kurulum).

### Linux (Debian/Ubuntu)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```
- Rust (rustup ile kurulum).

Rust kurduktan sonra terminali yeniden başlatmak gerekebilir.

```bash
pnpm install
```

## Çalıştırma

Web (Vite):
```bash
pnpm dev
```

Web (Docker Compose):
```bash
docker compose up --build
```

Masaüstü (Tauri):
```bash
pnpm tauri:dev
```

## Build

Web build:
```bash
pnpm build
```

Masaüstü build:
```bash
pnpm tauri:build
```

## Docker (Sadece Web)

Tauri masaüstü uygulaması Docker içinde çalışmaz. Docker ile sadece web (Vite) ayağa kaldırılır.

Çalıştırma:
```bash
docker compose up --build
```

Tarayıcıdan aç:
```text
http://localhost:5173
```

Prod benzeri (build + preview):
```bash
docker compose --profile prod up --build web_prod
```

Tarayıcıdan aç:
```text
http://localhost:4173
```

## Güvenlik Notları

- Tauri CSP üretim için aktiftir. Harici kaynak kullanırsan `src-tauri/tauri.conf.json` içindeki `csp` alanını güncelle.
- Docker Compose’da dev sunucusu yalnızca `127.0.0.1` üzerinden erişilebilir (ağa açık değildir).

## Security Audit Notes

### Commands Run

#### `pnpm audit --production`

Result:
```
ERR_PNPM_AUDIT_BAD_RESPONSE The audit endpoint (at https://registry.npmjs.org/-/npm/v1/security/audits) responded with 403: Forbidden
```

#### `npm audit --production`

Result:
```
npm warn config production Use `--omit=dev` instead.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
npm error code ENOLOCK
npm error audit This command requires an existing lockfile.
npm error audit Try creating one first with: npm i --package-lock-only
npm error audit Original error: loadVirtual requires existing shrinkwrap file
```

### Notes

- `pnpm audit` could not reach the npm audit endpoint due to a 403 response. This is likely caused by network/proxy/registry access policies in the current environment.
- `npm audit` could not run because the project does not include a `package-lock.json`. Since the project uses pnpm, generating a npm lockfile may not be desirable.

### Next Steps

- Re-run `pnpm audit --production` in an environment where the npm audit endpoint is accessible.
- If you prefer `npm audit`, generate a `package-lock.json` with `npm i --package-lock-only` and retry.

## Güvenlik Denetimi Notları

### Çalıştırılan Komutlar

#### `pnpm audit --production`

Sonuç:
```
ERR_PNPM_AUDIT_BAD_RESPONSE The audit endpoint (at https://registry.npmjs.org/-/npm/v1/security/audits) responded with 403: Forbidden
```

#### `npm audit --production`

Sonuç:
```
npm warn config production Use `--omit=dev` instead.
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
npm error code ENOLOCK
npm error audit This command requires an existing lockfile.
npm error audit Try creating one first with: npm i --package-lock-only
npm error audit Original error: loadVirtual requires existing shrinkwrap file
```

### Notlar

- `pnpm audit` npm audit endpoint’ine 403 hatası nedeniyle erişemedi. Bu durum genellikle mevcut ortamda ağ/proxy/registry erişim politikalarından kaynaklanır.
- `npm audit`, projede `package-lock.json` olmadığı için çalışmadı. Proje pnpm kullandığından npm lockfile üretmek tercih edilmeyebilir.

### Sonraki Adımlar

- npm audit endpoint’ine erişilebilen bir ortamda `pnpm audit --production` yeniden çalıştırılmalı.
- Eğer `npm audit` tercih edilecekse `npm i --package-lock-only` ile lockfile oluşturulup tekrar denenmeli.
## Toplu Kelime Ekleme Formatı

Her satır şu formatta olmalı:

```text
term | turkce anlam | kategori | seviye
```

Eklemek için adımlar:
1. Uygulamada **Add Word** sayfasına gir.
2. “Bulk” alanına her satıra 1 kelime gelecek şekilde formatı yapıştır.
3. `Add`/`Save` butonuna bas.
4. Başarılı olursa eklenen kelime sayısı mesaj olarak görünür.

Örnek:

```text
abandon | terk etmek | verb | 2
accurate | doğru | adjective | 1
achieve | başarmak | verb | 2
ancient | antik | adjective | 3
anxiety | kaygı | noun | 3
arrange | düzenlemek | verb | 2
attempt | girişim | noun | 2
benefit | fayda | noun | 1
brief | kısa | adjective | 1
capture | yakalamak | verb | 2
choice | seçim | noun | 1
crucial | kritik | adjective | 4
decline | reddetmek | verb | 3
efficient | verimli | adjective | 3
expand | genişletmek | verb | 2
frequent | sık | adjective | 2
glance | göz atmak | verb | 2
impact | etki | noun | 3
likely | muhtemel | adjective | 2
resource | kaynak | noun | 2
```

Seviye `1-5` arası tam sayı olmalı.

## Tekli Kelime Ekleme

Tek kelime eklemek için adımlar:
1. Uygulamada **Add Word** sayfasına gir.
2. `Term`, `Turkish Meaning`, `Category`, `Level` alanlarını doldur.
3. `Save` butonuna bas.
4. Başarılı olursa “Saved ✅” mesajını görürsün.

## Scriptler
- `pnpm dev`: Vite dev server
- `pnpm build`: TypeScript build + Vite build
- `pnpm tauri:dev`: Tauri dev
- `pnpm tauri:build`: Tauri build
- `pnpm lint`: ESLint
- `pnpm preview`: Vite preview
