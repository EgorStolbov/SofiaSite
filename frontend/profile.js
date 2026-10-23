// Профиль: данные пользователя, смена пароля, история заказов из БД, выход и удаление аккаунта.

const contentEl = document.getElementById("content");

async function init() {
    const token = await ensureValidToken();
    if (token === null) return;

    const login = localStorage.getItem("login") || "пользователь";

    contentEl.innerHTML = `
        <h1>Профиль</h1>
        <div class="profile-grid">
            <div class="panel">
                <h2>Аккаунт</h2>
                <p><strong>Логин:</strong> ${login}</p>
                <button id="logout_btn" class="btn ghost">Выйти</button>
            </div>
            <div class="panel">
                <h2>Смена пароля</h2>
                <form id="password_form">
                    <input id="old_password" type="password" placeholder="Текущий пароль..." required>
                    <input id="new_password" type="password" placeholder="Новый пароль..." required>
                    <button class="btn" type="submit">Сохранить</button>
                    <div id="password_message" class="message"></div>
                </form>
            </div>
            <div class="panel">
                <h2>Мои заказы</h2>
                <div id="orders_list"><p>Загружаем заказы...</p></div>
            </div>
            <div class="panel">
                <h2>Опасная зона</h2>
                <p>Удаление аккаунта необратимо. Все ваши заказы будут потеряны.</p>
                <button id="delete_btn" class="btn danger">Удалить аккаунт</button>
                <div id="delete_message" class="message"></div>
            </div>
        </div>
    `;

    renderHeader("profile");
    renderFooter();
    await renderOrders();

    document.getElementById("logout_btn").onclick = logout;

    document.getElementById("password_form").onsubmit = async (event) => {
        event.preventDefault();
        await changePassword(login);
    };

    document.getElementById("delete_btn").onclick = async () => {
        const confirmed = window.confirm("Вы уверены, что хотите удалить аккаунт?");
        if (confirmed) {
            await deleteAccount(login);
        }
    };
}

async function renderOrders() {
    const listEl = document.getElementById("orders_list");
    try {
        const response = await apiFetch("/orders");
        if (response.status === 401) {
            logout();
            return false;
        }
        const orders = await response.json();
        if (!response.ok) {
            throw new Error(orders.detail || "Не удалось загрузить заказы");
        }

        if (orders.length === 0) {
            listEl.innerHTML = "<p>Заказов пока нет. Загляните в <a href='index.html'>каталог</a>!</p>";
            return true;
        }

        listEl.innerHTML = orders.reduce((html, order) => {
            const names = order.items.map((item) => `${item.title} × ${item.qty}`).join(", ");
            return html + `
                <div class="order-item">
                    <span>${order.created_at}</span>
                    <span style="flex:1;">№${order.id}: ${names}</span>
                    <strong>${formatPrice(order.total)}</strong>
                </div>
            `;
        }, "");
        return true;
    } catch (error) {
        listEl.innerHTML = `<p class="message error" style="display:block;">Не удалось загрузить заказы</p>`;
        return false;
    }
}

async function changePassword(login) {
    const messageEl = document.getElementById("password_message");
    messageEl.className = "message";

    const newPassword = document.getElementById("new_password").value;
    if (newPassword.length < 6) {
        messageEl.className = "message error";
        messageEl.textContent = "Пароль должен быть не короче 6 символов";
        return;
    }

    try {
        const response = await apiFetch("/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                login,
                password: document.getElementById("old_password").value,
                new_password: newPassword,
            }),
        });
        const data = await response.json();
        if (response.ok) {
            messageEl.className = "message success";
            messageEl.textContent = "Пароль успешно изменен";
        } else {
            messageEl.className = "message error";
            messageEl.textContent = response.status === 401
                ? "Текущий пароль неправильный"
                : formatApiDetail(response, data);
        }
    } catch {
        messageEl.className = "message error";
        messageEl.textContent = "Не удалось связаться с сервером";
    }
}

async function deleteAccount(login) {
    const messageEl = document.getElementById("delete_message");
    messageEl.className = "message";

    const password = window.prompt("Введите пароль для подтверждения:");
    if (password === null) return;

    try {
        const response = await fetch(`${API_URL}/user`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login, password }),
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.removeItem("jwt");
            localStorage.removeItem("login");
            window.location.href = "login.html";
        } else {
            messageEl.className = "message error";
            messageEl.textContent = data.detail || "Не удалось удалить аккаунт";
        }
    } catch {
        messageEl.className = "message error";
        messageEl.textContent = "Не удалось связаться с сервером";
    }
}

init();
