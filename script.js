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

  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) return null;

    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );

    if (
      date.getFullYear() !== Number(match[1]) ||
      date.getMonth() !== Number(match[2]) - 1 ||
      date.getDate() !== Number(match[3])
    ) return null;

    return date;
  }

  function updateStats(items) {
    const open = items.filter(item => item.status === "open").length;
    const closed = items.filter(item => item.status === "closed").length;

    document.getElementById("total-count").textContent = items.length;
    document.getElementById("all-count").textContent = items.length;
    document.getElementById("open-count").textContent = open;
    document.getElementById("closed-count").textContent = closed;
  }

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
    date.dateTime = item.date;
    date.textContent = dateFormatter.format(parseDate(item.date));

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

        // Внутри категорий — от новых к старым.
        return statusOrder || b.date.localeCompare(a.date);
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

  function showError() {
    container.replaceChildren();

    const error = document.createElement("p");
    error.className = "state state--error";
    error.textContent =
      "Не удалось загрузить episodes.json. Проверьте публикацию файла и корректность JSON.";

    container.appendChild(error);
  }

  function validateEpisodes(data) {
    if (!data || !Array.isArray(data.episodes)) {
      throw new Error("В JSON отсутствует массив episodes.");
    }

    return data.episodes.filter(item =>
      item &&
      typeof item.title === "string" &&
      item.title.trim() &&
      typeof item.date === "string" &&
      parseDate(item.date) &&
      ["open", "closed"].includes(item.status) &&
      (item.url === undefined || typeof item.url === "string")
    );
  }

  async function loadEpisodes() {
    try {
      // Обход кеша браузера и CDN.
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

      // При первой загрузке показываем ошибку.
      // При последующих — сохраняем уже загруженные карточки.
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
