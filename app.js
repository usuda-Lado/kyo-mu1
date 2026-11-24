const STORAGE_KEY = "school-note-data-v1";
const statuses = ["未着手", "進行中", "提出済み", "未提出"];
let noticeTimer;

const dateOffset = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
};

function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const initialData = () => ({
  schedule: [
    { id: crypto.randomUUID(), date: dateOffset(0), period: "2", className: "1年A組", from: "数学", to: "理科", note: "理科室に集合してください。" },
    { id: crypto.randomUUID(), date: dateOffset(0), period: "5", className: "2年B組", from: "英語", to: "英語（少人数）", note: "教室はそのままです。" },
    { id: crypto.randomUUID(), date: dateOffset(1), period: "3", className: "1年A組", from: "国語", to: "体育", note: "体育館シューズを持参。" },
  ],
  assignments: [
    { id: crypto.randomUUID(), title: "ワーク p.10〜12", subject: "数学", className: "1年A組", dueDate: dateOffset(1), status: "進行中" },
    { id: crypto.randomUUID(), title: "漢字プリント", subject: "国語", className: "1年A組", dueDate: dateOffset(2), status: "未着手" },
    { id: crypto.randomUUID(), title: "単語テスト直し", subject: "英語", className: "2年B組", dueDate: dateOffset(0), status: "提出済み" },
  ],
});

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return initialData();
  try {
    const data = JSON.parse(saved);
    if (!Array.isArray(data.schedule) || !Array.isArray(data.assignments)) {
      throw new Error("保存データの形式が正しくありません。");
    }
    return data;
  } catch (error) {
    console.error("保存データを読み込めませんでした。", error);
    showNotice("保存データを読み込めませんでした。ブラウザーの保存内容を確認してください。", true);
    return initialData();
  }
}

let data = loadData();
const selectedDate = document.querySelector("#selected-date");
const scheduleList = document.querySelector("#schedule-list");
const assignmentList = document.querySelector("#assignment-list");

selectedDate.value = dateOffset(0);

function showNotice(message, isError = false) {
  const notice = document.querySelector("#save-notice");
  notice.textContent = message;
  notice.style.color = isError ? "#c44957" : "";
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice.textContent = ""; }, 4000);
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showNotice("変更をこの端末に保存しました。");
  } catch (error) {
    console.error("データを保存できませんでした。", error);
    showNotice("保存できませんでした。ブラウザーの設定を確認してください。", true);
  }
}

function formatDate(value, options = { month: "numeric", day: "numeric", weekday: "short" }) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("ja-JP", options).format(new Date(year, month - 1, day));
}

function addText(parent, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  parent.append(element);
  return element;
}

function renderSchedule() {
  const entries = data.schedule
    .filter((entry) => entry.date === selectedDate.value)
    .sort((a, b) => Number(a.period) - Number(b.period));
  scheduleList.replaceChildren();
  document.querySelector("#schedule-empty").classList.toggle("hidden", entries.length > 0);

  entries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "schedule-item";
    addText(item, "span", "period", `${entry.period}限`);
    const main = document.createElement("div");
    main.className = "schedule-main";
    addText(main, "p", "schedule-meta", entry.className);
    const title = document.createElement("p");
    title.className = "schedule-title";
    title.append(document.createTextNode(entry.from));
    addText(title, "span", "arrow", "→");
    title.append(document.createTextNode(entry.to));
    main.append(title);
    if (entry.note) addText(main, "p", "schedule-note", entry.note);
    item.append(main);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.setAttribute("aria-label", `${entry.className} ${entry.period}限の変更を削除`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      data.schedule = data.schedule.filter((item) => item.id !== entry.id);
      saveData();
      render();
    });
    item.append(remove);
    scheduleList.append(item);
  });
  document.querySelector("#today-change-count").textContent = String(entries.length);
}

function renderAssignments() {
  assignmentList.replaceChildren();
  document.querySelector("#assignment-empty").classList.toggle("hidden", data.assignments.length > 0);
  const sorted = [...data.assignments].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  sorted.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "assignment-item";
    const info = document.createElement("div");
    addText(info, "p", "assignment-title", entry.title);
    addText(info, "p", "assignment-meta", `${entry.subject} ・ ${entry.className} ・ ${formatDate(entry.dueDate)} まで`);
    item.append(info);
    const controls = document.createElement("div");
    controls.className = "assignment-controls";
    const select = document.createElement("select");
    select.className = "status-select";
    select.setAttribute("aria-label", `${entry.title}の提出状況`);
    statuses.forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      option.selected = status === entry.status;
      select.append(option);
    });
    select.addEventListener("change", () => {
      entry.status = select.value;
      saveData();
      renderStats();
    });
    controls.append(select);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.setAttribute("aria-label", `${entry.title}を削除`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      data.assignments = data.assignments.filter((item) => item.id !== entry.id);
      saveData();
      render();
    });
    controls.append(remove);
    item.append(controls);
    assignmentList.append(item);
  });
}

function renderStats() {
  const submitted = data.assignments.filter((item) => item.status === "提出済み").length;
  const active = data.assignments.filter((item) => item.status !== "提出済み").length;
  document.querySelector("#active-assignment-count").textContent = String(active);
  document.querySelector("#submitted-count").textContent = String(submitted);
}

function render() {
  renderSchedule();
  renderAssignments();
  renderStats();
}

document.querySelectorAll("[data-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const form = document.getElementById(button.dataset.toggle);
    form.classList.toggle("hidden");
    if (!form.classList.contains("hidden")) form.querySelector("input")?.focus();
  });
});

document.querySelectorAll("[data-cancel]").forEach((button) => {
  button.addEventListener("click", () => {
    const form = document.getElementById(button.dataset.cancel);
    form.reset();
    form.classList.add("hidden");
  });
});

document.querySelector("#schedule-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  data.schedule.push({ id: crypto.randomUUID(), ...values });
  saveData();
  event.currentTarget.reset();
  event.currentTarget.classList.add("hidden");
  render();
});

document.querySelector("#assignment-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  data.assignments.push({ id: crypto.randomUUID(), ...values, status: "未着手" });
  saveData();
  event.currentTarget.reset();
  event.currentTarget.classList.add("hidden");
  render();
});

selectedDate.addEventListener("change", renderSchedule);
render();
