const items = document.querySelectorAll('.item');
const currentPage = window.location.pathname.split("/").pop();

items.forEach(link => {
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) {
        link.classList.add("active");
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const btnLogout = document.getElementById("logout");
    const token = localStorage.getItem("token");

    if (!token) {
        btnLogout.style.display = "none";
    }

    btnLogout.addEventListener("click", function () {
        localStorage.removeItem("token");
        btnLogout.style.display = "none";
    });
});