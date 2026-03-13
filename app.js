const fileInput = document.getElementById("fileInput");
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

const pageTitle = document.getElementById("pageTitle");
const pageDesc = document.getElementById("pageDesc");

const labelForm = document.getElementById("labelForm");
const formLine = document.getElementById("formLine");
const formLevel1 = document.getElementById("formLevel1");
const formLevel2 = document.getElementById("formLevel2");
const formLevel3 = document.getElementById("formLevel3");
const formDesc = document.getElementById("formDesc");
const resetFormBtn = document.getElementById("resetForm");
const manageTableBody = document.getElementById("manageTableBody");
const manageMeta = document.getElementById("manageMeta");
const selectAll = document.getElementById("selectAll");
const bulkDelete = document.getElementById("bulkDelete");
const exportCsv = document.getElementById("exportCsv");
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const pageSizeSelect = document.getElementById("pageSizeSelect");

const menuItems = document.querySelectorAll(".menu-item");
const pages = document.querySelectorAll(".page");

let rawRecords = [];
let editingId = null;
let currentPage = 1;
let pageSize = 20;

const columns = {
  title: "experience_labels_name",
  level1: "experience_label1_name",
  level2: "experience_label2_name",
  level3: "experience_label3_name",
  line: "产品业务线",
  description: "体验标签对应的用户表现型",
};

const pageCopy = {
  manage: {
    title: "标签管理",
    desc: "上传 CSV 并在表格里直接编辑、删除或新增标签。",
  },
  display: {
    title: "标签展示",
    desc: "按业务线和层级筛选标签，快速浏览标签详情。",
  },
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

    title.textContent = "";
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
    desc.classList.add("truncate-multi", "has-tooltip");
    desc.dataset.tooltip = record.description || "暂无标签说明";
    fragment.appendChild(node);
  });

  cardGrid.appendChild(fragment);
}

function paginate(records) {
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  return {
    pageRecords: records.slice(start, end),
    totalPages,
  };
}

function updatePager(totalPages) {
  pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页`;
  prevPage.disabled = currentPage <= 1;
  nextPage.disabled = currentPage >= totalPages;
}

function renderManageTable(records) {
  manageTableBody.innerHTML = "";
  selectAll.checked = false;

  if (!records.length) {
    manageMeta.textContent = "暂无数据";
    updatePager(1);
    return;
  }

  manageMeta.textContent = `共 ${records.length} 条标签`;

  const { pageRecords, totalPages } = paginate(records);
  updatePager(totalPages);

  const fragment = document.createDocumentFragment();
  pageRecords.forEach((record) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input type="checkbox" data-id="${record.id}" /></td>
      <td>${escapeHtml(record.line)}</td>
      <td>${escapeHtml(record.level1)}</td>
      <td>${escapeHtml(record.level2)}</td>
      <td>${escapeHtml(record.level3)}</td>
      <td><span class="truncate-single has-tooltip" data-tooltip="${escapeHtml(
        record.description
      )}">${escapeHtml(record.description)}</span></td>
      <td>
        <div class="inline-actions">
          <button class="btn ghost" data-action="edit" data-id="${record.id}">编辑</button>
          <button class="btn ghost" data-action="delete" data-id="${record.id}">删除</button>
        </div>
      </td>
    `;

    fragment.appendChild(tr);
  });

  manageTableBody.appendChild(fragment);
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setDataFromText(text) {
  const rows = parseCSV(text);
  const records = normalizeRecords(rows);
  rawRecords = records;
  currentPage = 1;
  updateFilters(rawRecords);
  renderManageTable(rawRecords);
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

function resetForm() {
  labelForm.reset();
  editingId = null;
}

function deriveTitle(values) {
  return (
    values.level3 ||
    values.level2 ||
    values.level1 ||
    values.line ||
    "未命名标签"
  );
}

function upsertRecord(formValues) {
  if (editingId) {
    rawRecords = rawRecords.map((record) =>
      record.id === editingId ? { ...record, ...formValues } : record
    );
  } else {
    rawRecords = [
      {
        id: `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: deriveTitle(formValues),
        ...formValues,
      },
      ...rawRecords,
    ];
  }

  currentPage = 1;
  updateFilters(rawRecords);
  renderManageTable(rawRecords);
  applyFilters();
  resetForm();
}

function getFormValues() {
  return {
    line: formLine.value.trim(),
    level1: formLevel1.value.trim(),
    level2: formLevel2.value.trim(),
    level3: formLevel3.value.trim(),
    description: formDesc.value.trim(),
  };
}

function loadForm(record) {
  formLine.value = record.line || "";
  formLevel1.value = record.level1 || "";
  formLevel2.value = record.level2 || "";
  formLevel3.value = record.level3 || "";
  formDesc.value = record.description || "";
}

function deleteRecord(id) {
  rawRecords = rawRecords.filter((record) => record.id !== id);
  currentPage = 1;
  updateFilters(rawRecords);
  renderManageTable(rawRecords);
  applyFilters();
  if (editingId === id) resetForm();
}

function exportToCsv() {
  const header = [
    columns.title,
    columns.level1,
    columns.level2,
    columns.level3,
    columns.line,
    columns.description,
  ];

  const rows = rawRecords.map((record) => [
    record.title,
    record.level1,
    record.level2,
    record.level3,
    record.line,
    record.description,
  ]);

  const csv = [header, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "labels.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function switchPage(target) {
  pages.forEach((page) => {
    page.classList.toggle("hidden", page.id !== `page-${target}`);
  });

  menuItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === target);
  });

  pageTitle.textContent = pageCopy[target].title;
  pageDesc.textContent = pageCopy[target].desc;
}

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  handleFile(file);
});

[searchInput, lineFilter, level1Filter, level2Filter].forEach((input) => {
  input.addEventListener("input", applyFilters);
  input.addEventListener("change", applyFilters);
});

labelForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const values = getFormValues();
  upsertRecord(values);
});

resetFormBtn.addEventListener("click", () => {
  resetForm();
});

manageTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  if (button.dataset.action === "edit") {
    const record = rawRecords.find((item) => item.id === id);
    if (!record) return;
    editingId = id;
    loadForm(record);
    switchPage("manage");
  }

  if (button.dataset.action === "delete") {
    deleteRecord(id);
  }
});

selectAll.addEventListener("change", (event) => {
  const checked = event.target.checked;
  manageTableBody.querySelectorAll("input[type='checkbox']").forEach((box) => {
    box.checked = checked;
  });
});

bulkDelete.addEventListener("click", () => {
  const selected = Array.from(
    manageTableBody.querySelectorAll("input[type='checkbox']:checked")
  ).map((box) => box.dataset.id);

  if (!selected.length) return;
  rawRecords = rawRecords.filter((record) => !selected.includes(record.id));
  currentPage = 1;
  updateFilters(rawRecords);
  renderManageTable(rawRecords);
  applyFilters();
});

exportCsv.addEventListener("click", () => {
  exportToCsv();
});

menuItems.forEach((item) => {
  item.addEventListener("click", () => {
    switchPage(item.dataset.view);
  });
});

prevPage.addEventListener("click", () => {
  currentPage -= 1;
  renderManageTable(rawRecords);
});

nextPage.addEventListener("click", () => {
  currentPage += 1;
  renderManageTable(rawRecords);
});

pageSizeSelect.addEventListener("change", (event) => {
  pageSize = Number(event.target.value) || 20;
  currentPage = 1;
  renderManageTable(rawRecords);
});

renderManageTable([]);
updateStats([]);
switchPage("manage");

const floatingTooltip = document.createElement("div");
floatingTooltip.className = "floating-tooltip";
document.body.appendChild(floatingTooltip);

function showTooltip(text) {
  if (!text) return;
  floatingTooltip.textContent = text;
  floatingTooltip.classList.add("visible");
}

function hideTooltip() {
  floatingTooltip.classList.remove("visible");
}

function moveTooltip(event) {
  const offset = 14;
  let x = event.clientX + offset;
  let y = event.clientY + offset;

  const rect = floatingTooltip.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - offset;
  const maxY = window.innerHeight - rect.height - offset;

  if (x > maxX) x = maxX;
  if (y > maxY) y = maxY;
  if (x < offset) x = offset;
  if (y < offset) y = offset;

  floatingTooltip.style.left = `${x}px`;
  floatingTooltip.style.top = `${y}px`;
}

document.addEventListener("mouseover", (event) => {
  const target = event.target.closest(".has-tooltip");
  if (!target) return;
  const text = target.dataset.tooltip;
  if (!text) return;
  showTooltip(text);
  moveTooltip(event);
});

document.addEventListener("mousemove", (event) => {
  if (!floatingTooltip.classList.contains("visible")) return;
  moveTooltip(event);
});

document.addEventListener("mouseout", (event) => {
  const target = event.target.closest(".has-tooltip");
  if (!target) return;
  hideTooltip();
});
