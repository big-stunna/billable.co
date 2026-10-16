# billable.co — Fair & Instant Bill Splitter

A one-page bill splitting web app for dinners, trips, groceries and other shared expenses. Enter an occasion, the bill amount and the number of people, and it shows exactly what each person pays. The shares always add up to the bill, down to the last paisa or cent.

Built for **ZeroCode, Techfest 2026 (IIT Bombay)**, a prompt engineering challenge. The app was generated entirely through prompts in Google AI Studio (Gemini Flash), with no manual coding. It uses only vanilla HTML, CSS and JavaScript, with no frameworks or libraries.

## Features

- **Equal or custom splits.** Split evenly, or set each person's contribution, with a live balance check and an auto-balance button.
- **Exact totals.** Amounts are calculated in whole paise/cents, and any leftover from rounding is shared out so the parts sum exactly to the bill.
- **Input validation.** If the bill or the number of people is empty, zero or negative, it shows a clear message and no result.
- **Tips.** Choose 5%, 10%, 15% or 20%, or enter your own percentage.
- **Multiple currencies.** Pick a currency, with optional conversion to a home currency.
- **Survives a reload.** The current bill and the result are saved in `localStorage`.
- **Recent bills.** Reload, delete or clear past bills.
- **Share.** Copy a text summary to the clipboard, or use the device's share sheet.
- **Responsive.** Works on desktop and mobile.

## How to run

You don't need to install anything or run a server.

1. Download or clone this repository:
   ```bash
   git clone https://github.com/big-stunna/billable.co.git
   ```
2. Keep **`index.html`, `style.css` and `script.js` in the same folder.** `index.html` loads the other two by relative path (`./style.css`, `./script.js`), so if you separate them the page will show up without styling or behaviour.
3. Double-click `index.html` to open it in any modern browser (Chrome, Firefox, Edge, Safari).

## Project files

| File | Purpose |
|---|---|
| `index.html` | Page structure and layout |
| `style.css` | Styling, theme and responsive layout |
| `script.js` | Split calculation, validation, persistence, history and sharing |

The other files (`src/`, `package.json`, `vite.config.ts`, `tsconfig.json`, `metadata.json`, `.env.example`) are the default scaffold that Google AI Studio creates. The app doesn't need them.
