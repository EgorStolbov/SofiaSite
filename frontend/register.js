// Регистрация нового пользователя: PUT /user на backend.

const login_text = document.getElementById("login_text");
const password_text = document.getElementById("password_text");
const password_repeat = document.getElementById("password_repeat");
const register_btn = document.getElementById("register_btn");
const messageEl = document.getElementById("message");

register_btn.onclick = async () => {
    messageEl.className = "message";

    const login = login_text.value.trim();
    const password = password_text.value;

    // Проверки на клиенте — чтобы не гонять заведомо плохие данные на сервер
    if (login === "" || password === "") {
        messageEl.className = "message error";
        messageEl.textContent = "Заполните логин и пароль";
        return;
    }
    if (password !== password_repeat.value) {
        messageEl.className = "message error";
        messageEl.textContent = "Пароли не совпадают";
        return;
    }
    if (login.length < 3 || login.length > 32) {
        messageEl.className = "message error";
        messageEl.textContent = "Логин должен содержать от 3 до 32 символов";
        return;
    }
    if (password.length < 6 || password.length > 64) {
        messageEl.className = "message error";
        messageEl.textContent = "Пароль должен содержать от 6 до 64 символов";
        return;
    }

    try {
        const response = await fetch(`${API_URL}/user`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login, password }),
        });
        const result = await response.json();
        if (response.ok && result.status === "Success") {
            // После успешной регистрации сразу входим
            await loginAfterRegister(login, password);
        } else {
            messageEl.className = "message error";
            messageEl.textContent = formatApiDetail(response, result);
        }
    } catch {
        messageEl.className = "message error";
        messageEl.textContent = "Не удалось связаться с сервером";
    }
};

async function loginAfterRegister(login, password) {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login, password }),
        });
        const data = await response.json();
        if (data.token) {
            localStorage.setItem("jwt", data.token);
            localStorage.setItem("login", login);
            window.location.href = "index.html";
        } else {
            window.location.href = "login.html";
        }
    } catch {
        // Регистрация удалась, но автологин нет — отправляем на страницу входа
        window.location.href = "login.html";
    }
}
