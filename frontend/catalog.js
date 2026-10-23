// Страница каталога: загрузка товаров из БД, фильтры по категориям, поиск и сортировка.

const chipsEl = document.getElementById("chips");
const productsEl = document.getElementById("products");
const emptyEl = document.getElementById("empty");
const searchEl = document.getElementById("search");
const sortEl = document.getElementById("sort");

let activeCategory = "all";
let allProducts = [];

renderHeader("catalog");
renderFooter();
renderChips();
init();

searchEl.addEventListener("input", () => renderCatalog());
sortEl.addEventListener("change", renderCatalog);

async function init() {
    showLoading();
    try {
        await ensureValidToken();
        allProducts = await loadProducts();
        renderCatalog();
    } catch {
        showError();
    }
}

function showLoading() {
    productsEl.innerHTML = "";
    emptyEl.hidden = true;
    productsEl.innerHTML = `<div class="empty"><div class="big">⏳</div><p>Загружаем товары...</p></div>`;
}

function showError() {
    productsEl.innerHTML = `
        <div class="empty">
            <div class="big">⚠️</div>
            <p>Не удалось загрузить товары. Проверьте, запущен ли backend.</p>
            <button class="btn" onclick="init()">Повторить</button>
        </div>
    `;
}

function renderChips() {
    chipsEl.innerHTML = "";

    const all = document.createElement("button");
    all.className = "chip active";
    all.textContent = "Все";
    all.onclick = () => selectCategory("all");
    chipsEl.appendChild(all);

    for (const category of CATEGORIES) {
        const chip = document.createElement("button");
        chip.className = "chip";
        chip.textContent = `${category.emoji} ${category.title}`;
        chip.dataset.id = category.id;
        chip.onclick = () => selectCategory(category.id);
        chipsEl.appendChild(chip);
    }
}

function selectCategory(id) {
    activeCategory = id;
    for (const chip of chipsEl.querySelectorAll(".chip")) {
        chip.classList.toggle("active", chip.dataset.id === activeCategory || (activeCategory === "all" && chip.textContent === "Все"));
    }
    renderCatalog();
}

function renderCatalog() {
    if (allProducts.length === 0) {
        productsEl.innerHTML = "";
        emptyEl.hidden = false;
        return;
    }

    const query = searchEl.value.trim().toLowerCase();

    let list = allProducts.filter((p) => {
        const matchCategory = activeCategory === "all" || p.category === activeCategory;
        const matchQuery = p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
        return matchCategory && matchQuery;
    });

    const sorters = {
        "popular": (a, b) => b.rating - a.rating,
        "price-asc": (a, b) => a.price - b.price,
        "price-desc": (a, b) => b.price - a.price,
        "rating": (a, b) => b.rating - a.rating,
    };
    list.sort(sorters[sortEl.value] || sorters["popular"]);

    productsEl.innerHTML = "";
    emptyEl.hidden = list.length > 0;

    for (const product of list) {
        productsEl.appendChild(createCard(product));
    }
}

function createCard(product) {
    const category = categoryById(product.category);

    const card = document.createElement("article");
    card.className = "card";
    card.onclick = () => window.location.href = `product.html?id=${product.id}`;

    card.innerHTML = `
        <div class="photo"><img src="${product.image}" alt="${product.title}" loading="lazy"></div>
        <div class="body">
            <div class="card_title">${product.title}</div>
            <div class="meta">${category ? category.title : ""} · ★ ${product.rating}</div>
            <div class="price">${formatPrice(product.price)}</div>
            <button class="to-cart">Добавить в корзину</button>
        </div>
    `;

    card.querySelector(".to-cart").onclick = (event) => {
        event.stopPropagation();
        addToCart(product.id);
        showToast(`«${product.title}» в корзине 🛒`);
    };

    return card;
}
