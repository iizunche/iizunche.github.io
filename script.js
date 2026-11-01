(() => {
  "use strict";

  const DATA_URL = "./episodes.json";
  const REFRESH_INTERVAL = 30_000;

  const container = document.getElementById("episodes");
  const filterButtons = [...document.querySelectorAll("[data-filter]")];

  let episodes = [];
  let activeFilter = "all";
  let isFirstLoad = true;

  const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  // Поддержка разных форматов дат.
  function parseDate(value) {
    if (!value) return null;

    const input = String(value).trim();

    let year, month, day;
    let match;

    // YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYY-MM
    match = input.match(
      /^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?$/
    );

    if (match) {
      year = Number(match[1]);
      month = Number(match[2]);
      day = match[3] === undefined ? 1 : Number(match[3]);
    } else {
      // DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY
      match = input.match(
        /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/
      );

      if (!match) return null;

      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);
    }

    // Если день равен 00, используем первое число месяца.
    if (day === 0) day = 1;

    if (
      year < 1 ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    const date = new Date(year, month - 1, day);

    // Проверка существования календарной даты.
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  // Форматирование даты для карточки.
  function formatDate(value) {
    const date = parseDate(value);

    return date ? dateFormatter.format(date) : String(value);
  }

  // Обновление статистики.
  function updateStats(items) {
    const open = items.filter(item => item.status === "open").length;
    const closed = items.filter(item => item.status === "closed").length;

    document.getElementById("total-count").textContent = items.length;
    document.getElementById("all-count").textContent = items.length;
    document.getElementById("open-count").textContent = open;
    document.getElementById("closed-count").textContent = closed;
  }

  // Создание карточки эпизода.
  function createCard(item) {
    const card = document.createElement(item.url ? "a" : "article");

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
    status.textContent = item.status === "open" ? "Открыт" : "Закрыт";

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

  // Отображение карточек.
  function render() {
    const visible = episodes
      .filter(item =>
        activeFilter === "all" || item.status === activeFilter
      )
      .slice()
      .sort((a, b) => {
        // Сначала открытые, затем закрытые.
        const statusOrder =
          (a.status === "open" ? 0 : 1) -
          (b.status === "open" ? 0 : 1);

        if (statusOrder !== 0) return statusOrder;

        // Внутри категорий — от новых к старым.
        return parseDate(b.date) - parseDate(a.date);
      });

    container.replaceChildren();

    if (!visible.length) {
      const empty = document.createElement("p");
      empty.className = "state";
      empty.textContent = "В этой категории пока нет эпизодов.";

      container.appendChild(empty);
      return;
    }

    visible.forEach(item => {
      container.appendChild(createCard(item));
    });
  }

  // Проверка и загрузка данных из JSON.
  function validateEpisodes(data) {
    if (!data || !Array.isArray(data.episodes)) {
      throw new Error("В JSON отсутствует массив episodes.");
    }

    const invalid = [];
    const valid = [];

    data.episodes.forEach((item, index) => {
      const isValid =
        item &&
        typeof item.title === "string" &&
        item.title.trim() &&
        typeof item.date === "string" &&
        parseDate(item.date) &&
        ["open", "closed"].includes(item.status) &&
        (item.url === undefined || typeof item.url === "string");

      if (isValid) {
        valid.push(item);
      } else {
        invalid.push({ index, item });
      }
    });

    if (invalid.length) {
      console.warn("Некорректные эпизоды:", invalid);
    }

    return valid;
  }

  // Отображение ошибки загрузки.
  function showError() {
    container.replaceChildren();

    const error = document.createElement("p");
    error.className = "state state--error";

    error.textContent =
      "Не удалось загрузить episodes.json. Проверьте публикацию файла и корректность JSON.";

    container.appendChild(error);
  }

  // Загрузка JSON с обходом кеша.
  async function loadEpisodes() {
    try {
      const response = await fetch(
        `${DATA_URL}?_=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache"
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      episodes = validateEpisodes(data);

      updateStats(episodes);
      render();

      document.getElementById("updated-at").textContent =
        data.updatedAt
          ? `ОБНОВЛЕНО: ${data.updatedAt}`
          : "ДАННЫЕ ИЗ JSON";

      isFirstLoad = false;

    } catch (error) {
      console.error("Timeline loading error:", error);

      if (isFirstLoad) {
        showError();
      }
    }
  }

  // Обработка фильтров.
  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;

      filterButtons.forEach(item => {
        const selected = item === button;

        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });

      render();
    });
  });

  // Первоначальная загрузка.
  loadEpisodes();

  // Автоматическое обновление каждые 30 секунд.
  window.setInterval(loadEpisodes, REFRESH_INTERVAL);

})();
