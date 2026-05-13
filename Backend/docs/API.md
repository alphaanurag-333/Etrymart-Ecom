# EtryMart API — cURL examples

Public JSON API. The app mounts routes at **`/api`** (see `server.js`). Default server port is **`5000`** (override with `PORT` in `.env`).

Set a base URL in your shell (bash / Git Bash / WSL):

```bash
export BASE_URL="http://localhost:5000/api"
```

On **PowerShell**:

```powershell
$env:BASE_URL = "http://localhost:5000/api"
```

---

## User misc (storefront / public)

Base path: **`/api/user/misc`**. No authentication required.

### Get active banners

Returns banners with `status: active` and within `start_date` / `end_date` when set.

**Optional query**

| Parameter      | Description |
|----------------|-------------|
| `banner_type`  | One of: `main_banner`, `popup_banner`, `ads_img_banner`, `ads_video_banner` |

```bash
curl -sS "${BASE_URL}/user/misc/banners"
```

```bash
curl -sS "${BASE_URL}/user/misc/banners?banner_type=main_banner"
```

PowerShell:

```powershell
curl.exe -sS "$env:BASE_URL/user/misc/banners"
curl.exe -sS "$env:BASE_URL/user/misc/banners?banner_type=main_banner"
```

---

### Get active try-on banners

```bash
curl -sS "${BASE_URL}/user/misc/try-on-banners"
```

PowerShell:

```powershell
curl.exe -sS "$env:BASE_URL/user/misc/try-on-banners"
```

---

### Get active categories

```bash
curl -sS "${BASE_URL}/user/misc/categories"
```

PowerShell:

```powershell
curl.exe -sS "$env:BASE_URL/user/misc/categories"
```

---

### Get subcategories (optional filter by category)

Returns subcategories with **`status: active`**.

**Optional query**

| Parameter   | Description |
|-------------|-------------|
| `category`  | MongoDB ObjectId of the parent category. If omitted, all active subcategories are returned. |

Replace `CATEGORY_ID` with a real category id from your database.

```bash
curl -sS "${BASE_URL}/user/misc/subcategories"
```

```bash
curl -sS "${BASE_URL}/user/misc/subcategories?category=CATEGORY_ID"
```

Example with a placeholder id (will 400 if invalid):

```bash
curl -sS "${BASE_URL}/user/misc/subcategories?category=507f1f77bcf86cd799439011"
```

PowerShell (note `curl` is an alias for `Invoke-WebRequest`; use `curl.exe` for these examples):

```powershell
curl.exe -sS "$env:BASE_URL/user/misc/subcategories"
curl.exe -sS "$env:BASE_URL/user/misc/subcategories?category=CATEGORY_ID"
```

---

### Pretty-print JSON (optional)

Pipe through `jq` if installed:

```bash
curl -sS "${BASE_URL}/user/misc/categories" | jq .
```

---

### Verbose request (debug)

```bash
curl -v "${BASE_URL}/user/misc/banners"
```
