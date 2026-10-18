const login_text = document.getElementById("login_text");
const password_text = document.getElementById("password_text");
const login_btn = document.getElementById("login_btn");


login_btn.onclick = async () => {
    const login = login_text.value;
    const password = password_text.value;

    const response = await fetch(
        "http://localhost:8443/login",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(
                {
                    login,
                    password
                }
            )
        }
    );
    const data = await response.json();
    const token = data["token"];
    localStorage.setItem("jwt", token);
    window.location.href = "index.html";
}
