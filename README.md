# Mehvash & Aliqyaan — Invitation website (one repository)

| Page | Link | RSVPs go to (Google Sheet tab) |
|---|---|---|
| Wedding Reception | https://mehvashaliqyaan.github.io/mehvash_aliqyaan/wedding.html | **Reception** |
| Wedding Reception — Mehvash & Raju card | https://mehvashaliqyaan.github.io/mehvash_aliqyaan/mehvash_raju_wedding.html | **Mehvash & Raju** |
| Mehendi | https://mehvashaliqyaan.github.io/mehvash_aliqyaan/mehendi.html | **Mehendi** (ladies & gents counted separately) |
| Host guest lists | https://mehvashaliqyaan.github.io/mehvash_aliqyaan/host.html | shows each list in its own tab |

`index.html` simply opens `wedding.html`, so the old link https://mehvashaliqyaan.github.io/mehvash_aliqyaan/ keeps working.

## Google Apps Script (must be updated once)

1. Google Sheet → **Extensions → Apps Script** → delete the old code → paste `Google_Apps_Script.gs` → **Save**.
2. Select **setup** → **Run**. Creates the **Reception**, **Mehvash & Raju**, **Mehendi** and **Summary** tabs
   (an existing **RSVP** tab is renamed to **Reception**, rows kept).
3. **Deploy → Manage deployments → pencil (Edit) → Version: New version → Deploy.** The `/exec` link stays the same.

If host.html says the script is the OLD version, step 3 was not done (saving alone does not publish).

## Files

| File | Purpose |
|---|---|
| `wedding.html`, `mehvash_raju_wedding.html`, `mehendi.html` | The invitation pages |
| `index.html` | Opens wedding.html |
| `host.html` | Private guest lists (needs your HOST_KEY) |
| `css/style.css` | Shared styling for all pages; adapts to every screen size |
| `js/invitation.js` | Opening, countdown (date from `data-target` in each page), music |
| `js/rsvp.js` | Sends RSVPs (event from `data-event` on each page's form) |
| `js/config.js` | Your Google Apps Script `/exec` link |
| `Google_Apps_Script.gs` | The script that runs inside your Google Sheet |
| `audio/`, `images/` | Music, opening picture, flowers, divider, arch border |

Guest data is stored only in your private Google Sheet, never on GitHub.
