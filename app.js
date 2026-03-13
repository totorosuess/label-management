const fileInput = document.getElementById("fileInput");
const dropzone = document.getElementById("dropzone");
const loadSample = document.getElementById("loadSample");
const clearData = document.getElementById("clearData");
const searchInput = document.getElementById("searchInput");
const lineFilter = document.getElementById("lineFilter");
const level1Filter = document.getElementById("level1Filter");
const level2Filter = document.getElementById("level2Filter");
const cardGrid = document.getElementById("cardGrid");
const resultsMeta = document.getElementById("resultsMeta");

const statTotal = document.getElementById("stat-total");
const statLine = document.getElementById("stat-line");
const statLevels = document.getElementById("stat-levels");

const cardTemplate = document.getElementById("cardTemplate");

let rawRecords = [];

const columns = {
  title: "experience_labels_name",
  level1: "experience_label1_name",
  level2: "experience_label2_name",
  level3: "experience_label3_name",
  line: "产品业务线",
  description: "体验标签对应的用户表现型",
};

function parseCSV(text) {
  const rows = [];
  const cleaned = text.replace(/^\uFEFF/, "");
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];
    const next = cleaned[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && (char === "," || char === "\n" || char === "\r")) {
      row.push(value);
      value = "";

      if (char === ",") {
        continue;
      }

      if (char === "\r" && next === "\n") {
        i += 1;
      }

      rows.push(row);
      row = [];
      continue;
    }

    value += char;
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function normalizeRecords(rows) {
  if (!rows.length) return [];
  const header = rows[0].map((cell) => cell.trim());
  const colIndex = (name) => header.indexOf(name);

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell || "").trim().length))
    .map((row, idx) => {
      const pick = (name) => {
        const index = colIndex(name);
        if (index === -1) return "";
        return (row[index] || "").trim();
      };

      return {
        id: `${idx}-${Math.random().toString(16).slice(2)}`,
        title: pick(columns.title),
        level1: pick(columns.level1),
        level2: pick(columns.level2),
        level3: pick(columns.level3),
        line: pick(columns.line),
        description: pick(columns.description),
      };
    });
}

function uniqueValues(items, key) {
  const set = new Set();
  items.forEach((item) => {
    if (item[key]) set.add(item[key]);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function updateFilters(records) {
  const lines = uniqueValues(records, "line");
  const level1s = uniqueValues(records, "level1");
  const level2s = uniqueValues(records, "level2");

  fillSelect(lineFilter, lines);
  fillSelect(level1Filter, level1s);
  fillSelect(level2Filter, level2s);
}

function fillSelect(select, options) {
  const current = select.value;
  select.innerHTML = '<option value="">全部</option>';
  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    select.appendChild(opt);
  });
  if (current) {
    select.value = current;
  }
}

function applyFilters() {
  const keyword = searchInput.value.trim().toLowerCase();
  const lineValue = lineFilter.value;
  const level1Value = level1Filter.value;
  const level2Value = level2Filter.value;

  const filtered = rawRecords.filter((record) => {
    if (lineValue && record.line !== lineValue) return false;
    if (level1Value && record.level1 !== level1Value) return false;
    if (level2Value && record.level2 !== level2Value) return false;
    if (!keyword) return true;

    const haystack = [
      record.title,
      record.level1,
      record.level2,
      record.level3,
      record.line,
      record.description,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(keyword);
  });

  renderCards(filtered);
  updateStats(filtered);
}

function updateStats(records) {
  statTotal.textContent = String(records.length);
  statLine.textContent = String(uniqueValues(records, "line").length);

  const levels = new Set();
  records.forEach((record) => {
    if (record.level1) levels.add(record.level1);
    if (record.level2) levels.add(record.level2);
    if (record.level3) levels.add(record.level3);
  });

  statLevels.textContent = String(levels.size);
}

function renderCards(records) {
  cardGrid.innerHTML = "";

  if (!records.length) {
    resultsMeta.textContent = "没有匹配的标签";
    return;
  }

  resultsMeta.textContent = `显示 ${records.length} 条标签`;

  const fragment = document.createDocumentFragment();

  records.forEach((record) => {
    const node = cardTemplate.content.cloneNode(true);
    const title = node.querySelector(".card-title");
    const pill = node.querySelector(".pill");
    const levels = node.querySelector(".card-levels");
    const desc = node.querySelector(".card-desc");

    title.textContent = record.title || "未命名标签";
    pill.textContent = record.line || "未设置业务线";

    [record.level1, record.level2, record.level3]
      .filter(Boolean)
      .forEach((level) => {
        const tag = document.createElement("span");
        tag.className = "level-tag";
        tag.textContent = level;
        levels.appendChild(tag);
      });

    desc.textContent = record.description || "暂无标签说明";
    fragment.appendChild(node);
  });

  cardGrid.appendChild(fragment);
}

function setDataFromText(text) {
  const rows = parseCSV(text);
  const records = normalizeRecords(rows);
  rawRecords = records;
  updateFilters(rawRecords);
  applyFilters();
}

function handleFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    setDataFromText(event.target.result || "");
  };
  reader.readAsText(file);
}

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  handleFile(file);
});

[searchInput, lineFilter, level1Filter, level2Filter].forEach((input) => {
  input.addEventListener("input", applyFilters);
  input.addEventListener("change", applyFilters);
});

clearData.addEventListener("click", () => {
  rawRecords = [];
  cardGrid.innerHTML = "";
  resultsMeta.textContent = "暂无数据";
  updateStats([]);
});

loadSample.addEventListener("click", () => {
  const sample =
    "experience_labels_name,experience_label1_name,experience_label2_name,experience_label3_name,产品业务线,体验标签对应的用户表现型\n" +
    "视频音频异常,Creation,Video Sound,Detail Page,Creation,用户反馈音乐详情页加载异常或错误音乐展示\n" +
    "上传体验,Creation,Upload,Fail,Creation,用户上传失败或进度卡住\n" +
    "隐私设置,Account,Privacy,Settings,Account,用户希望调整隐私或权限设置";

  setDataFromText(sample);
});

function bindDropzone() {
  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
    const file = event.dataTransfer.files[0];
    handleFile(file);
  });
}

bindDropzone();
updateStats([]);
