const STORAGE_KEYS = {
  entries: "diaryExe_entries_v1",
  moods: "diaryExe_moods_v1",
  settings: "diaryExe_settings_v1"
};

const MOODS = {
  happy: { label: "happy", icon: "☀" },
  loved: { label: "loved", icon: "♡" },
  calm: { label: "calm", icon: "☁" },
  tired: { label: "tired", icon: "☾" },
  sad: { label: "sad", icon: "☹" },
  excited: { label: "excited", icon: "✦" },
  anxious: { label: "anxious", icon: "〰" }
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`Could not read ${key} from localStorage.`, error);
    return fallback;
  }
}

let entries = readStorage(STORAGE_KEYS.entries, []);
let moods = readStorage(STORAGE_KEYS.moods, {});
let settings = readStorage(STORAGE_KEYS.settings, {
  nickname: "angel",
  avatar: "♡",
  theme: "pink"
});
let calendarCursor = new Date();
calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth(), 1);
let selectedDate = dateKey(new Date());
let toastTimer;

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    $("#savedStatus").textContent = "all changes saved locally ♡";
  } catch (error) {
    $("#savedStatus").textContent = "couldn't save — browser storage may be full";
    showToast("couldn't save; check browser storage");
    console.error("Storage error:", error);
  }
}

function saveAllEntries() { saveStorage(STORAGE_KEYS.entries, entries); }
function saveAllMoods() { saveStorage(STORAGE_KEYS.moods, moods); }
function saveSettings() { saveStorage(STORAGE_KEYS.settings, settings); }

function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
function formatDate(key, options = { month: "short", day: "numeric", year: "numeric" }) {
  return parseDate(key).toLocaleDateString("en-US", options);
}
function todayKey() { return dateKey(new Date()); }
function safeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}
function moodInfo(mood) { return MOODS[mood] || { label: "no mood", icon: "♡" }; }
function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function showToast(message) {
  $("#toastMessage").textContent = message;
  const toast = $("#toast");
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  const focusable = $("input:not([type=hidden]), textarea, button", modal);
  if (focusable) setTimeout(() => focusable.focus(), 50);
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("hidden");
  if (!$(".modal-backdrop:not(.hidden)")) document.body.style.overflow = "";
}
function setView(view) {
  $$(".view").forEach(section => section.classList.toggle("active", section.id === `view-${view}`));
  $$(".nav-item[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  if (view === "diary") renderDiary();
  if (view === "calendar") renderCalendar();
  if (view === "moods") renderMoodPage();
  if (view === "home") renderHome();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function updateClock() {
  const now = new Date();
  $("#topDate").textContent = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" }).toUpperCase();
  $("#topClock").textContent = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  $("#dateDay").textContent = now.getDate();
  $("#dateMonth").textContent = now.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  $("#dateWeekday").textContent = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const hour = now.getHours();
  const greeting = hour < 12 ? "GOOD MORNING, LITTLE STAR" : hour < 18 ? "YOUR LITTLE DIGITAL UNIVERSE" : "A LITTLE NIGHTTIME MAGIC";
  $("#greetingEyebrow").textContent = greeting;
}
function applySettings() {
  document.documentElement.dataset.theme = settings.theme || "pink";
  $("#profileName").textContent = settings.nickname || "angel";
  $("#welcomeName").textContent = settings.nickname || "angel";
  $("#avatarPreview").textContent = settings.avatar || "♡";
  $("#nicknameInput").value = settings.nickname || "angel";
  $$("#avatarPicker button").forEach(button => button.classList.toggle("selected", button.dataset.avatar === settings.avatar));
  $$(".theme-swatch").forEach(button => button.classList.toggle("selected", button.dataset.theme === settings.theme));
}
function renderHome() {
  const today = todayKey();
  const todayEntry = entries.filter(entry => entry.date === today).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const container = $("#todayEntryContent");
  if (todayEntry) {
    container.innerHTML = `<div class="empty-doodle">${moodInfo(todayEntry.mood).icon}</div>
      <p class="empty-title">${safeText(todayEntry.title)}</p>
      <p class="empty-copy">${safeText(todayEntry.text.slice(0, 105))}${todayEntry.text.length > 105 ? "…" : ""}</p>`;
    $("#writeToday").innerHTML = "<span>✎</span> edit today's entry";
    $("#writeToday").dataset.editId = todayEntry.id;
  } else {
    container.innerHTML = `<div class="empty-doodle">✿</div><p class="empty-title">Your page is waiting, lovely.</p><p class="empty-copy">Write down a thought, a memory, or anything on your mind.</p>`;
    $("#writeToday").innerHTML = "<span>＋</span> write today's entry";
    delete $("#writeToday").dataset.editId;
  }

  const currentMood = moods[today];
  $$("#homeMoodOptions .mood-choice").forEach(button => button.classList.toggle("selected", button.dataset.mood === currentMood));
  $("#moodFeedback").textContent = currentMood ? `today you're feeling ${currentMood} ${moodInfo(currentMood).icon}` : "choose the little face that feels like you ♡";

  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt).slice(0, 3);
  $("#recentEntries").innerHTML = recent.length ? recent.map(entry => `
    <div class="recent-item" data-open-entry="${safeText(entry.id)}" tabindex="0" role="button">
      <div class="recent-mood">${moodInfo(entry.mood).icon}</div><div class="recent-info"><strong>${safeText(entry.title)}</strong><span>${formatDate(entry.date)}</span></div><span class="recent-arrow">↗</span>
    </div>`).join("") : `<div class="soft-empty">Your memories will live here. <span>♡</span></div>`;
  $("#statEntries").textContent = entries.length;
  $("#statMoods").textContent = Object.keys(moods).length;
  $("#entryCount").textContent = entries.length;
}
function renderDiary() {
  const query = $("#searchEntries").value.trim().toLowerCase();
  const mood = $("#filterMood").value;
  const sort = $("#sortEntries").value;
  let filtered = entries.filter(entry => {
    const matchesQuery = `${entry.title} ${entry.text}`.toLowerCase().includes(query);
    return matchesQuery && (mood === "all" || entry.mood === mood);
  });
  filtered.sort((a, b) => {
    if (sort === "oldest") return a.date.localeCompare(b.date) || a.updatedAt - b.updatedAt;
    if (sort === "az") return a.title.localeCompare(b.title);
    return b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt;
  });
  $("#diaryEntries").innerHTML = filtered.map(entry => `
    <article class="entry-card">
      <div class="entry-card-top"><span class="entry-date-label">${formatDate(entry.date)}</span><span class="entry-mood-pill">${moodInfo(entry.mood).icon} ${safeText(moodInfo(entry.mood).label)}</span></div>
      <h3>${safeText(entry.title)}</h3><p>${safeText(entry.text)}</p>
      <div class="entry-card-actions"><button class="small-action" data-edit-entry="${safeText(entry.id)}">✎ edit</button><button class="small-action" data-delete-entry="${safeText(entry.id)}">× delete</button></div>
    </article>`).join("");
  $("#diaryEmpty").classList.toggle("hidden", filtered.length !== 0);
  $("#diaryEntries").classList.toggle("hidden", filtered.length === 0);
  $("#entryCount").textContent = entries.length;
}
function openEntryForm(entry = null, presetDate = todayKey()) {
  $("#entryForm").reset();
  $("#entryId").value = entry ? entry.id : "";
  $("#entryTitle").value = entry ? entry.title : "";
  $("#entryDate").value = entry ? entry.date : presetDate;
  $("#entryMood").value = entry ? entry.mood : (moods[presetDate] || "happy");
  $("#entryText").value = entry ? entry.text : "";
  $("#entryModalTitle").textContent = entry ? "edit your memory" : "a little memory";
  updateCharCount();
  openModal("entryModal");
}
function updateCharCount() {
  $("#charCount").textContent = `${$("#entryText").value.length} / 5000`;
}
function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  $("#calendarMonth").textContent = calendarCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const entryDates = new Set(entries.map(entry => entry.date));
  let html = "";
  for (let i = 0; i < totalCells; i++) {
    let day, date, otherMonth = false;
    if (i < firstDay) {
      day = previousMonthDays - firstDay + i + 1;
      date = dateKey(new Date(year, month - 1, day));
      otherMonth = true;
    } else if (i >= firstDay + daysInMonth) {
      day = i - firstDay - daysInMonth + 1;
      date = dateKey(new Date(year, month + 1, day));
      otherMonth = true;
    } else {
      day = i - firstDay + 1;
      date = dateKey(new Date(year, month, day));
    }
    const classes = ["calendar-day", otherMonth ? "other-month" : "", date === todayKey() ? "today" : "", date === selectedDate ? "selected" : ""].filter(Boolean).join(" ");
    html += `<button class="${classes}" data-date="${date}" aria-label="${formatDate(date, { month: "long", day: "numeric", year: "numeric" })}${entryDates.has(date) ? ", has diary entry" : ""}"><span class="day-number">${day}</span><span class="day-heart">${entryDates.has(date) ? "♥" : "&nbsp;"}</span></button>`;
  }
  $("#calendarDays").innerHTML = html;
  renderSelectedDay();
}
function renderSelectedDay() {
  $("#selectedDateTitle").textContent = formatDate(selectedDate, { month: "long", day: "numeric", year: "numeric" });
  const list = entries.filter(entry => entry.date === selectedDate).sort((a, b) => b.updatedAt - a.updatedAt);
  $("#selectedDayEntries").innerHTML = list.length ? list.map(entry => `
    <div class="recent-item" data-open-entry="${safeText(entry.id)}" tabindex="0" role="button"><div class="recent-mood">${moodInfo(entry.mood).icon}</div><div class="recent-info"><strong>${safeText(entry.title)}</strong><span>${safeText(entry.text.slice(0, 80))}${entry.text.length > 80 ? "…" : ""}</span></div><span class="recent-arrow">↗</span></div>`).join("") : `<div class="selected-day-empty">No memories on this day yet. Maybe you'll make one? ♡</div>`;
}
function setMood(mood) {
  moods[todayKey()] = mood;
  saveAllMoods();
  renderHome();
  renderMoodPage();
  showToast(`mood saved: ${mood} ${moodInfo(mood).icon}`);
}
function weekKeys() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return dateKey(d);
  });
}
function renderMoodPage() {
  const currentMood = moods[todayKey()];
  const moodChoices = Object.entries(MOODS).map(([key, mood]) => `
    <button class="large-mood-choice ${currentMood === key ? "selected" : ""}" data-large-mood="${key}"><span>${mood.icon}</span><small>${mood.label}</small></button>`).join("");
  $("#largeMoodOptions").innerHTML = moodChoices;
  $("#largeMoodFeedback").textContent = currentMood ? `you checked in as ${currentMood} today ${moodInfo(currentMood).icon}` : "your feelings are welcome here ♡";

  const keys = weekKeys();
  const counts = {};
  keys.forEach(key => { if (moods[key]) counts[moods[key]] = (counts[moods[key]] || 0) + 1; });
  const maxCount = Math.max(1, ...Object.values(counts));
  $("#moodSummary").innerHTML = Object.entries(MOODS).map(([key, mood]) => `
    <div class="mood-bar-row"><span class="mood-bar-label">${mood.icon} ${mood.label}</span><div class="mood-bar-track"><div class="mood-bar-fill" style="width:${((counts[key] || 0) / maxCount) * 100}%"></div></div><span class="mood-bar-count">${counts[key] || 0}</span></div>`).join("");
  $("#weekMoodCount").textContent = keys.filter(key => moods[key]).length;
  const history = Object.entries(moods).sort(([a], [b]) => b.localeCompare(a)).slice(0, 8);
  $("#moodHistory").innerHTML = history.length ? history.map(([date, key]) => `
    <div class="mood-history-item"><div class="mood-history-icon">${moodInfo(key).icon}</div><div><strong>${safeText(key)}</strong><span>${formatDate(date)}</span></div></div>`).join("") : `<div class="selected-day-empty">Your mood check-ins will show up here. ♡</div>`;
}
function deleteEntry(id) {
  const entry = entries.find(item => item.id === id);
  if (!entry) return;
  if (!confirm(`Delete "${entry.title}" from your diary? This cannot be undone.`)) return;
  entries = entries.filter(item => item.id !== id);
  saveAllEntries();
  renderEverything();
  showToast("memory deleted");
}
function renderEverything() {
  renderHome();
  renderDiary();
  renderCalendar();
  renderMoodPage();
}
function startEditById(id) {
  const entry = entries.find(item => item.id === id);
  if (entry) openEntryForm(entry);
}

/* Navigation */
$$(".nav-item[data-view]").forEach(button => button.addEventListener("click", () => setView(button.dataset.view)));
$$("[data-go]").forEach(button => button.addEventListener("click", () => setView(button.dataset.go)));
$("#openSettings").addEventListener("click", () => openModal("settingsModal"));
$("#openTheme").addEventListener("click", () => openModal("settingsModal"));
$("#writeToday").addEventListener("click", () => {
  const entry = entries.find(item => item.id === $("#writeToday").dataset.editId);
  openEntryForm(entry || null, todayKey());
});
$("#newEntry").addEventListener("click", () => openEntryForm());
$("#emptyNewEntry").addEventListener("click", () => openEntryForm());
$("#entryForDate").addEventListener("click", () => openEntryForm(null, selectedDate));
$("#quickNote").addEventListener("click", () => { $("#quickNoteForm").reset(); openModal("quickNoteModal"); });
$$("[data-close]").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.close)));
$$(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", event => {
  if (event.target === backdrop) closeModal(backdrop.id);
}));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") $$(".modal-backdrop:not(.hidden)").forEach(modal => closeModal(modal.id));
  if (event.key === "Enter" && event.target.matches("[data-open-entry]")) startEditById(event.target.dataset.openEntry);
});

/* Diary form */
$("#entryText").addEventListener("input", updateCharCount);
$("#entryForm").addEventListener("submit", event => {
  event.preventDefault();
  const id = $("#entryId").value;
  const title = $("#entryTitle").value.trim();
  const date = $("#entryDate").value;
  const mood = $("#entryMood").value;
  const text = $("#entryText").value.trim();
  if (!title || !date || !text) return;
  const now = Date.now();
  if (id) {
    const index = entries.findIndex(entry => entry.id === id);
    if (index !== -1) entries[index] = { ...entries[index], title, date, mood, text, updatedAt: now };
  } else {
    entries.push({ id: makeId(), title, date, mood, text, createdAt: now, updatedAt: now });
  }
  saveAllEntries();
  closeModal("entryModal");
  renderEverything();
  showToast(id ? "your memory has been updated ♡" : "saved to your diary!");
});

/* Quick note turns into a regular diary entry */
$("#quickNoteForm").addEventListener("submit", event => {
  event.preventDefault();
  const text = $("#quickNoteText").value.trim();
  if (!text) return;
  const now = Date.now();
  entries.push({ id: makeId(), title: "a quick little thought", date: todayKey(), mood: moods[todayKey()] || "calm", text, createdAt: now, updatedAt: now });
  saveAllEntries();
  closeModal("quickNoteModal");
  renderEverything();
  showToast("little thought tucked away ♡");
});

/* Search, filters, and card actions use event delegation */
$("#searchEntries").addEventListener("input", renderDiary);
$("#filterMood").addEventListener("change", renderDiary);
$("#sortEntries").addEventListener("change", renderDiary);
document.addEventListener("click", event => {
  const edit = event.target.closest("[data-edit-entry]");
  const remove = event.target.closest("[data-delete-entry]");
  const open = event.target.closest("[data-open-entry]");
  const day = event.target.closest("[data-date]");
  const smallMood = event.target.closest("[data-mood]");
  const largeMood = event.target.closest("[data-large-mood]");
  if (edit) startEditById(edit.dataset.editEntry);
  if (remove) deleteEntry(remove.dataset.deleteEntry);
  if (open && !edit && !remove) startEditById(open.dataset.openEntry);
  if (day) {
    selectedDate = day.dataset.date;
    const chosen = parseDate(selectedDate);
    calendarCursor = new Date(chosen.getFullYear(), chosen.getMonth(), 1);
    renderCalendar();
  }
  if (smallMood) setMood(smallMood.dataset.mood);
  if (largeMood) setMood(largeMood.dataset.largeMood);
});

/* Calendar navigation */
$("#prevMonth").addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  renderCalendar();
});
$("#nextMonth").addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  renderCalendar();
});

/* Personalization */
let chosenAvatar = settings.avatar || "♡";
let chosenTheme = settings.theme || "pink";
$("#avatarPicker").addEventListener("click", event => {
  const button = event.target.closest("[data-avatar]");
  if (!button) return;
  chosenAvatar = button.dataset.avatar;
  $$("#avatarPicker button").forEach(item => item.classList.toggle("selected", item === button));
});
$$(".theme-swatch").forEach(button => button.addEventListener("click", () => {
  chosenTheme = button.dataset.theme;
  $$(".theme-swatch").forEach(item => item.classList.toggle("selected", item === button));
}));
$("#saveSettings").addEventListener("click", () => {
  settings = {
    nickname: $("#nicknameInput").value.trim() || "angel",
    avatar: chosenAvatar,
    theme: chosenTheme
  };
  saveSettings();
  applySettings();
  closeModal("settingsModal");
  showToast("your space, your rules ♡");
});

/* Start the app */
applySettings();
updateClock();
setInterval(updateClock, 30000);
renderEverything();
