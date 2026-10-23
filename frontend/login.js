// Вход: POST /login, сохраняем JWT в localStorage.

const login_text = document.getElementById("login_text");
const password_text = document.getElementById("password_text");
const login_btn = document.getElementById("login_btn");
const messageEl = document.getElementById("message");

login_btn.onclick = async () => {
    messageEl.className = "message";

    const login = login_text.value.trim();
    const password = password_text.value;

    if (login === "" || password === "") {
        messageEl.className = "message error";
        messageEl.textContent = "Заполните логин и пароль";
        return;
    }

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
            messageEl.className = "message error";
            messageEl.textContent = formatApiDetail(response, data);
        }
    } catch {
        messageEl.className = "message error";
        messageEl.textContent = "Не удалось связаться с сервером";
    }
};

password_text.addEventListener("keydown", (event) => {
    if (event.key === "Enter") login_btn.onclick();
});
