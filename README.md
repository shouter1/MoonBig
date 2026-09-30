# MoonBig
Sky Tracker for Astrophotography/General Use

## What this app now includes
- Clean white acrylic themed UI
- Location-based sky placement of planets, moons, constellations, and notable deep-sky targets
- Live keyword search that narrows objects as typing progresses
- Sideways 2D sky graph (azimuth vs altitude)
- Separate direction/angle view for selected object
- "Show all sky objects" mode plus look-around heading filter (enabled by default)
- Toggleable Wikipedia links for notable objects
- Cloud coverage (Open-Meteo) and estimated Bortle class panel
- Approximate sky preview when location is not set yet
- Improved location request status and error messages

## Run the desktop app
### Requirements
- Node.js 20+ and npm

### Setup
1. Install dependencies:
   - `npm install`

### Start
1. Launch MoonBig:
   - `npm start`

MoonBig runs as an Electron desktop app and does not require self-hosting in a browser.

## How to use
1. Click **Use My Location** and allow geolocation access.
2. Type in the search box to find objects by name.
3. Enable **Show all sky objects** to browse all available items.
4. Enable **Look-around mode** and move the heading slider to filter by direction.
5. Click **Direction & angle** on any object to view detailed pointing info.

## Troubleshooting
- **Electron sandbox error on Linux CI/headless environments:** run with `npm start -- --no-sandbox`.
- **Missing display server (headless runner):** Electron GUI apps require a desktop/X server to open a window.
