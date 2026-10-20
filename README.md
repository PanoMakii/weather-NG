# Weather NG

Weather NG is a vanilla HTML, CSS, and JavaScript weather dashboard. Weather and
location search work without an API key. Firebase is optional and is only
needed for account sign-in and cloud-synced preferences.

## Run locally

No package install or build step is required. Install Node.js if you want to
run the JavaScript syntax check; the app itself can be served by Python or VS
Code Live Server.

In VS Code, choose **File → Open Folder** and select the `weatherApp` folder.
Then either install the **Live Server** extension and choose **Go Live**, or
open a terminal in the folder and run:

```powershell
py -m http.server 8000
```

Open <http://localhost:8000>. Do not open `index.html` directly as a `file://`
URL: serving it over localhost avoids browser module-loading restrictions.
Browser geolocation generally requires localhost or HTTPS.

## Free services and libraries

- Weather and location search use Open-Meteo's public APIs. They require no
  API key for personal, non-commercial use. Follow the current Open-Meteo terms
  and attribution requirements before publishing or using this commercially.
- The map uses Leaflet and OpenStreetMap tiles, with the required map
  attribution shown. The public tile server is intended for reasonable use and
  does not provide a commercial service-level guarantee.
- Chart.js, Leaflet, and the Inter typeface are available under open-source or
  free-to-use licenses. They are loaded from public CDNs, so the page needs an
  internet connection.
- No paid weather, map, or chart service is required for guest use.

## Optional Firebase sign-in

Guest weather works without Firebase. To enable sign-in, registration, password
reset, and cloud-synced favorites:

1. In the [Firebase Console](https://console.firebase.google.com/), create or
   select the project `weather-ng-9c0cf`.
2. Under **Build → Authentication**, choose **Get started** if prompted. Under
   **Sign-in method**, enable **Email/Password** and save. In Authentication
   **Settings → Authorized domains**, verify `localhost` is listed for local
   testing.
3. Under **Build → Firestore Database**, create a database. Choose a location
   and start in production mode.
4. Under **Project settings → General → Your apps**, register a web app if one
   is not already registered. Copy its Firebase configuration into the
   `firebaseConfig` object near the top of `app.js`. The project configuration
   is already filled in for `weather-ng-9c0cf`; confirm it matches the web app
   in your Firebase project.
5. The app loads Firebase Authentication and Firestore from Google's modular
   SDK CDN when the config is present; no `npm install` or SDK imports are
   needed. Use the local server instructions above, then reload the page.
6. In Firestore **Rules**, publish owner-only rules:

   ```text
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null
           && request.auth.uid == userId;
       }
     }
   }
   ```

Firebase web configuration is public client configuration, not a server secret.
Firestore security rules must be enabled as shown; never publish a database
with open read/write rules. Firebase has usage limits on the free plan; check
the current Firebase terms before deploying.

If sign-in reports `auth/configuration-not-found`, confirm Authentication was
started for this exact project and that **Email/Password** is enabled. If
Firebase reports an unauthorized domain, add the hostname shown in the error
to Authentication **Settings → Authorized domains**.

## Included behavior

- Search and select places, with debounced suggestions.
- Current conditions, a scrollable 12-hour forecast, a recent historical day
  when the weather service provides it, and a seven-day forecast with daily
  rain chance and sunrise/sunset.
- Seven-day high/low temperature chart and a switchable rain-probability chart.
- Cloud Mode compares a fixed set of ten cities and displays the top five by
  transparent weather thresholds. It is a curated comparison, not a global
  extreme-weather detection service. Results are cached for 15 minutes; use
  Refresh to bypass that cache.
- Celsius/Fahrenheit display, light/dark themes, and browser geolocation.
- Guest favorites and preferences stored locally.
- Last successful weather response cached locally for offline viewing of that
  same city.
- Optional Firebase modular SDK account flows and cloud storage for favorites
  and home city.

## Check the JavaScript

With Node.js installed, check the app script syntax:

```powershell
node --check app.js
```

The live forecast needs an internet connection. Firebase flows additionally
need a configured Firebase project and enabled Authentication/Firestore.
The WeatherAPI.com key included in the original project brief is not used or
copied into this static client. Client-side keys are visible to visitors; use a
server-side proxy and provider-approved terms if a protected paid API is
needed.
