const jwt_token = localStorage.getItem("jwt");
if (jwt_token === null) {
    window.location.href = "login.html";
}
else {
    const response = fetch(
        "http://localhost:8443/valid_jwt", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(
                {
                    "token": jwt_token
                }
            )
        }
    ).then((value) => {
        value.json().then((value) => {
            if (!value) {
                window.location.href = "login.html";
            }
        });
    });
}



const polka_btn = document.getElementById("polka_btn");
const shkaf_btn = document.getElementById("shkaf_btn");
const backend_btn = document.getElementById("backend_btn");
const backend_p = document.getElementById("backend_p");

const buttons = [polka_btn, shkaf_btn];
const colors = ["red", "blue", "green"];

for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    let color_index = 0;
    function switch_color_index() {
        color_index++;
        if (color_index >= colors.length) {
            color_index = 0;
        }
    }
    button.onclick = () => {
        button.setAttribute("style", `background-color: ${colors[color_index]};`);
        switch_color_index();
    };
}

backend_btn.onclick = async () => {
    const response = await fetch(
        "http://localhost:8443/anything", {
            method: "GET",
            headers: {
                "Authentication": `Bearer ${jwt_token}`
            }
        }
    )
    console.log(await response.json());
}
