// Общие вспомогательные функции: корзина, цены, шапка сайта, проверка JWT.

// Если сайт открыт с самого бэкенда (порт 8443) — API тот же источник,
// иначе (например, python -m http.server) — абсолютный адрес.
const API_URL = window.location.port === "8443" ? "" : "http://localhost:8443";
const accessToken = () => localStorage.getItem("jwt");

/* ---------- Запросы с JWT ---------- */

async function apiFetch(path, options = {}) {
    const token = accessToken();
    const headers = { ...(options.headers || {}) };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return fetch(`${API_URL}${path}`, { ...options, headers });
}

/* ---------- Корзина (localStorage) ---------- */

function getCart() {
    try {
        return JSON.parse(localStorage.getItem("cart")) || [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartBadge();
}

function cartCount() {
    return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function cartTotal(cart = getCart()) {
    return cart.reduce((sum, item) => {
        const product = productById(item.id);
        return product ? sum + product.price * item.qty : sum;
    }, 0);
}

function addToCart(productId, qty = 1) {
    const cart = getCart();
    const item = cart.find((i) => i.id === productId);
    if (item) {
        item.qty += qty;
    } else {
        cart.push({ id: productId, qty });
    }
    saveCart(cart);
}

function setProductQty(productId, qty) {
    let cart = getCart();
    const item = cart.find((i) => i.id === productId);
    if (item) {
        item.qty = qty;
        if (item.qty <= 0) {
            cart = cart.filter((i) => i.id !== productId);
        }
        saveCart(cart);
    }
}

function removeFromCart(productId) {
    saveCart(getCart().filter((i) => i.id !== productId));
}

function clearCart() {
    saveCart([]);
}

/* ---------- Счетчик в шапке ---------- */

function updateCartBadge() {
    const badge = document.querySelector(".cart-badge");
    if (!badge) return;
    const count = cartCount();
    badge.textContent = count;
    badge.hidden = count === 0;
}

/* ---------- Шапка сайта ---------- */

function renderHeader(activePage, { showProfile = true } = {}) {
    const login = localStorage.getItem("login");
    const profileLink = showProfile && login ? `<a href="profile.html" class="${activePage === "profile" ? "active" : ""}">${login}</a>` : "";

    document.getElementById("header").innerHTML = `
        <div class="inner">
            <a class="logo" href="index.html">Мебель<span>София</span></a>
            <nav class="main-nav">
                <a href="index.html" class="${activePage === "catalog" ? "active" : ""}">Каталог</a>
                <a href="cart.html" class="cart-link ${activePage === "cart" ? "active" : ""}">Корзина<span class="cart-badge" hidden></span></a>
                ${profileLink}
            </nav>
        </div>
    `;
    updateCartBadge();
}

function renderFooter() {
    document.getElementById("footer").innerHTML = `
        <p>МебельСофия — классическая мебель для дома. © 2026</p>
    `;
}

/* ---------- Форматирование ---------- */

const priceFormatter = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
});

function formatPrice(value) {
    return priceFormatter.format(value);
}

/* ---------- Уведомления (вместо alert) ---------- */

let toastTimer = null;
function showToast(text) {
    const toast = document.getElementById("toast");
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

/* ---------- Сообщения об ошибках от API ---------- */

function formatValidationError(error, fieldLabel) {
    // Переводим типичные ошибки схемы Pydantic на русский
    switch (error.type) {
        case "string_too_short":
            return `${fieldLabel}: минимум ${error.ctx?.min_length} символов`;
        case "string_too_long":
            return `${fieldLabel}: максимум ${error.ctx?.max_length} символов`;
        case "missing":
            return `${fieldLabel} не заполнен`;
        case "greater_than_equal":
        case "less_than_equal":
            return `${fieldLabel}: недопустимое значение (${error.ctx})`;
        default:
            return `${fieldLabel}: ${error.msg}`;
    }
}

function formatApiDetail(response, data) {
    // FastAPI отдаёт ошибки валидации как detail: [{...}, {...}],
    // обычные ошибки как detail: "строка". Приводим всё к тексту.
    if (!data || !data.detail) {
        return response.status === 401 ? "Неверный логин или пароль" : `Ошибка ${response.status}`;
    }
    if (Array.isArray(data.detail)) {
        const fieldLabel = (loc) => {
            const names = { login: "логин", password: "пароль", new_password: "новый пароль", items: "товары" };
            return names[loc[loc.length - 1]] || loc[loc.length - 1];
        };
        return data.detail
            .map((error) => formatValidationError(error, fieldLabel(error.loc)))
            .join(". ");
    }
    // Человеческие формулировки типовых случаев
    const messages = {
        "User already exists": "Такой логин уже занят",
        "Wrong login or password": "Неверный логин или пароль",
    };
    return messages[data.detail] || data.detail;
}

/* ---------- Проверка JWT с backend ---------- */

async function ensureValidToken() {
    const token = localStorage.getItem("jwt");
    if (token === null) {
        window.location.href = "login.html";
        return null;
    }
    try {
        const response = await fetch(`${API_URL}/valid_jwt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        });
        const valid = await response.json();
        if (!valid) {
            window.location.href = "login.html";
            return null;
        }
        return token;
    } catch {
        // backend недоступен — оставляем пользователя на странице
        return token;
    }
}

function logout() {
    localStorage.removeItem("jwt");
    localStorage.removeItem("login");
    window.location.href = "login.html";
}
