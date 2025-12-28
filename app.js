const pdfs = [
  {
    id: "customer-service",
    title: "接客サービス (Customer Service)",
    file: "ssw2_jf_customer_service_text_ja_v231227.pdf",
    description: "接客・サービス分野の特定技能評価試験 PDF。現場のコミュニケーションや接客フローを学ぶための資料です。"
  },
  {
    id: "hygiene-controls",
    title: "衛生管理 (Hygiene Controls)",
    file: "ssw2_jf_hygiene_controls_text_ja_v231227.pdf",
    description: "食品衛生と衛生管理に関する基礎知識。衛生的な店舗運営に役立つガイドラインを収録。"
  },
  {
    id: "preparation",
    title: "飲食物調製 (Preparation of Food and Drink)",
    file: "ssw2_jf_preparation_of_food_and_drink_text_ja_v231227.pdf",
    description: "飲食物の調製手順と安全・品質に関する注意点をまとめた資料です。"
  },
  {
    id: "store-management",
    title: "店舗管理 (Store Management)",
    file: "ssw2_jf_store_management_text_ja_v231227.pdf",
    description: "店舗オペレーションとマネジメント。安全・品質と効率を両立するためのポイントが整理されています。"
  }
];

const pdfSelect = document.getElementById("pdf-select");
const pdfTitle = document.getElementById("pdf-title");
const pdfDescription = document.getElementById("pdf-description");
const pageCount = document.getElementById("page-count");
const pageNumber = document.getElementById("page-number");
const pageHelper = document.getElementById("page-helper");
const pageInput = document.getElementById("page-input");
const canvas = document.getElementById("pdf-canvas");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
const searchForm = document.getElementById("search-form");
const searchQueryInput = document.getElementById("search-query");
const searchResults = document.getElementById("search-results");
const searchStatus = document.getElementById("search-status");
const noteForm = document.getElementById("note-form");
const noteText = document.getElementById("note-text");
const notePageLabel = document.getElementById("note-page-label");
const notesList = document.getElementById("notes-list");
const cardForm = document.getElementById("card-form");
const cardQuestion = document.getElementById("card-question");
const cardAnswer = document.getElementById("card-answer");
const cardsList = document.getElementById("cards-list");
const zoomSlider = document.getElementById("zoom-slider");
const resetButton = document.getElementById("reset-data");

let pdfDoc = null;
let currentPage = 1;
let currentPdf = pdfs[0];
let rendering = false;
let pendingPage = null;
let scale = Number(zoomSlider.value);
let pageTextCache = {};
let toggleNavigation = () => {};

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.js";

function populateSelect() {
  pdfs.forEach((pdf) => {
    const option = document.createElement("option");
    option.value = pdf.id;
    option.textContent = pdf.title;
    pdfSelect.appendChild(option);
  });
}

function getStorageKey(type) {
  return `${type}-${currentPdf.id}`;
}

function saveToStorage(type, data) {
  localStorage.setItem(getStorageKey(type), JSON.stringify(data));
}

function loadFromStorage(type) {
  const stored = localStorage.getItem(getStorageKey(type));
  return stored ? JSON.parse(stored) : [];
}

function updateMeta() {
  pdfTitle.textContent = currentPdf.title;
  pdfDescription.textContent = currentPdf.description;
  pageHelper.textContent = `Page ${currentPage} of ${pdfDoc?.numPages ?? 1}`;
  pageInput.max = pdfDoc?.numPages ?? 1;
  notePageLabel.textContent = currentPage;
}

function renderPage(num) {
  rendering = true;
  currentPage = num;
  notePageLabel.textContent = currentPage;
  const ctx = canvas.getContext("2d");
  pageInput.value = currentPage;

  pdfDoc.getPage(num).then((page) => {
    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: ctx,
      viewport
    };

    page
      .render(renderContext)
      .promise.then(() => {
        rendering = false;
        if (pendingPage !== null) {
          renderPage(pendingPage);
          pendingPage = null;
        }
        pageNumber.textContent = currentPage;
        pageHelper.textContent = `Page ${currentPage} of ${pdfDoc.numPages}`;
      })
      .catch((err) => {
        console.error(err);
        rendering = false;
      });
  });
}

function queueRenderPage(num) {
  if (rendering) {
    pendingPage = num;
  } else {
    renderPage(num);
  }
}

function onPrevPage() {
  if (currentPage <= 1) return;
  queueRenderPage(currentPage - 1);
}

function onNextPage() {
  if (currentPage >= pdfDoc.numPages) return;
  queueRenderPage(currentPage + 1);
}

function bindNavigation() {
  const prevBtn = document.getElementById("prev-page");
  const nextBtn = document.getElementById("next-page");
  prevBtn.addEventListener("click", onPrevPage);
  nextBtn.addEventListener("click", onNextPage);
  document.getElementById("jump-button").addEventListener("click", () => {
    const target = Number(pageInput.value);
    if (!target || target < 1 || target > pdfDoc.numPages) return;
    queueRenderPage(target);
  });
  pageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const target = Number(pageInput.value);
      if (!target || target < 1 || target > pdfDoc.numPages) return;
      queueRenderPage(target);
    }
  });
  zoomSlider.addEventListener("input", () => {
    scale = Number(zoomSlider.value);
    queueRenderPage(currentPage);
  });

  const toggleNav = (enabled) => {
    prevBtn.disabled = !enabled;
    nextBtn.disabled = !enabled;
    pageInput.disabled = !enabled;
  };
  toggleNav(false);
  toggleNavigation = toggleNav;
}

async function getPageText(pageNumber) {
  if (pageTextCache[pageNumber]) return pageTextCache[pageNumber];
  const page = await pdfDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const text = textContent.items.map((item) => item.str).join(" ");
  pageTextCache[pageNumber] = text;
  return text;
}

async function indexDocument() {
  searchStatus.textContent = "Indexing pages…";
  const tasks = [];
  for (let i = 1; i <= pdfDoc.numPages; i += 1) {
    tasks.push(getPageText(i));
  }
  await Promise.all(tasks);
  searchStatus.textContent = "Ready to search";
}

function highlightSnippet(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 160) + "...";
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + query.length + 60);
  const before = text.slice(start, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length, end);
  return `${before}<mark>${match}</mark>${after}${end < text.length ? "…" : ""}`;
}

async function searchDocument(query) {
  if (!query.trim()) {
    searchResults.innerHTML = "";
    searchStatus.textContent = "Enter a keyword to search.";
    return;
  }
  searchStatus.textContent = "Searching…";
  const hits = [];
  for (let i = 1; i <= pdfDoc.numPages; i += 1) {
    const text = await getPageText(i);
    if (text.toLowerCase().includes(query.toLowerCase())) {
      hits.push({ page: i, text });
    }
  }

  if (!hits.length) {
    searchStatus.textContent = "No matches found.";
    searchResults.innerHTML = "";
    return;
  }

  searchStatus.textContent = `Found ${hits.length} page${hits.length > 1 ? "s" : ""}.`;
  searchResults.innerHTML = "";

  hits.slice(0, 50).forEach((hit) => {
    const card = document.createElement("div");
    card.className = "card search-hit";
    card.innerHTML = `
      <div class="tag">Page ${hit.page}</div>
      <p>${highlightSnippet(hit.text, query)}</p>
      <button data-page="${hit.page}" class="jump-btn">Jump to page</button>
    `;
    searchResults.appendChild(card);
  });

  searchResults.querySelectorAll(".jump-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = Number(btn.dataset.page);
      queueRenderPage(page);
      pageInput.value = page;
    });
  });
}

function renderNotes() {
  const notes = loadFromStorage("notes");
  notesList.innerHTML = "";
  if (!notes.length) {
    notesList.innerHTML = '<p class="muted">No notes yet.</p>';
    return;
  }
  notes
    .slice()
    .reverse()
    .forEach((note) => {
      const card = document.createElement("div");
      card.className = "card";
      const time = new Date(note.timestamp).toLocaleString();
      card.innerHTML = `
        <div class="tag">Page ${note.page}</div>
        <p>${note.text}</p>
        <p class="muted" style="font-size: 0.85rem;">Saved ${time}</p>
      `;
      notesList.appendChild(card);
    });
}

function renderCards() {
  const cards = loadFromStorage("cards");
  cardsList.innerHTML = "";
  if (!cards.length) {
    cardsList.innerHTML = '<p class="muted">No flashcards yet.</p>';
    return;
  }
  cards
    .slice()
    .reverse()
    .forEach((cardData, index) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="tag">Card ${cards.length - index}</div>
        <p><strong>Q:</strong> ${cardData.question}</p>
        <p><strong>A:</strong> ${cardData.answer}</p>
        <p class="muted" style="font-size: 0.85rem;">From page ${cardData.page}</p>
      `;
      cardsList.appendChild(card);
    });
}

function bindForms() {
  noteForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = noteText.value.trim();
    if (!text) return;
    const notes = loadFromStorage("notes");
    notes.push({
      id: crypto.randomUUID(),
      page: currentPage,
      text,
      timestamp: Date.now()
    });
    saveToStorage("notes", notes);
    noteText.value = "";
    renderNotes();
  });

  cardForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const question = cardQuestion.value.trim();
    const answer = cardAnswer.value.trim();
    if (!question || !answer) return;
    const cards = loadFromStorage("cards");
    cards.push({
      id: crypto.randomUUID(),
      question,
      answer,
      page: currentPage,
      timestamp: Date.now()
    });
    saveToStorage("cards", cards);
    cardQuestion.value = "";
    cardAnswer.value = "";
    renderCards();
  });
}

function bindSearch() {
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await searchDocument(searchQueryInput.value);
  });

  searchQueryInput.addEventListener("input", async () => {
    if (!searchQueryInput.value.trim()) {
      searchResults.innerHTML = "";
      searchStatus.textContent = "";
    }
  });
}

function bindPdfSelection() {
  pdfSelect.addEventListener("change", () => {
    const selected = pdfs.find((pdf) => pdf.id === pdfSelect.value);
    if (selected) {
      loadPdf(selected);
    }
  });
}

function resetData() {
  if (!confirm("Delete all saved notes and flashcards for this document?")) return;
  localStorage.removeItem(getStorageKey("notes"));
  localStorage.removeItem(getStorageKey("cards"));
  renderNotes();
  renderCards();
}

function bindReset() {
  resetButton.addEventListener("click", resetData);
}

async function loadPdf(pdf) {
  loadingOverlay.classList.remove("hidden");
  loadingText.textContent = "Loading PDF…";
  toggleNavigation(false);
  currentPdf = pdf;
  currentPage = 1;
  pageTextCache = {};
  searchResults.innerHTML = "";
  searchStatus.textContent = "";
  noteText.value = "";
  cardQuestion.value = "";
  cardAnswer.value = "";
  pageInput.value = 1;
  pdfSelect.value = pdf.id;
  updateMeta();

  try {
    const loadingTask = pdfjsLib.getDocument(pdf.file);
    pdfDoc = await loadingTask.promise;
    pageCount.textContent = pdfDoc.numPages;
    updateMeta();
    renderPage(currentPage);
    renderNotes();
    renderCards();
    toggleNavigation(true);
    loadingText.textContent = "Indexing for search…";
    await indexDocument();
    loadingOverlay.classList.add("hidden");
  } catch (err) {
    console.error("Failed to load PDF", err);
    loadingText.textContent = "Failed to load PDF. Check file availability.";
  }
}

function init() {
  populateSelect();
  bindNavigation();
  bindForms();
  bindSearch();
  bindPdfSelection();
  bindReset();
  loadPdf(currentPdf);
}

document.addEventListener("DOMContentLoaded", init);
