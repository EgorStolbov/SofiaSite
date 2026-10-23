// Страница корзины: список позиций, изменение количества и оформление заказа.
// Заказ отправляется в БД через POST /orders (требует JWT).

const contentEl = document.getElementById("content");

renderHeader("cart");
renderFooter();
init();

async function init() {
    try {
        await ensureValidToken();
    } catch {
        return;
    }

    try {
        await loadProducts(); // цены товаров из БД
    } catch {
        contentEl.innerHTML = `
            <h1>Корзина</h1>
            <div class="empty">
                <div class="big">⚠️</div>
                <p>Не удалось загрузить товары. Проверьте, запущен ли backend.</p>
                <button class="btn" onclick="init()">Повторить</button>
            </div>
        `;
        return;
    }

    renderCart();
}

function renderCart() {
    const cart = getCart();
    contentEl.innerHTML = "<h1>Корзина</h1>";

    if (cart.length === 0) {
        contentEl.innerHTML += `
            <div class="empty">
                <div class="big">🛒</div>
                <p>В корзине пока пусто.</p>
                <a class="btn" href="index.html">Выбрать мебель</a>
            </div>
        `;
        return;
    }

    const rows = cart.map((item) => {
        const product = productById(item.id);
        if (!product) return "";
        return `
            <div class="cart-row" data-id="${product.id}">
                <div class="thumb"><img src="${product.image}" alt="${product.title}"></div>
                <div>
                    <div class="name"><a href="product.html?id=${product.id}">${product.title}</a></div>
                    <div class="unit">${formatPrice(product.price)} за шт.</div>
                </div>
                <div class="quantity">
                    <button data-action="minus">−</button>
                    <span class="qty">${item.qty}</span>
                    <button data-action="plus">+</button>
                </div>
                <div class="row-total">${formatPrice(product.price * item.qty)}</div>
                <button class="remove" data-action="remove">Удалить</button>
            </div>
        `;
    }).join("");

    contentEl.innerHTML += `
        <div class="cart-list">${rows}</div>
        <div class="summary">
            <div class="line"><span>Товаров</span><span>${cartCount()} шт.</span></div>
            <div class="line"><span>Доставка</span><span>бесплатно</span></div>
            <div class="total"><span>Итого</span><span>${formatPrice(cartTotal(cart))}</span></div>
            <button id="checkout_btn" class="btn wide">Оформить заказ</button>
            <div id="checkout_message" class="message"></div>
        </div>
    `;

    bindRowActions();
    document.getElementById("checkout_btn").onclick = checkout;
}

function bindRowActions() {
    for (const row of contentEl.querySelectorAll(".cart-row")) {
        const id = Number(row.dataset.id);

        row.querySelector('[data-action="minus"]').onclick = () => {
            const qty = getCart().find((i) => i.id === id)?.qty ?? 0;
            setProductQty(id, qty - 1);
            renderCart();
        };

        row.querySelector('[data-action="plus"]').onclick = () => {
            const qty = getCart().find((i) => i.id === id)?.qty ?? 0;
            setProductQty(id, qty + 1);
            renderCart();
        };

        row.querySelector('[data-action="remove"]').onclick = () => {
            removeFromCart(id);
            renderCart();
            showToast("Товар удален из корзины");
        };
    }
}

async function checkout() {
    const messageEl = document.getElementById("checkout_message");
    messageEl.className = "message";
    messageEl.textContent = "Оформляем заказ...";

    const items = getCart().map((item) => ({ id: item.id, qty: item.qty }));

    try {
        const response = await apiFetch("/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || "Не удалось оформить заказ");
        }

        clearCart();
        renderCart();
        showToast(`Заказ №${data.id} на сумму ${formatPrice(data.total)} оформлен! 💬`);
    } catch (error) {
        messageEl.className = "message error";
        messageEl.textContent =
            error.message === "Failed to fetch"
                ? "Не удалось связаться с сервером"
                : error.message;
    }
}
