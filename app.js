const STORE_KEYS = {
  unit: "weatherNG-unit",
  theme: "weatherNG-theme",
  favorites: "weatherNG-favorites",
  defaultCity: "weatherNG-default-city",
  lastCity: "weatherNG-last-city",
  weatherCache: "weatherNG-weather-cache",
  cloudCache: "weatherNG-cloud-cache",
};

const firebaseConfig = {
  apiKey: "AIzaSyA-crnfgRwrWvJq6ZwDoKzy4_0UtT_1QCY",
  authDomain: "weather-ng-9c0cf.firebaseapp.com",
  projectId: "weather-ng-9c0cf",
  storageBucket: "weather-ng-9c0cf.firebasestorage.app",
  messagingSenderId: "612842080289",
  appId: "1:612842080289:web:ab1b1a45312efe6221bb60",
  measurementId: "G-DEMBHZHV0V",
};

const cloudCities = [
  { name: "Lagos", country: "Nigeria", latitude: 6.5244, longitude: 3.3792 },
  { name: "London", country: "United Kingdom", latitude: 51.5072, longitude: -0.1276 },
  { name: "Toronto", country: "Canada", latitude: 43.6532, longitude: -79.3832 },
  { name: "Dubai", country: "United Arab Emirates", latitude: 25.2048, longitude: 55.2708 },
  { name: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503 },
  { name: "Reykjavik", country: "Iceland", latitude: 64.1466, longitude: -21.9426 },
  { name: "Nairobi", country: "Kenya", latitude: -1.2921, longitude: 36.8219 },
  { name: "New York", country: "United States", latitude: 40.7128, longitude: -74.0060 },
  { name: "Cape Town", country: "South Africa", latitude: -33.9249, longitude: 18.4241 },
  { name: "Sydney", country: "Australia", latitude: -33.8688, longitude: 151.2093 },
];

const state = {
  unit: localStorage.getItem(STORE_KEYS.unit) || "C",
  theme: localStorage.getItem(STORE_KEYS.theme)
    || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"),
  guestFavorites: readStoredFavorites(),
  authMode: "login",
  weather: null,
  selectedCity: null,
  favorites: [],
  user: null,
  authReady: false,
  searchTimer: null,
  weatherRequestId: 0,
  searchRequestId: 0,
  map: null,
  dailyChart: null,
  chartMode: "temperature",
  cloudRequestId: 0,
};

const refs = {
  authScreen: document.getElementById("authScreen"),
  appShell: document.getElementById("appShell"),
  authStatus: document.getElementById("authStatus"),
  appStatus: document.getElementById("appStatus"),
  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  locationName: document.getElementById("locationName"),
  locationSub: document.getElementById("locationSub"),
  lastUpdated: document.getElementById("lastUpdated"),
  weatherIcon: document.getElementById("weatherIcon"),
  currentTemp: document.getElementById("currentTemp"),
  feelsLike: document.getElementById("feelsLike"),
  dailyHigh: document.getElementById("dailyHigh"),
  dailyLow: document.getElementById("dailyLow"),
  weatherText: document.getElementById("weatherText"),
  conditionBadge: document.getElementById("conditionBadge"),
  windSpeed: document.getElementById("windSpeed"),
  windGust: document.getElementById("windGust"),
  humidity: document.getElementById("humidity"),
  uvIndex: document.getElementById("uvIndex"),
  visibility: document.getElementById("visibility"),
  pressure: document.getElementById("pressure"),
  cloudCover: document.getElementById("cloudCover"),
  dewPoint: document.getElementById("dewPoint"),
  precipitation: document.getElementById("precipitation"),
  forecastList: document.getElementById("forecastList"),
  historyList: document.getElementById("historyList"),
  favoritesList: document.getElementById("favoritesList"),
  favoriteToggle: document.getElementById("favoriteToggle"),
  weatherMap: document.getElementById("weatherMap"),
  hourlyList: document.getElementById("hourlyList"),
  dailyChart: document.getElementById("dailyChart"),
  sunrise: document.getElementById("sunrise"),
  sunset: document.getElementById("sunset"),
  chartRange: document.getElementById("chartRange"),
  cloudRefresh: document.getElementById("cloudRefresh"),
  cloudList: document.getElementById("cloudList"),
  authToggle: document.getElementById("authToggle"),
  themeToggle: document.getElementById("themeToggle"),
  guestBtn: document.getElementById("guestBtn"),
  locationBtn: document.getElementById("locationBtn"),
  refreshWeatherBtn: document.getElementById("refreshWeatherBtn"),
  homeBtn: document.getElementById("homeBtn"),
};

const ui = {
  setAuthMode(mode) {
    state.authMode = mode;
    document.querySelectorAll(".tab").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === mode);
    });
    document.querySelectorAll(".auth-form").forEach((form) => {
      form.classList.toggle("active", form.id === `${mode}Form`);
    });
  },
  setStatus(message, isError = false) {
    refs.authStatus.textContent = message || "";
    refs.authStatus.style.color = isError ? "var(--danger)" : "var(--muted)";
  },
  renderUnitButtons() {
    document.querySelectorAll(".segment").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.unit === state.unit);
    });
  },
  toggleThemeButton() {
    refs.themeToggle.textContent = state.theme === "dark" ? "☀" : "☾";
  },
};

let firebaseApp = null;
let auth = null;
let db = null;
let firebaseApi = null;

function readStoredFavorites() {
  try {
    const value = JSON.parse(localStorage.getItem(STORE_KEYS.favorites) || "[]");
    if (!Array.isArray(value)) {
      return [];
    }
    return value.filter((city) => city && typeof city.name === "string");
  } catch {
    return [];
  }
}

function formatWeatherDate(value) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function init() {
  applyTheme();
  applyUnit();
  bindEvents();
  loadGuestFavorites();
  setDefaultHome();
  const firebaseConfigured = Object.values(firebaseConfig)
    .every((value) => value && !value.includes("YOUR_"));
  setupFirebase();
  loadCloudMode();
  if (!firebaseConfigured) {
    loadDefaultWeather();
  }
  if (navigator.geolocation) {
    refs.locationBtn.disabled = false;
  }
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => ui.setAuthMode(button.dataset.mode));
  });

  document.getElementById("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    await signIn(email, password);
  });

  document.getElementById("signupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();
    await signUp(name, email, password);
  });

  document.getElementById("resetForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.getElementById("resetEmail").value.trim();
    await sendResetLink(email);
  });

  refs.guestBtn.addEventListener("click", () => {
    closeAuthScreen();
    loadDefaultWeather();
  });

  refs.authToggle.addEventListener("click", () => {
    if (state.user) {
      signOut();
      return;
    }
    refs.authScreen.classList.remove("hidden");
    refs.appShell.classList.add("hidden");
    if (!state.authReady) {
      ui.setStatus("Sign-in needs a Firebase project configuration. Guest weather is ready to use.");
    }
  });

  refs.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem(STORE_KEYS.theme, state.theme);
    applyTheme();
    renderDailyChart();
  });

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.unit = button.dataset.unit;
      localStorage.setItem(STORE_KEYS.unit, state.unit);
      applyUnit();
      renderWeather();
    });
  });

  refs.searchInput.addEventListener("input", debounce((event) => {
    const query = event.target.value.trim();
    if (!query) {
      state.searchRequestId += 1;
      refs.searchResults.classList.add("hidden");
      refs.searchResults.innerHTML = "";
      return;
    }
    searchLocations(query);
  }, 350));

  refs.locationBtn.addEventListener("click", () => {
    getCurrentLocation();
  });

  refs.refreshWeatherBtn.addEventListener("click", () => {
    const target = state.selectedCity ? state.selectedCity.name : localStorage.getItem(STORE_KEYS.lastCity) || localStorage.getItem(STORE_KEYS.defaultCity) || "Lagos";
    fetchWeather(target);
  });

  refs.homeBtn.addEventListener("click", () => {
    const homeCity = localStorage.getItem(STORE_KEYS.defaultCity) || "Lagos";
    fetchWeather(homeCity);
  });

  refs.favoriteToggle.addEventListener("click", toggleFavorite);
  refs.cloudRefresh.addEventListener("click", () => loadCloudMode(true));

  document.querySelectorAll(".chart-mode").forEach((button) => {
    button.addEventListener("click", () => {
      state.chartMode = button.dataset.chartMode;
      document.querySelectorAll(".chart-mode").forEach((option) => {
        option.classList.toggle("active", option === button);
      });
      renderDailyChart();
    });
  });

  const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
  systemTheme.addEventListener("change", (event) => {
    if (!localStorage.getItem(STORE_KEYS.theme)) {
      state.theme = event.matches ? "light" : "dark";
      applyTheme();
      renderDailyChart();
    }
  });
}

function applyTheme() {
  document.body.classList.toggle("light", state.theme === "light");
  ui.toggleThemeButton();
}

function applyUnit() {
  ui.renderUnitButtons();
}

function setDefaultHome() {
  const saved = localStorage.getItem(STORE_KEYS.defaultCity);
  if (!saved) {
    localStorage.setItem(STORE_KEYS.defaultCity, "Lagos");
  }
}

function loadGuestFavorites() {
  state.guestFavorites = readStoredFavorites();
  state.favorites = [...state.guestFavorites];
  renderFavorites();
}

function renderFavorites() {
  refs.favoritesList.innerHTML = "";

  if (!state.favorites.length) {
    refs.favoritesList.innerHTML = "<p class='muted-label'>No saved cities yet.</p>";
    return;
  }

  state.favorites.forEach((city) => {
    const item = document.createElement("div");
    item.className = "favorite-item";
    const main = document.createElement("div");
    main.className = "favorite-main";
    const name = document.createElement("strong");
    name.textContent = city.name;
    const country = document.createElement("span");
    country.textContent = city.country || "";
    main.append(name, country);

    const actions = document.createElement("div");
    actions.className = "favorite-actions";
    const open = document.createElement("button");
    open.className = "mini-btn";
    open.type = "button";
    open.textContent = "Open";
    const home = document.createElement("button");
    home.className = "mini-btn";
    home.type = "button";
    home.textContent = "Home";
    const remove = document.createElement("button");
    remove.className = "mini-btn";
    remove.type = "button";
    remove.textContent = "-";
    remove.setAttribute("aria-label", `Remove ${city.name} from saved cities`);
    actions.append(open, home, remove);
    item.append(main, actions);

    const location = city.lat != null && city.lon != null
      ? {
          name: city.name,
          admin1: city.region || "",
          country: city.country || "",
          latitude: city.lat,
          longitude: city.lon,
        }
      : null;
    open.addEventListener("click", () => fetchWeather(city.name, location));
    home.addEventListener("click", async () => {
      localStorage.setItem(STORE_KEYS.defaultCity, city.name);
      try {
        await saveUserPreferences();
      } catch (error) {
        showAppStatus(`Could not save your home city: ${error.message}`, true);
      }
      fetchWeather(city.name, location);
    });
    remove.addEventListener("click", () => removeFavorite(city));

    refs.favoritesList.appendChild(item);
  });
}

async function removeFavorite(city) {
  state.favorites = state.favorites.filter((favorite) => !isSameCity(favorite, city));
  try {
    await persistFavorites();
  } catch (error) {
    showAppStatus(`Could not sync favorites: ${error.message}`, true);
  }
  renderFavorites();
  syncFavoriteButton();
}

async function toggleFavorite() {
  if (!state.selectedCity) {
    return;
  }

  const cityName = state.selectedCity.name;
  const cityData = {
    name: cityName,
    region: state.selectedCity.region || "",
    country: state.selectedCity.country || "",
    lat: state.selectedCity.lat,
    lon: state.selectedCity.lon,
  };
  const existing = state.favorites.find((city) => isSameCity(city, cityData));

  if (existing) {
    state.favorites = state.favorites.filter((city) => !isSameCity(city, cityData));
  } else {
    state.favorites.push(cityData);
  }

  try {
    await persistFavorites();
  } catch (error) {
    showAppStatus(`Could not sync favorites: ${error.message}`, true);
  }

  renderFavorites();
  syncFavoriteButton();
}

function isSameCity(first, second) {
  if (first.lat != null && first.lon != null && second.lat != null && second.lon != null) {
    return first.lat === second.lat && first.lon === second.lon;
  }
  return first.name.toLowerCase() === second.name.toLowerCase()
    && (first.country || "").toLowerCase() === (second.country || "").toLowerCase();
}

async function persistFavorites() {
  if (state.user) {
    await saveUserFavorites();
  } else {
    localStorage.setItem(STORE_KEYS.favorites, JSON.stringify(state.favorites));
  }
}

function syncFavoriteButton() {
  if (!state.selectedCity) {
    refs.favoriteToggle.classList.remove("active");
    refs.favoriteToggle.textContent = "☆";
    return;
  }

  const active = state.favorites.some((city) => isSameCity(city, state.selectedCity));
  refs.favoriteToggle.classList.toggle("active", active);
  refs.favoriteToggle.textContent = active ? "★" : "☆";
}

function closeAuthScreen() {
  refs.authScreen.classList.add("hidden");
  refs.appShell.classList.remove("hidden");
  ui.setStatus("");
}

function showAppStatus(message, isError = false) {
  refs.appStatus.textContent = message;
  refs.appStatus.classList.toggle("error", isError);
  refs.appStatus.classList.toggle("visible", Boolean(message));
}

async function signIn(email, password) {
  if (!auth || !firebaseApi) {
    ui.setStatus("Firebase is not configured yet. Add your project keys in app.js.", true);
    return;
  }

  try {
    ui.setStatus("Signing in...");
    await firebaseApi.signInWithEmailAndPassword(auth, email, password);
    closeAuthScreen();
  } catch (error) {
    ui.setStatus(error.message, true);
  }
}

async function signUp(name, email, password) {
  if (!auth || !firebaseApi) {
    ui.setStatus("Firebase is not configured yet. Add your project keys in app.js.", true);
    return;
  }

  try {
    ui.setStatus("Creating account...");
    const result = await firebaseApi.createUserWithEmailAndPassword(auth, email, password);
    if (result.user) {
      await firebaseApi.updateProfile(result.user, { displayName: name });
      await firebaseApi.setDoc(firebaseApi.doc(db, "users", result.user.uid), {
        name,
        email,
        favorites: state.guestFavorites,
        defaultCity: localStorage.getItem(STORE_KEYS.defaultCity) || "Lagos",
      }, { merge: true });
      closeAuthScreen();
      await loadUserData();
    }
  } catch (error) {
    ui.setStatus(error.message, true);
  }
}

async function sendResetLink(email) {
  if (!auth || !firebaseApi) {
    ui.setStatus("Firebase is not configured yet. Add your project keys in app.js.", true);
    return;
  }

  try {
    await firebaseApi.sendPasswordResetEmail(auth, email);
    ui.setStatus("Password reset email sent.");
  } catch (error) {
    ui.setStatus(error.message, true);
  }
}

async function signOut() {
  if (!auth || !firebaseApi) {
    ui.setStatus("Firebase is not configured yet. Add your project keys in app.js.", true);
    return;
  }

  try {
    await firebaseApi.signOut(auth);
    state.user = null;
    refs.authToggle.textContent = "Sign in";
    showAppStatus("Signed out.");
  } catch (error) {
    showAppStatus(error.message, true);
  }
}

async function setupFirebase() {
  const hasValues = Object.values(firebaseConfig).every((value) => value && !value.includes("YOUR_"));

  if (!hasValues) {
    state.authReady = false;
    refs.authToggle.textContent = "Sign in";
    return;
  }

  try {
    const [appSdk, authSdk, firestoreSdk] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
    ]);
    firebaseApi = { ...appSdk, ...authSdk, ...firestoreSdk };
    firebaseApp = firebaseApi.initializeApp(firebaseConfig);
    auth = firebaseApi.getAuth(firebaseApp);
    db = firebaseApi.getFirestore(firebaseApp);
    state.authReady = true;

    firebaseApi.onAuthStateChanged(auth, async (user) => {
      state.user = user;
      refs.authToggle.textContent = user ? "Sign out" : "Sign in";
      if (user) {
        try {
          await loadUserData();
        } catch (error) {
          showAppStatus(`Could not load your saved settings: ${error.message}`, true);
        }
        closeAuthScreen();
      } else {
        state.favorites = [...state.guestFavorites];
        renderFavorites();
      }
      await loadDefaultWeather();
    });
  } catch (error) {
    state.authReady = false;
    await loadDefaultWeather();
    showAppStatus(`Firebase could not initialize: ${error.message}`, true);
  }
}

async function loadUserData() {
  if (!state.user || !db) {
    return;
  }

  const docRef = firebaseApi.doc(db, "users", state.user.uid);
  const snapshot = await firebaseApi.getDoc(docRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    state.favorites = Array.isArray(data.favorites) ? data.favorites : [];
    if (data.defaultCity) {
      localStorage.setItem(STORE_KEYS.defaultCity, data.defaultCity);
    }
  } else {
    state.favorites = [...state.guestFavorites];
  }

  renderFavorites();
}

async function saveUserFavorites() {
  if (!state.user || !db) {
    return;
  }

  const docRef = firebaseApi.doc(db, "users", state.user.uid);
  await firebaseApi.setDoc(docRef, {
    favorites: state.favorites,
    defaultCity: localStorage.getItem(STORE_KEYS.defaultCity) || state.favorites[0]?.name || "Lagos",
  }, { merge: true });
}

async function saveUserPreferences() {
  if (!state.user || !db) {
    return;
  }

  await firebaseApi.setDoc(firebaseApi.doc(db, "users", state.user.uid), {
    defaultCity: localStorage.getItem(STORE_KEYS.defaultCity) || "Lagos",
  }, { merge: true });
}

function loadingState(message) {
  refs.locationName.textContent = "Loading";
  refs.locationSub.textContent = message;
  refs.currentTemp.textContent = "--°";
  refs.lastUpdated.textContent = "Updating weather";
}

function saveLastCity(city) {
  localStorage.setItem(STORE_KEYS.lastCity, city);
}

async function loadDefaultWeather() {
  const defaultCity = localStorage.getItem(STORE_KEYS.defaultCity) || "Lagos";
  const lastCity = localStorage.getItem(STORE_KEYS.lastCity) || defaultCity;
  await fetchWeather(state.user ? defaultCity : lastCity);
}

function getWeatherText(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Rime fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    56: "Freezing drizzle",
    57: "Heavy freezing drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Rain showers",
    81: "Heavy showers",
    82: "Violent showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Heavy thunderstorm with hail",
  };
  return map[code] || "Weather";
}

function degToCompass(angle) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(((angle % 360) / 45)) % 8;
  return directions[index];
}

function normalizeWeatherData(data, location) {
  const today = data.current.time.slice(0, 10);
  const daily = data.daily.time.map((date, index) => ({
    date,
    day: {
      condition: {
        text: getWeatherText(data.daily.weather_code[index]),
        code: data.daily.weather_code[index],
      },
      maxtemp_c: data.daily.temperature_2m_max[index],
      mintemp_c: data.daily.temperature_2m_min[index],
      precipitation_probability: data.daily.precipitation_probability_max[index],
      sunrise: data.daily.sunrise[index],
      sunset: data.daily.sunset[index],
    },
  }));
  const history = daily.filter((day) => day.date < today).slice(-1);
  const forecast = daily.filter((day) => day.date >= today).slice(0, 7);

  return {
    location: {
      name: location.name,
      region: location.admin1 || location.country || "Local area",
      country: location.country || "",
      lat: location.latitude,
      lon: location.longitude,
      timezone: data.timezone,
    },
    current: {
      condition: {
        text: getWeatherText(data.current.weather_code),
        code: data.current.weather_code,
      },
      temp_c: data.current.temperature_2m,
      feelslike_c: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      wind_kph: data.current.wind_speed_10m,
      wind_gust_kph: data.current.wind_gusts_10m,
      wind_dir: degToCompass(data.current.wind_direction_10m),
      uv: data.current.uv_index,
      vis_km: Number((data.current.visibility / 1000).toFixed(1)),
      pressure_mb: Math.round(data.current.pressure_msl),
      cloud: data.current.cloud_cover,
      dewpoint_c: data.current.dew_point_2m ?? null,
      precip_mm: data.current.precipitation ?? null,
      last_updated: data.current.time || new Date().toISOString(),
      is_day: data.current.is_day,
    },
    timezone: data.timezone,
    forecast: {
      forecastday: forecast,
    },
    history,
    hourly: data.hourly,
  };
}

async function fetchWeather(query, chosenLocation = null) {
  const requestId = ++state.weatherRequestId;
  loadingState("Fetching weather data");

  try {
    let location = chosenLocation;
    if (!location) {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      if (!geoRes.ok) {
        throw new Error("Location search failed. Please try again.");
      }

      const geoData = await geoRes.json();
      if (!geoData.results || !geoData.results.length) {
        throw new Error("No matching location found.");
      }
      location = geoData.results[0];
    }

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,dew_point_2m,precipitation,weather_code,pressure_msl,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,uv_index,is_day&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=auto&past_days=1&forecast_days=7`
    );

    if (!weatherRes.ok) {
      throw new Error("Weather data unavailable right now.");
    }

    const data = await weatherRes.json();
    if (requestId !== state.weatherRequestId) {
      return;
    }
    state.weather = normalizeWeatherData(data, location);
    state.selectedCity = {
      name: location.name,
      region: location.admin1 || location.country || "Local area",
      country: location.country || "",
      lat: location.latitude,
      lon: location.longitude,
    };

    if (location.name !== "Your location") {
      saveLastCity(location.name);
    }
    localStorage.setItem(STORE_KEYS.weatherCache, JSON.stringify({
      city: location.name,
      query: query.toLowerCase(),
      weather: state.weather,
      savedAt: Date.now(),
    }));
    showAppStatus("");
    syncFavoriteButton();
    renderWeather();
    renderMap(location.latitude, location.longitude);
  } catch (error) {
    if (requestId !== state.weatherRequestId) {
      return;
    }
    const cached = readWeatherCache(query);
    if (cached) {
      state.weather = cached.weather;
      state.selectedCity = {
        name: cached.weather.location.name,
        region: cached.weather.location.region,
        country: cached.weather.location.country,
        lat: cached.weather.location.lat,
        lon: cached.weather.location.lon,
      };
      renderWeather();
      renderMap(state.selectedCity.lat, state.selectedCity.lon);
      showAppStatus(`Offline: showing saved weather for ${cached.city}. ${error.message}`, true);
      return;
    }
    if (state.weather) {
      renderWeather();
      showAppStatus(`${error.message} Showing the last successful weather for ${state.weather.location.name}.`, true);
      return;
    }
    refs.locationName.textContent = "Weather unavailable";
    refs.locationSub.textContent = error.message;
    refs.lastUpdated.textContent = "Please try another location";
    showAppStatus(error.message, true);
  }
}

function readWeatherCache(city) {
  try {
    const cached = JSON.parse(localStorage.getItem(STORE_KEYS.weatherCache) || "null");
    if (!cached || (cached.city.toLowerCase() !== city.toLowerCase() && cached.query !== city.toLowerCase())) {
      return null;
    }
    return cached;
  } catch {
    return null;
  }
}

function buildConditionIcon(code, isDay) {
  const iconMap = {
    0: isDay ? "☀" : "☾",
    1: isDay ? "🌤" : "🌙",
    2: "⛅",
    3: "☁",
    45: "🌫",
    48: "🌫",
    51: "🌦",
    53: "🌦",
    55: "🌧",
    56: "🌧",
    57: "🌧",
    61: "🌦",
    63: "🌧",
    65: "🌧",
    66: "🌧",
    67: "🌧",
    71: "🌨",
    73: "❄",
    75: "❄",
    77: "❄",
    80: "🌦",
    81: "🌧",
    82: "🌧",
    85: "🌨",
    86: "🌨",
    95: "⛈",
    96: "⛈",
    99: "⛈",
  };

  return iconMap[code] || (isDay ? "☀" : "☾");
}

function renderWeather() {
  if (!state.weather) {
    return;
  }

  const data = state.weather;
  const current = data.current;
  const forecast = data.forecast.forecastday[0];
  const icon = buildConditionIcon(current.condition.code, Number(current.is_day) === 1);
  const tempValue = tempNumber(current.temp_c);
  const feelsValue = tempNumber(current.feelslike_c);
  const highValue = tempNumber(forecast.day.maxtemp_c);
  const lowValue = tempNumber(forecast.day.mintemp_c);

  refs.locationName.textContent = data.location.name;
  refs.locationSub.textContent = `${data.location.region || "Local area"} · ${data.location.country}`;
  refs.lastUpdated.textContent = `Updated ${formatWeatherTime(current.last_updated)} · ${formatWeatherDate(current.last_updated)}`;
  refs.conditionBadge.textContent = current.condition.text;
  refs.weatherIcon.textContent = icon;
  refs.currentTemp.textContent = formatTemp(tempValue);
  refs.feelsLike.textContent = formatTemp(feelsValue);
  refs.dailyHigh.textContent = formatTemp(highValue);
  refs.dailyLow.textContent = formatTemp(lowValue);
  refs.weatherText.textContent = current.condition.text;

  refs.windSpeed.textContent = `${Math.round(current.wind_kph)} km/h · ${current.wind_dir}`;
  refs.windGust.textContent = current.wind_gust_kph == null ? "N/A" : `${Math.round(current.wind_gust_kph)} km/h`;
  refs.humidity.textContent = `${current.humidity}%`;
  refs.uvIndex.textContent = current.uv || "N/A";
  refs.visibility.textContent = `${current.vis_km} km`;
  refs.pressure.textContent = `${current.pressure_mb} mb`;
  refs.cloudCover.textContent = `${current.cloud}%`;
  refs.dewPoint.textContent = current.dewpoint_c == null ? "N/A" : formatTemp(tempNumber(current.dewpoint_c));
  refs.precipitation.textContent = current.precip_mm == null ? "N/A" : `${current.precip_mm} mm`;
  refs.sunrise.textContent = formatWeatherTime(forecast.day.sunrise);
  refs.sunset.textContent = formatWeatherTime(forecast.day.sunset);

  renderForecast(data.forecast.forecastday);
  renderHistory(data.history);
  const currentHour = current.last_updated.slice(0, 13);
  const foundHourIndex = data.hourly.time.findIndex((time) => time.slice(0, 13) === currentHour);
  const currentHourIndex = Math.max(0, foundHourIndex);
  renderHourlyForecast(currentHourIndex);
  renderDailyChart();
  syncFavoriteButton();
}

function renderHistory(days) {
  refs.historyList.replaceChildren();
  const yesterday = Array.isArray(days) ? days[0] : null;
  if (!yesterday) {
    const empty = document.createElement("p");
    empty.className = "muted-label";
    empty.textContent = "Historical data is not available for this location.";
    refs.historyList.appendChild(empty);
    return;
  }

  const card = document.createElement("article");
  card.className = "history-card";
  const detail = document.createElement("div");
  detail.className = "history-detail";
  const date = document.createElement("strong");
  date.textContent = formatForecastDay(yesterday.date);
  const condition = document.createElement("span");
  condition.textContent = yesterday.day.condition.text;
  const temperatures = document.createElement("strong");
  temperatures.textContent = `${formatTemp(tempNumber(yesterday.day.maxtemp_c))} / ${formatTemp(tempNumber(yesterday.day.mintemp_c))}`;
  const rain = document.createElement("span");
  rain.textContent = yesterday.day.precipitation_probability == null
    ? "Rain chance N/A"
    : `Rain ${yesterday.day.precipitation_probability}%`;
  detail.append(date, condition, temperatures, rain);
  card.append(detail);
  refs.historyList.appendChild(card);
}

function formatWeatherTime(value) {
  if (typeof value !== "string") {
    return "N/A";
  }
  const match = value.match(/T(\d{2}):(\d{2})/);
  if (!match) {
    return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const hour = Number(match[1]);
  const minute = match[2];
  return new Date(`1970-01-01T${match[1]}:${minute}:00Z`).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function renderForecast(days) {
  refs.forecastList.innerHTML = "";

  days.forEach((day, index) => {
    const date = new Date(`${day.date}T12:00:00`);
    const item = document.createElement("div");
    item.className = "forecast-item";
    if (index === 0) {
      item.classList.add("today");
    }

    item.innerHTML = `
      <strong>${index === 0 ? "Today" : date.toLocaleDateString([], { weekday: "short" })}</strong>
      <div>
        <span>${date.toLocaleDateString([], { month: "short", day: "numeric" })} · ${day.day.condition.text}</span>
      </div>
      <span class="forecast-temps">${formatTemp(tempNumber(day.day.maxtemp_c))} / ${formatTemp(tempNumber(day.day.mintemp_c))}</span>
      <div class="weather-icon tiny">${buildConditionIcon(day.day.condition.code, true)}</div>
      <span class="forecast-rain">${day.day.precipitation_probability == null ? "Rain chance N/A" : `Rain ${day.day.precipitation_probability}%`}</span>
    `;

    refs.forecastList.appendChild(item);
  });
}

function renderHourlyForecast(startIndex) {
  const hourly = state.weather.hourly;
  refs.hourlyList.innerHTML = "";
  const endIndex = Math.min(startIndex + 12, hourly.time.length);

  for (let index = startIndex; index < endIndex; index += 1) {
    const item = document.createElement("article");
    item.className = "hourly-item";
    if (index === startIndex) {
      item.classList.add("current-hour");
    }

    const chance = hourly.precipitation_probability[index];
    const temperature = tempNumber(hourly.temperature_2m[index]);
    const conditionCode = hourly.weather_code[index];
    const wind = hourly.wind_speed_10m[index];
    item.innerHTML = `
      <span class="hourly-time">${index === startIndex ? "Now" : formatWeatherTime(hourly.time[index])}</span>
      <span class="hourly-icon">${buildConditionIcon(conditionCode, true)}</span>
      <strong>${formatTemp(temperature)}</strong>
      <span class="hourly-rain">${chance == null ? "Rain N/A" : `Rain ${chance}%`}</span>
      <span class="hourly-wind">${wind == null ? "Wind N/A" : `Wind ${Math.round(wind)} km/h`}</span>
    `;
    refs.hourlyList.appendChild(item);
  }

  refs.chartRange.textContent = "Next 12 hours";
}

function renderDailyChart() {
  if (!state.weather) {
    return;
  }
  if (typeof Chart === "undefined") {
    showAppStatus("The chart library did not load. Weather details are still available.", true);
    return;
  }

  const days = state.weather.forecast.forecastday;
  const labels = days.map((day) => formatForecastDay(day.date));
  const isRainChart = state.chartMode === "rain";
  const styles = getComputedStyle(document.body);
  const muted = styles.getPropertyValue("--muted").trim();
  const grid = styles.getPropertyValue("--line").trim();

  if (state.dailyChart) {
    state.dailyChart.destroy();
  }

  state.dailyChart = new Chart(refs.dailyChart, {
    type: "line",
    data: {
      labels,
      datasets: isRainChart
        ? [{
            label: "Rain chance",
            data: days.map((day) => day.day.precipitation_probability),
            borderColor: "#56b5ff",
            backgroundColor: "rgba(86, 181, 255, 0.15)",
            fill: true,
            tension: 0.35,
            pointRadius: 3,
          }]
        : [
            {
              label: "High",
              data: days.map((day) => tempNumber(day.day.maxtemp_c)),
              borderColor: "#ff9f80",
              backgroundColor: "rgba(255, 159, 128, 0.1)",
              tension: 0.35,
              pointRadius: 3,
            },
            {
              label: "Low",
              data: days.map((day) => tempNumber(day.day.mintemp_c)),
              borderColor: "#7dc0ff",
              backgroundColor: "rgba(125, 192, 255, 0.1)",
              tension: 0.35,
              pointRadius: 3,
            },
          ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: !isRainChart, labels: { color: muted } },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          ticks: { color: muted },
          grid: { display: false },
        },
        y: {
          min: isRainChart ? 0 : undefined,
          max: isRainChart ? 100 : undefined,
          ticks: {
            color: muted,
            callback: (value) => isRainChart ? `${value}%` : `${Math.round(value)}°`,
          },
          grid: { color: grid },
        },
      },
    },
  });
  showAppStatus("");
}

function formatForecastDay(value) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString([], { weekday: "short", month: "numeric", day: "numeric" });
}

function renderMap(lat, lon) {
  if (typeof L === "undefined") {
    showAppStatus("The map library did not load. Weather details are still available.", true);
    return;
  }

  if (state.map) {
    state.map.remove();
  }

  state.map = L.map(refs.weatherMap, {
    zoomControl: false,
    scrollWheelZoom: false,
  }).setView([lat, lon], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(state.map);

  L.marker([lat, lon]).addTo(state.map);
}

async function loadCloudMode(forceRefresh = false) {
  const requestId = ++state.cloudRequestId;
  refs.cloudRefresh.disabled = true;
  refs.cloudList.replaceChildren();
  const saved = readCloudCache();
  if (!forceRefresh && saved && Date.now() - saved.savedAt < 15 * 60 * 1000) {
    renderCloudResults(saved.results.slice(0, 5));
    refs.cloudRefresh.disabled = false;
    return;
  }

  const loading = document.createElement("p");
  loading.className = "muted-label";
  loading.textContent = "Checking selected cities…";
  refs.cloudList.appendChild(loading);

  try {
    const latitudes = cloudCities.map((city) => city.latitude).join(",");
    const longitudes = cloudCities.map((city) => city.longitude).join(",");
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&current=temperature_2m,weather_code,wind_speed_10m&hourly=precipitation_probability&timezone=auto&forecast_days=1`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Cloud Mode weather request failed.");
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length !== cloudCities.length) {
      throw new Error("Cloud Mode returned incomplete city data.");
    }

    const results = data.map((weather, index) => {
      const city = cloudCities[index];
      const timeIndex = weather.hourly.time.findIndex((time) => time.slice(0, 13) === weather.current.time.slice(0, 13));
      const rainChance = timeIndex < 0 ? null : weather.hourly.precipitation_probability[timeIndex];
      const temp = weather.current.temperature_2m;
      const wind = weather.current.wind_speed_10m;
      const code = weather.current.weather_code;
      const ranking = rankCloudWeather(temp, rainChance, wind, code);

      return {
        ...city,
        timezone: weather.timezone,
        time: weather.current.time,
        temp,
        wind,
        code,
        rainChance,
        ...ranking,
      };
    });

    if (requestId !== state.cloudRequestId) {
      return;
    }
    results.sort((first, second) => second.score - first.score || first.name.localeCompare(second.name));
    localStorage.setItem(STORE_KEYS.cloudCache, JSON.stringify({
      savedAt: Date.now(),
      results,
    }));
    renderCloudResults(results.slice(0, 5));
    showAppStatus("");
  } catch (error) {
    if (requestId !== state.cloudRequestId) {
      return;
    }
    const previous = readCloudCache();
    if (previous) {
      renderCloudResults(previous.results.slice(0, 5));
      showAppStatus(`Cloud Mode is showing saved city data. ${error.message}`, true);
    } else {
      refs.cloudList.replaceChildren();
      showAppStatus(error.message, true);
    }
  } finally {
    if (requestId === state.cloudRequestId) {
      refs.cloudRefresh.disabled = false;
    }
  }
}

function readCloudCache() {
  try {
    const cache = JSON.parse(localStorage.getItem(STORE_KEYS.cloudCache) || "null");
    return cache && Array.isArray(cache.results) ? cache : null;
  } catch {
    return null;
  }
}

function rankCloudWeather(temp, rainChance, wind, code) {
  if (code >= 95) {
    return { score: 10 + (code === 99 ? 1 : 0), label: "Thunderstorm" };
  }
  if (rainChance != null && rainChance >= 70) {
    return { score: 7 + rainChance / 100, label: `High rain chance · ${rainChance}%` };
  }
  if (wind >= 45) {
    return { score: 6 + wind / 100, label: "Very windy" };
  }
  if (temp >= 35) {
    return { score: 5 + (temp - 35) / 10, label: "Extreme heat" };
  }
  if (temp <= 5) {
    return { score: 5 + (5 - temp) / 10, label: "Very cold" };
  }

  const normalScore = Math.abs(temp - 22) / 20
    + (rainChance == null ? 0 : rainChance / 200)
    + wind / 100;
  const label = temp >= 29 ? "Warm conditions" : temp <= 10 ? "Cool conditions" : "Typical conditions";
  return { score: normalScore, label };
}

function renderCloudResults(cities) {
  refs.cloudList.replaceChildren();
  cities.forEach((city) => {
    const card = document.createElement("article");
    card.className = "cloud-city";
    const detail = document.createElement("div");
    detail.className = "cloud-city-detail";
    const heading = document.createElement("strong");
    heading.textContent = `${city.name}, ${city.country}`;
    const condition = document.createElement("span");
    condition.textContent = `${city.label} · ${getWeatherText(city.code)}`;
    const localTime = document.createElement("small");
    localTime.textContent = `Local time ${formatWeatherTime(city.time)}`;
    detail.append(heading, condition, localTime);

    const reading = document.createElement("div");
    reading.className = "cloud-city-reading";
    const icon = document.createElement("span");
    icon.className = "cloud-icon";
    icon.textContent = buildConditionIcon(city.code, true);
    const temp = document.createElement("strong");
    temp.textContent = formatTemp(tempNumber(city.temp));
    const open = document.createElement("button");
    open.type = "button";
    open.className = "mini-btn";
    open.textContent = "View";
    open.addEventListener("click", () => fetchWeather(`${city.name}, ${city.country}`, {
      name: city.name,
      admin1: "",
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
    }));
    reading.append(icon, temp, open);
    card.append(detail, reading);
    refs.cloudList.appendChild(card);
  });
}

function normalizeLocationData(data) {
  return {
    name: data.name,
    region: data.region || "",
    country: data.country || "",
    lat: data.lat,
    lon: data.lon,
  };
}

async function searchLocations(query) {
  if (!query) {
    refs.searchResults.classList.add("hidden");
    refs.searchResults.innerHTML = "";
    return;
  }

  const requestId = ++state.searchRequestId;
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`);
    if (!res.ok) {
      throw new Error("Location search is temporarily unavailable.");
    }

    const data = await res.json();
    if (requestId !== state.searchRequestId || query !== refs.searchInput.value.trim()) {
      return;
    }
    refs.searchResults.innerHTML = "";

    if (!data.results || !data.results.length) {
      const empty = document.createElement("div");
      empty.className = "search-item";
      empty.textContent = "No matching cities";
      refs.searchResults.appendChild(empty);
      refs.searchResults.classList.remove("hidden");
      showAppStatus("");
      return;
    }

    data.results.slice(0, 6).forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-item";
      button.innerHTML = `
        <div>
          <strong></strong><br />
          <small></small>
        </div>
        <span>→</span>
      `;
      button.querySelector("strong").textContent = item.name;
      button.querySelector("small").textContent = `${item.admin1 || ""} · ${item.country}`;
      button.addEventListener("click", () => {
        refs.searchInput.value = `${item.name}, ${item.country}`;
        refs.searchResults.classList.add("hidden");
        fetchWeather(`${item.name}, ${item.country}`, item);
      });
      refs.searchResults.appendChild(button);
    });

    refs.searchResults.classList.remove("hidden");
    showAppStatus("");
  } catch (error) {
    if (requestId !== state.searchRequestId) {
      return;
    }
    refs.searchResults.classList.add("hidden");
    showAppStatus(error.message, true);
  }
}

function debounce(fn, delay) {
  return (...args) => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => fn(...args), delay);
  };
}

function formatTemp(value) {
  return `${Math.round(value)}°${state.unit === "C" ? "C" : "F"}`;
}

function tempNumber(value) {
  const c = Number(value);
  if (state.unit === "F") {
    return (c * 9) / 5 + 32;
  }
  return c;
}

function getCurrentLocation() {
  if (!navigator.geolocation) {
    refs.locationSub.textContent = "Geolocation is unavailable in this browser.";
    showAppStatus("Geolocation is unavailable in this browser.", true);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      loadingState("Fetching weather for your location");
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      fetchWeather("Your location", {
        name: "Your location",
        admin1: "Current location",
        country: "",
        latitude: lat,
        longitude: lon,
      });
    },
    (error) => {
      refs.locationSub.textContent = "Location permission denied. You can search for a city manually.";
      showAppStatus(error.message, true);
    }
  );
}

init();
