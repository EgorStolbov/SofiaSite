// Карточка товара: получаем id из URL, товар загружаем из БД.

const contentEl = document.getElementById("content");

renderHeader("catalog");
renderFooter();
init();

async function init() {
    try {
        await ensureValidToken();
    } catch {
        return; // редирект на login уже выполнен
    }

    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));

    if (!id) {
        renderNotFound();
        return;
    }

    let product;
    try {
        product = await loadProduct(id);
    } catch {
        renderLoadError();
        return;
    }

    if (!product) {
        renderNotFound();
        return;
    }

    renderProduct(product);
}

function renderProduct(product) {
    const category = categoryById(product.category);
    contentEl.innerHTML = `
        <a class="back-link" href="index.html">← Назад в каталог</a>
        <div class="product-page">
            <div class="photo"><img src="${product.image}" alt="${product.title}"></div>
            <div>
                <div class="category">${category ? category.title : ""}</div>
                <h1>${product.title}</h1>
                <div class="price">${formatPrice(product.price)}</div>
                <p class="description">${product.description}</p>
                <dl class="specs">
                    <dt>Материал</dt><dd>${product.material}</dd>
                    <dt>Цвет</dt><dd>${product.color}</dd>
                    <dt>Габариты</dt><dd>${product.dimensions}</dd>
                    <dt>Рейтинг</dt><dd>★ ${product.rating}</dd>
                </dl>
                <button id="buy_btn" class="btn" style="margin-top: 22px;">Добавить в корзину</button>
            </div>
        </div>
    `;
    document.title = `МебельСофия — ${product.title}`;

    document.getElementById("buy_btn").onclick = () => {
        addToCart(product.id);
        showToast(`«${product.title}» в корзине 🛒`);
    };
}

function renderNotFound() {
    contentEl.innerHTML = `
        <div class="empty">
            <div class="big">🪑</div>
            <h2>Товар не найден</h2>
            <p>Возможно, он был перемещен или распродан.</p>
            <a class="btn" href="index.html">В каталог</a>
        </div>
    `;
}

function renderLoadError() {
    contentEl.innerHTML = `
        <div class="empty">
            <div class="big">⚠️</div>
            <p>Не удалось загрузить товар. Проверьте, запущен ли backend.</p>
            <button class="btn" onclick="init()">Повторить</button>
        </div>
    `;
}
