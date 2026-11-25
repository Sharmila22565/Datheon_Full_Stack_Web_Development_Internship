"use strict";

const STORAGE_KEY = "daymark.tasks.v1";
const JOURNEY_START_KEY = "daymark.journey.start-date";
const categories = ["Work", "Personal", "Study"];
const dailyQuotes = [
  "Small steps still move you forward.",
  "You don’t need it all figured out to begin.",
  "Quiet progress is still progress.",
  "Give yourself the patience you give your plans.",
  "Today is a fresh page, not a test to pass.",
  "Your best is allowed to look different each day.",
  "Keep showing up. The little things are becoming something.",
  "You are allowed to grow at your own pace.",
  "One kind choice for yourself can change the whole day.",
  "Rest is part of the rhythm, not a reward you must earn.",
  "Notice how far you’ve come before asking how far to go.",
  "Start where you are. That is a perfectly good place.",
  "Let what you finish be enough for today.",
  "Your effort matters, even before anyone sees the result.",
  "Take today one thing at a time; you’re doing just fine.",
  "Every new day is another chance to be on your own side."
];
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const storageNotice = document.querySelector("#storage-notice");
const addTaskForm = document.querySelector("#add-task-form");
const editDialog = document.querySelector("#edit-dialog");
const editTaskForm = document.querySelector("#edit-task-form");
const loginScreen = document.querySelector("#login-screen");
const appShell = document.querySelector("#app-shell");
const loginForm = document.querySelector("#login-form");
const loginEmail = document.querySelector("#login-email");
const loginPassword = document.querySelector("#login-password");
const loginError = document.querySelector("#login-error");
let tasks = loadFromLocalStorage();
let activeFilter = "all";
let searchQuery = "";
let toastTimer;
let signedInEmail = "";

function loadFromLocalStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new TypeError("Saved tasks are not a list.");

    return parsed.filter((task) =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.completed === "boolean" &&
      categories.includes(task.category)
    ).map((task) => ({
      id: task.id,
      title: task.title.slice(0, 160),
      category: task.category,
      dueDate: typeof task.dueDate === "string" ? task.dueDate : "",
      completed: task.completed,
      createdAt: typeof task.createdAt === "number" ? task.createdAt : Date.now()
    }));
  } catch (error) {
    console.error("Could not load Daymark tasks from localStorage.", error);
    showStorageNotice("Saved tasks couldn’t be read. Your current list will start empty.");
    return [];
  }
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    storageNotice.hidden = true;
    return true;
  } catch (error) {
    console.error("Could not save Daymark tasks to localStorage.", error);
    showStorageNotice("Changes couldn’t be saved in this browser. Check your storage settings.");
    return false;
  }
}

function showStorageNotice(message) {
  storageNotice.textContent = message;
  storageNotice.hidden = false;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getJourneyDay() {
  const todayKey = dateKey(new Date());
  let startKey;
  try {
    startKey = localStorage.getItem(JOURNEY_START_KEY);
    if (!startKey) {
      localStorage.setItem(JOURNEY_START_KEY, todayKey);
      startKey = todayKey;
    }
  } catch (error) {
    console.error("Could not read or save the Daymark journey start date.", error);
    showStorageNotice("Your daily inspiration streak could not be saved in this browser.");
    return 1;
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(startKey)) {
    startKey = todayKey;
    try {
      localStorage.setItem(JOURNEY_START_KEY, startKey);
    } catch (error) {
      console.error("Could not reset the Daymark journey start date.", error);
      showStorageNotice("Your daily inspiration streak could not be saved in this browser.");
      return 1;
    }
  }

  const [startYear, startMonth, startDay] = startKey.split("-").map(Number);
  const startTime = Date.UTC(startYear, startMonth - 1, startDay);
  const validStartDate = new Date(startTime).toISOString().slice(0, 10) === startKey;
  if (!validStartDate) {
    try {
      localStorage.setItem(JOURNEY_START_KEY, todayKey);
    } catch (error) {
      console.error("Could not repair the Daymark journey start date.", error);
      showStorageNotice("Your daily inspiration streak could not be saved in this browser.");
      return 1;
    }
    return 1;
  }

  const [todayYear, todayMonth, todayDay] = todayKey.split("-").map(Number);
  const elapsedDays = Math.floor((Date.UTC(todayYear, todayMonth - 1, todayDay) - startTime) / 86400000);
  return Math.max(1, elapsedDays + 1);
}

function readDemoSession() {
  try {
    return sessionStorage.getItem("daymark.demo.email") || "";
  } catch (error) {
    console.error("Could not read the Daymark demo session.", error);
    return "";
  }
}

function saveDemoSession(email) {
  try {
    sessionStorage.setItem("daymark.demo.email", email);
    return true;
  } catch (error) {
    console.error("Could not save the Daymark demo session.", error);
    return false;
  }
}

function showApp(email) {
  signedInEmail = email;
  loginScreen.hidden = true;
  appShell.hidden = false;
  const displayName = email.split("@")[0];
  document.querySelector("#signed-in-name").textContent = displayName;
  const avatar = document.querySelector(".user-avatar");
  avatar.textContent = displayName.charAt(0).toLocaleUpperCase();
  avatar.setAttribute("aria-label", `Signed in as ${email}`);
}

function showLogin() {
  signedInEmail = "";
  loginScreen.hidden = false;
  appShell.hidden = true;
  loginForm.reset();
  loginPassword.type = "password";
  document.querySelector("#password-toggle").setAttribute("aria-label", "Show password");
  document.querySelector("#password-toggle").setAttribute("aria-pressed", "false");
  loginError.hidden = true;
  loginError.textContent = "";
  loginEmail.focus();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function formatDueDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function dateStatus(dateString) {
  if (!dateString) return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${dateString}T00:00:00`);
  if (dueDate < today) return " is-overdue";
  if (dueDate.getTime() === today.getTime()) return " is-today";
  return "";
}

function getVisibleTasks() {
  return tasks.filter((task) => {
    const matchesFilter = activeFilter === "all" ||
      (activeFilter === "active" && !task.completed) ||
      (activeFilter === "completed" && task.completed);
    const matchesSearch = task.title.toLocaleLowerCase().includes(searchQuery);
    return matchesFilter && matchesSearch;
  });
}

function render() {
  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;
  const counters = {
    "#all-count": tasks.length,
    "#active-count": activeCount,
    "#completed-count": completedCount,
    "#summary-total": tasks.length,
    "#summary-active": activeCount,
    "#summary-completed": completedCount,
    "#filter-all-count": tasks.length,
    "#filter-active-count": activeCount,
    "#filter-completed-count": completedCount
  };
  Object.entries(counters).forEach(([selector, count]) => {
    document.querySelector(selector).textContent = count;
  });

  const journeyDay = getJourneyDay();
  document.querySelector("#journey-day").textContent = `DAY ${journeyDay}`;
  document.querySelector("#daily-quote").textContent = dailyQuotes[(journeyDay - 1) % dailyQuotes.length];

  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const progressBar = document.querySelector(".momentum-track");
  progressBar.setAttribute("aria-valuenow", completionRate);
  document.querySelector(".momentum-fill").style.width = `${completionRate}%`;
  document.querySelector("#momentum-percent").textContent = `${completionRate}%`;
  document.querySelector("#momentum-message").textContent = tasks.length === 0
    ? "Every little step counts."
    : completedCount === tasks.length
      ? "Look at you go — all done!"
      : `${completedCount} of ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} complete`;

  document.querySelectorAll("[data-filter]").forEach((button) => {
    const selected = button.dataset.filter === activeFilter;
    if (button.classList.contains("nav-item")) button.classList.toggle("is-active", selected);
    if (button.classList.contains("filter-tab")) {
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    }
  });

  const visibleTasks = getVisibleTasks();
  document.querySelector("#visible-count").textContent = visibleTasks.length;
  taskList.innerHTML = visibleTasks.map(renderTask).join("");
  emptyState.hidden = visibleTasks.length > 0;

  if (tasks.length === 0) {
    document.querySelector("#empty-title").textContent = "Your day is a blank canvas";
    document.querySelector("#empty-description").textContent = "Add your first task above and make it a good one.";
  } else if (visibleTasks.length === 0 && searchQuery) {
    document.querySelector("#empty-title").textContent = "No tasks found";
    document.querySelector("#empty-description").textContent = "Try another search or switch to a different filter.";
  } else {
    document.querySelector("#empty-title").textContent = "Nothing here for now";
    document.querySelector("#empty-description").textContent = "You’re all caught up in this view.";
  }

  const subtitle = activeFilter === "active" ? "A few things still in motion." :
    activeFilter === "completed" ? "Look at everything you’ve accomplished." : "One step at a time.";
  document.querySelector("#list-subtitle").textContent = subtitle;
}

function renderTask(task) {
  const safeTitle = escapeHtml(task.title);
  const categoryClass = `category-${task.category.toLowerCase()}`;
  const dueDate = task.dueDate
    ? `<span class="due-date${task.completed ? "" : dateStatus(task.dueDate)}"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor"/><path d="M5 2v3M11 2v3M3 6.5h10" stroke="currentColor" stroke-linecap="round"/></svg>${formatDueDate(task.dueDate)}</span>`
    : "";
  return `
    <article class="task-row${task.completed ? " is-completed" : ""}" data-task-id="${escapeHtml(task.id)}">
      <label class="task-check" aria-label="${task.completed ? "Mark as active" : "Mark as completed"}: ${safeTitle}">
        <input type="checkbox" data-action="toggle" ${task.completed ? "checked" : ""} aria-label="${task.completed ? "Mark as active" : "Mark as completed"}" />
        <span class="check-visual" aria-hidden="true">✓</span>
      </label>
      <div class="task-main">
        <p class="task-title">${safeTitle}</p>
        <div class="task-meta"><span class="category-pill ${categoryClass}">${task.category}</span>${dueDate}</div>
      </div>
      <div class="task-actions">
        <button class="icon-button" type="button" data-action="edit" aria-label="Edit ${safeTitle}" title="Edit task">✎</button>
        <button class="icon-button delete-button" type="button" data-action="delete" aria-label="Delete ${safeTitle}" title="Delete task">×</button>
      </div>
    </article>`;
}

function createTask(title, category, dueDate) {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: title.trim(),
    category,
    dueDate,
    completed: false,
    createdAt: Date.now()
  };
}

function setFilter(filter) {
  activeFilter = filter;
  render();
}

function showToast(message, type = "success") {
  const region = document.querySelector("#toast-region");
  region.innerHTML = `<div class="toast toast-${type}"><span class="toast-mark" aria-hidden="true">${type === "success" ? "✓" : "✦"}</span><span>${escapeHtml(message)}</span></div>`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    const toast = region.querySelector(".toast");
    if (!toast) return;
    toast.classList.add("toast-leaving");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, 2400);
}

function celebrateCompletion() {
  const layer = document.querySelector("#celebration-layer");
  const colors = ["#6eaa78", "#f0bd69", "#e68c79", "#8c83c7", "#76b7b2"];
  for (let index = 0; index < 24; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.setProperty("--confetti-x", `${Math.random() * 100}vw`);
    piece.style.setProperty("--confetti-drift", `${(Math.random() - 0.5) * 180}px`);
    piece.style.setProperty("--confetti-delay", `${Math.random() * 180}ms`);
    piece.style.setProperty("--confetti-color", colors[index % colors.length]);
    layer.append(piece);
    piece.addEventListener("animationend", () => piece.remove(), { once: true });
  }
}

addTaskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(addTaskForm);
  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  tasks.unshift(createTask(title, String(formData.get("category")), String(formData.get("dueDate") || "")));
  saveToLocalStorage();
  addTaskForm.reset();
  document.querySelector("#task-title").focus();
  render();
  showToast("A fresh task, ready when you are.");
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

document.querySelector("#search-input").addEventListener("input", (event) => {
  searchQuery = event.target.value.trim().toLocaleLowerCase();
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    document.querySelector("#search-input").focus();
  }
});

taskList.addEventListener("change", (event) => {
  if (!event.target.matches('[data-action="toggle"]')) return;
  const row = event.target.closest("[data-task-id]");
  const task = tasks.find((item) => item.id === row.dataset.taskId);
  if (!task) return;
  task.completed = event.target.checked;
  saveToLocalStorage();
  render();
  if (task.completed) {
    celebrateCompletion();
    showToast("Nice work — one more thing off your mind.");
  }
});

taskList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("[data-task-id]");
  const task = tasks.find((item) => item.id === row.dataset.taskId);
  if (!task) return;

  if (button.dataset.action === "delete") {
    tasks = tasks.filter((item) => item.id !== task.id);
    saveToLocalStorage();
    render();
    showToast("Task removed.", "neutral");
  } else if (button.dataset.action === "edit") {
    editTaskForm.elements.id.value = task.id;
    editTaskForm.elements.title.value = task.title;
    editTaskForm.elements.category.value = task.category;
    editTaskForm.elements.dueDate.value = task.dueDate;
    editDialog.showModal();
    editTaskForm.elements.title.focus();
  }
});

editTaskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(editTaskForm);
  const task = tasks.find((item) => item.id === formData.get("id"));
  const title = String(formData.get("title") || "").trim();
  if (!task || !title) return;
  task.title = title;
  task.category = String(formData.get("category"));
  task.dueDate = String(formData.get("dueDate") || "");
  saveToLocalStorage();
  editDialog.close();
  render();
  showToast("Your changes are saved.");
});

document.querySelector("#close-dialog").addEventListener("click", () => editDialog.close());
document.querySelector("#cancel-edit").addEventListener("click", () => editDialog.close());

document.querySelector("#password-toggle").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const isVisible = loginPassword.type === "text";
  loginPassword.type = isVisible ? "password" : "text";
  button.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
  button.setAttribute("aria-pressed", String(!isVisible));
  loginPassword.focus();
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginError.hidden = true;
  if (!loginForm.reportValidity()) return;

  const email = loginEmail.value.trim();
  const submitButton = document.querySelector("#login-submit");
  submitButton.disabled = true;
  submitButton.classList.add("is-loading");
  submitButton.querySelector("span:first-child").textContent = "Making space for you…";

  window.setTimeout(() => {
    const saved = saveDemoSession(email);
    showApp(email);
    render();
    showToast(saved ? "Demo sign-in complete. Welcome!" : "Signed in for this visit. Session storage is unavailable.", saved ? "success" : "neutral");
    submitButton.disabled = false;
    submitButton.classList.remove("is-loading");
    submitButton.querySelector("span:first-child").textContent = "Step into your day";
  }, 350);
});

document.querySelector("#logout-button").addEventListener("click", () => {
  try {
    sessionStorage.removeItem("daymark.demo.email");
  } catch (error) {
    console.error("Could not clear the Daymark demo session.", error);
  }
  showLogin();
});

const now = new Date();
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "short", month: "short", day: "numeric"
}).format(now);
document.querySelector("#date-day").textContent = now.getDate();
document.querySelector("#date-month").textContent = new Intl.DateTimeFormat(undefined, { month: "short" }).format(now);

signedInEmail = readDemoSession();
if (signedInEmail) showApp(signedInEmail);
render();
