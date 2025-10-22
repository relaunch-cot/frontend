const items = document.querySelectorAll('.item');
const currentPage = window.location.pathname.split("/").pop();

items.forEach(link => {const linkPage = link.getAttribute("href");

if (linkPage === currentPage) {
      link.classList.add("active");
    }
});

console.log("Página atual:", currentPage);