// Категории пока статичны на фронте; товары приходят из базы данных backend (GET /products).
const CATEGORIES = [
    { id: "living", title: "Гостиная", emoji: "🛋" },
    { id: "bedroom", title: "Спальня", emoji: "🛏" },
    { id: "kitchen", title: "Кухня", emoji: "🍽" },
    { id: "office", title: "Кабинет", emoji: "💼" },
    { id: "hallway", title: "Прихожая", emoji: "🚪" },
];

// ---------- Загрузка товаров из БД ----------

let _products = null;
let _lastError = null;

async function loadProducts() {
    if (_products !== null) return _products;
    _lastError = null;
    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        _products = await response.json();
    } catch (error) {
        console.error("Не удалось загрузить товары:", error);
        _lastError = error;
        throw error;
    }
    return _products;
}

async function loadProduct(id) {
    try {
        const response = await fetch(`${API_URL}/products/${id}`);
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Не удалось загрузить товар:", error);
        _lastError = error;
        throw error;
    }
}

function categoryById(id) {
    return CATEGORIES.find((c) => c.id === id);
}

// Работает только после loadProducts()/loadProduct()
function productById(id) {
    return (_products || []).find((p) => p.id === Number(id));
}
