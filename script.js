(() => {
  "use strict";

  const DATA_URL = "./episodes.json";
  const REFRESH_INTERVAL = 30000;

  const container = document.getElementById("episodes");
  const filterButtons = [...document.querySelectorAll("[data-filter]")];

  if (!container) {
    console.error("Timeline: element #episodes not found.");
    return;
  }

  let episodes = [];
  let activeFilter = "all";
  let isFirstLoad = true;
  let isLoading = false;

  // Названия месяцев на русском и английском.
  const months = {
    "января": 1, "январь": 1, "янв": 1,
    "февраля": 2, "февраль": 2, "фев": 2,
    "марта": 3, "март": 3, "мар": 3,
    "апреля": 4, "апрель": 4, "апр": 4,
    "мая": 5, "май": 5,
    "июня": 6, "июнь": 6, "июн": 6,
    "июля": 7, "июль": 7, "июл": 7,
    "августа": 8, "август": 8, "авг": 8,
    "сентября": 9, "сентябрь": 9, "сен": 9,
    "октября": 10, "октябрь": 10, "окт": 10,
    "ноября": 11, "ноябрь": 11, "ноя": 11,
    "декабря": 12, "декабрь": 12, "дек": 12,

    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12
  };

  // Создание даты с проверкой календарных значений.
  function makeDate(year, month, day) {
    if (day === 0) day = 1;

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      year < 1 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const date = new Date(0);
    date.setHours(0, 0, 0, 0);
    date.setFullYear(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  // Распознавание различных форматов дат.
  function parseDate(value) {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    const input = String(value).trim();

    let match;

    // YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYY-MM
    match = input.match(
      /^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?$/
    );

    if (match) {
      return makeDate(
        Number(match[1]),
        Number(match[2]),
        match[3] === undefined ? 1 : Number(match[3])
      );
    }

    // DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
    match = input.match(
      /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/
    );

    if (match) {
      return makeDate(
        Number(match[3]),
        Number(match[2]),
        Number(match[1])
      );
    }

    // MM/DD/YYYY
    match = input.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    );

    if (match) {
      return makeDate(
        Number(match[3]),
        Number(match[1]),
        Number(match[2])
      );
    }

    const normalized = input
      .toLowerCase()
      .replace(/,/g, "")
      .replace(/\s+/g, " ");

    // 15 августа 2026 или 15 August 2026.
    match = normalized.match(
      /^(\d{1,2})\s+([а-яёa-z]+)\s+(\d{4})$/i
    );

    if (match && months[match[2]]) {
      return makeDate(
        Number(match[3]),
        months[match[2]],
        Number(match[1])
      );
    }

    // август 2026 или August 2026.
    match = normalized.match(
      /^([а-яёa-z]+)\s+(\d{4})$/i
    );

    if (match && months[match[1]]) {
      return makeDate(
        Number(match[2]),
        months[match[1]],
        1
      );
    }

    // August 15, 2026.
    match = normalized.match(
      /^([a-z]+)\s+(\d{1,2})\s+(\d{4})$/i
    );

    if (match && months[match[1]]) {
      return makeDate(
        Number(match[3]),
        months[match[1]],
        Number(match[2])
      );
    }

    // Последняя попытка — стандартный парсер JavaScript.
    const timestamp = Date.parse(input);

    if (!Number.isNaN(timestamp)) {
      const parsed = new Date(timestamp);

      return makeDate(
        parsed.getFullYear(),
        parsed.getMonth() + 1,
        parsed.getDate()
      );
    }

    return null;
  }

  // Отображение даты без изменения исходного формата.
  function formatDate(value) {
    return String(value ?? "");
  }

  // Обновление статистики.
  function updateStats(items) {
    const open = items.filter(
      item => item.status === "open"
    ).length;

    const closed = items.filter(
      item => item.status === "closed"
    ).length;

    const totalElement = document.getElementById("total-count");
    const allElement = document.getElementById("all-count");
    const openElement = document.getElementById("open-count");
    const closedElement = document.getElementById("closed-count");

    if (totalElement) totalElement.textContent = items.length;
    if (allElement) allElement.textContent = items.length;
    if (openElement) openElement.textContent = open;
    if (closedElement) closedElement.textContent = closed;
  }

  // Создание карточки.
  function createCard(item) {
    const card = document.createElement(
      item.url ? "a" : "article"
    );

    card.className = `episode-card episode-card--${item.status}`;

    if (item.url) {
      card.href = item.url;
      card.target = "_blank";
      card.rel = "noopener noreferrer";

      card.setAttribute(
        "aria-label",
        `${item.title}, открыть тему форума`
      );
    }

    const top = document.createElement("div");
    top.className = "episode-card__top";

    const date = document.createElement("time");
    date.className = "episode-card__date";
    date.textContent = formatDate(item.date);

    const parsedDate = parseDate(item.date);

    if (parsedDate) {
      date.dateTime = [
        parsedDate.getFullYear(),
        String(parsedDate.getMonth() + 1).padStart(2, "0"),
        String(parsedDate.getDate()).padStart(2, "0")
      ].join("-");
    }

    const status = document.createElement("span");
    status.className = "episode-card__status";
    status.textContent =
      item.status === "open" ? "Открыт" : "Закрыт";

    const title = document.createElement("div");
    title.className = "episode-card__title";
    title.textContent = item.title;

    if (item.url) {
      const arrow = document.createElement("span");
      arrow.className = "episode-card__arrow";
      arrow.textContent = "↗";
      arrow.setAttribute("aria-hidden", "true");

      title.appendChild(arrow);
    }

    top.append(date, status);
    card.append(top, title);

    return card;
  }

  // Сортировка и отображение карточек.
  function render() {
    const visible = episodes
      .filter(item =>
        activeFilter === "all" ||
        item.status === activeFilter
      )
      .slice()
      .sort((a, b) => {
        const statusOrder =
          (a.status === "open" ? 0 : 1) -
          (b.status === "open" ? 0 : 1);

        if (statusOrder !== 0) {
          return statusOrder;
        }

        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);

        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        if (!dateA && !dateB) return 0;

        return dateB.getTime() - dateA.getTime();
      });

    container.replaceChildren();

    if (!visible.length) {
      const empty = document.createElement("p");
      empty.className = "state";
      empty.textContent =
        "В этой категории пока нет эпизодов.";

      container.appendChild(empty);
      return;
    }

    visible.forEach(item => {
      container.appendChild(createCard(item));
    });
  }

  // Проверка JSON.
  function validateEpisodes(data) {
    if (!data || !Array.isArray(data.episodes)) {
      throw new Error(
        "В JSON отсутствует массив episodes."
      );
    }

    const valid = [];

    data.episodes.forEach((item, index) => {
      const isValid =
        item &&
        typeof item.title === "string" &&
        item.title.trim().length > 0 &&
        item.date !== undefined &&
        item.date !== null &&
        ["open", "closed"].includes(item.status) &&
        (
          item.url === undefined ||
          item.url === null ||
          typeof item.url === "string"
        );

      if (isValid) {
        valid.push(item);
      } else {
        console.warn(
          `Эпизод №${index + 1} пропущен: некорректные данные.`,
          item
        );
      }
    });

    return valid;
  }

  // Отображение ошибки.
  function showError(message) {
    container.replaceChildren();

    const error = document.createElement("p");
    error.className = "state state--error";
    error.textContent = message;

    container.appendChild(error);
  }

  // Загрузка JSON.
  async function loadEpisodes() {
    if (isLoading) return;

    isLoading = true;

    try {
      const response = await fetch(
        `${DATA_URL}?_=${Date.now()}`,
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const loadedEpisodes = validateEpisodes(data);

      episodes = loadedEpisodes;

      updateStats(episodes);
      render();

      const updatedElement =
        document.getElementById("updated-at");

      if (updatedElement) {
        updatedElement.textContent = data.updatedAt
          ? `ОБНОВЛЕНО: ${data.updatedAt}`
          : "ДАННЫЕ ИЗ JSON";
      }

      console.info(
        `Timeline: загружено ${episodes.length} эпизодов.`
      );

      isFirstLoad = false;

    } catch (error) {
      console.error("Timeline loading error:", error);

      if (isFirstLoad) {
        showError(
          "Не удалось загрузить episodes.json. Проверьте публикацию файла и корректность JSON."
        );
      }

    } finally {
      isLoading = false;
    }
  }

  // Фильтры.
  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;

      filterButtons.forEach(item => {
        const selected = item === button;

        item.classList.toggle("is-active", selected);

        item.setAttribute(
          "aria-pressed",
          String(selected)
        );
      });

      render();
    });
  });

  // Первоначальная загрузка.
  loadEpisodes();

  // Автоматическое обновление каждые 30 секунд.
  window.setInterval(loadEpisodes, REFRESH_INTERVAL);

})();
