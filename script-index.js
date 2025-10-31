const btnLogin = document.getElementById("login");
const btnLogout = document.getElementById("logout");

function updateAuthButtons() {
    if (btnLogin && btnLogout) {
        if (localStorage.getItem("token")) {
            btnLogout.style.display = "block";
            btnLogin.style.display = "none";
        } else {
            btnLogout.style.display = "none";
            btnLogin.style.display = "block";
        }
    }
}

document.addEventListener("DOMContentLoaded", updateAuthButtons);

if (btnLogout) {
    btnLogout.addEventListener("click", () => {
        localStorage.removeItem("token");
        updateAuthButtons();
        location.reload();
    });
}

if (btnLogin) {
    btnLogin.addEventListener("click", () => {
        window.location.href = "/login";
    });
}
