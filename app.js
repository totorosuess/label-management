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
const exportCsv = document.getElementById("exportCsv");
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const pageInfo = document.getElementById("pageInfo");
const pageSizeSelect = document.getElementById("pageSizeSelect");
const confirmModal = document.getElementById("confirmModal");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");
const confirmCancel = document.getElementById("confirmCancel");
const confirmOk = document.getElementById("confirmOk");
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editLine = document.getElementById("editLine");
const editLevel1 = document.getElementById("editLevel1");
const editLevel2 = document.getElementById("editLevel2");
const editLevel3 = document.getElementById("editLevel3");
const editDesc = document.getElementById("editDesc");
const editCancel = document.getElementById("editCancel");
const saveLabel = document.getElementById("saveLabel");
const actionHeader = document.getElementById("actionHeader");

const menuItems = document.querySelectorAll(".menu-item");
const pages = document.querySelectorAll(".page");

let rawRecords = [];
let editingId = null;
let currentPage = 1;
let pageSize = 20;
let confirmResolve = null;
const storageKey = "label_management_records_v1";
let canEdit = false;

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
    desc: "",
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
      <td class="edit-only">${canEdit ? `<input type="checkbox" data-id="${record.id}" />` : ""}</td>
      <td>${escapeHtml(record.line)}</td>
      <td>${escapeHtml(record.level1)}</td>
      <td>${escapeHtml(record.level2)}</td>
      <td>${escapeHtml(record.level3)}</td>
      <td><span class="truncate-single has-tooltip" data-tooltip="${escapeHtml(
        record.description
      )}">${escapeHtml(record.description)}</span></td>
      <td class="edit-only">
        ${
          canEdit
            ? `<div class=\"inline-actions\">
                <button class=\"btn ghost\" data-action=\"edit\" data-id=\"${record.id}\">编辑</button>
                <button class=\"btn ghost\" data-action=\"delete\" data-id=\"${record.id}\">删除</button>
              </div>`
            : ""
        }
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
  const merged = mergeWithDuplicateCheck(rawRecords, records);
  if (!merged) {
    alertAction("存在重复命名的标签", "批量导入的三级标签名称有重复，已取消导入。");
    return;
  }
  rawRecords = merged;
  persistRecords();
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
  rawRecords = [
    {
      id: `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: deriveTitle(formValues),
      ...formValues,
    },
    ...rawRecords,
  ];

  persistRecords();
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

function deleteRecord(id) {
  rawRecords = rawRecords.filter((record) => record.id !== id);
  persistRecords();
  currentPage = 1;
  updateFilters(rawRecords);
  renderManageTable(rawRecords);
  applyFilters();
  if (editingId === id) closeEditModal();
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

labelForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canEdit) return;
  const values = getFormValues();
  if (hasDuplicateLevel3(values.level3, null)) {
    await alertAction("存在重复命名的标签", "三级标签名称重复，无法保存。");
    return;
  }
  const ok = await confirmAction(
    "确认新增标签",
    "确定新增该标签吗？"
  );
  if (!ok) return;
  upsertRecord(values);
});

resetFormBtn.addEventListener("click", () => {
  resetForm();
});

manageTableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (!canEdit) return;

  const id = button.dataset.id;
  if (button.dataset.action === "edit") {
    const record = rawRecords.find((item) => item.id === id);
    if (!record) return;
    const ok = await confirmAction("确认编辑标签", "确定进入编辑该标签吗？");
    if (!ok) return;
    openEditModal(record);
  }

  if (button.dataset.action === "delete") {
    const ok = await confirmAction("确认删除标签", "删除后无法恢复，确定删除吗？");
    if (!ok) return;
    deleteRecord(id);
  }
});

selectAll.addEventListener("change", (event) => {
  if (!canEdit) return;
  const checked = event.target.checked;
  manageTableBody.querySelectorAll("input[type='checkbox']").forEach((box) => {
    box.checked = checked;
  });
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

function persistRecords() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(rawRecords));
  } catch (error) {
    console.warn("Failed to persist records", error);
  }
}

function restoreRecords() {
  try {
    const cached = localStorage.getItem(storageKey);
    if (!cached) return;
    const parsed = JSON.parse(cached);
    if (!Array.isArray(parsed)) return;
    rawRecords = parsed.map((record, idx) => ({
      id: record.id || `${idx}-${Math.random().toString(16).slice(2)}`,
      title: record.title || "",
      level1: record.level1 || "",
      level2: record.level2 || "",
      level3: record.level3 || "",
      line: record.line || "",
      description: record.description || "",
    }));
  } catch (error) {
    console.warn("Failed to restore records", error);
  }
}

renderManageTable([]);
updateStats([]);
switchPage("manage");
restoreRecords();
if (rawRecords.length) {
  currentPage = 1;
  updateFilters(rawRecords);
  renderManageTable(rawRecords);
  applyFilters();
}
applyPermissions();
checkPermission();

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

function hasDuplicateLevel3(level3Value, currentId) {
  const value = String(level3Value || "").trim();
  if (!value) return false;
  return rawRecords.some(
    (record) => record.level3 === value && record.id !== currentId
  );
}

function mergeWithDuplicateCheck(existing, incoming) {
  const seen = new Set(
    existing.map((record) => String(record.level3 || "").trim()).filter(Boolean)
  );

  for (const record of incoming) {
    const value = String(record.level3 || "").trim();
    if (!value) continue;
    if (seen.has(value)) {
      return null;
    }
    seen.add(value);
  }

  return [...incoming, ...existing];
}

function confirmAction(title, message) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmModal.classList.remove("hidden");
  confirmCancel.classList.remove("hidden");
  confirmOk.textContent = "确认";

  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

function alertAction(title, message) {
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmCancel.classList.add("hidden");
  confirmOk.textContent = "知道了";
  confirmModal.classList.remove("hidden");

  return new Promise((resolve) => {
    confirmResolve = resolve;
  });
}

function closeConfirm(result) {
  confirmModal.classList.add("hidden");
  if (confirmResolve) {
    confirmResolve(result);
    confirmResolve = null;
  }
}

confirmCancel.addEventListener("click", () => {
  closeConfirm(false);
});

confirmOk.addEventListener("click", () => {
  closeConfirm(true);
});

confirmModal.addEventListener("click", (event) => {
  if (event.target.classList.contains("modal-backdrop")) {
    closeConfirm(false);
  }
});

function openEditModal(record) {
  editingId = record.id;
  editLine.value = record.line || "";
  editLevel1.value = record.level1 || "";
  editLevel2.value = record.level2 || "";
  editLevel3.value = record.level3 || "";
  editDesc.value = record.description || "";
  editModal.classList.remove("hidden");
}

function closeEditModal() {
  editModal.classList.add("hidden");
  editingId = null;
}

function updateRecord(id, values) {
  rawRecords = rawRecords.map((record) =>
    record.id === id ? { ...record, ...values, title: deriveTitle(values) } : record
  );
  persistRecords();
  updateFilters(rawRecords);
  renderManageTable(rawRecords);
  applyFilters();
}

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canEdit) return;
  const values = {
    line: editLine.value.trim(),
    level1: editLevel1.value.trim(),
    level2: editLevel2.value.trim(),
    level3: editLevel3.value.trim(),
    description: editDesc.value.trim(),
  };

  if (hasDuplicateLevel3(values.level3, editingId)) {
    await alertAction("存在重复命名的标签", "三级标签名称重复，无法保存。");
    return;
  }

  const ok = await confirmAction("确认编辑标签", "确定保存对该标签的修改吗？");
  if (!ok) return;
  updateRecord(editingId, values);
  closeEditModal();
});

editCancel.addEventListener("click", () => {
  if (!canEdit) return;
  closeEditModal();
});

editModal.addEventListener("click", (event) => {
  if (event.target.classList.contains("modal-backdrop")) {
    closeEditModal();
  }
});

function applyPermissions() {
  document.body.classList.toggle("readonly", !canEdit);
  formLine.disabled = !canEdit;
  formLevel1.disabled = !canEdit;
  formLevel2.disabled = !canEdit;
  formLevel3.disabled = !canEdit;
  formDesc.disabled = !canEdit;
  editLine.disabled = !canEdit;
  editLevel1.disabled = !canEdit;
  editLevel2.disabled = !canEdit;
  editLevel3.disabled = !canEdit;
  editDesc.disabled = !canEdit;
  saveLabel.disabled = !canEdit;
  resetFormBtn.disabled = !canEdit;
  fileInput.disabled = !canEdit;
  selectAll.disabled = !canEdit;
  if (!canEdit) {
    closeEditModal();
  }
}

async function checkPermission() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const view = params.get("view");
  const apiBase = params.get("api") || "http://localhost:8000";

  if (view === "readonly" && !token) {
    canEdit = false;
    applyPermissions();
    renderManageTable(rawRecords);
    return;
  }

  if (!token) {
    canEdit = false;
    applyPermissions();
    renderManageTable(rawRecords);
    return;
  }

  try {
    const resp = await fetch(`${apiBase}/api/permission?token=${encodeURIComponent(token)}`);
    if (!resp.ok) throw new Error("permission check failed");
    const data = await resp.json();
    canEdit = data.mode === "edit";
  } catch (error) {
    canEdit = false;
    await alertAction("权限校验失败", "无法验证权限，已切换为只读模式。");
  }

  applyPermissions();
  renderManageTable(rawRecords);
}
