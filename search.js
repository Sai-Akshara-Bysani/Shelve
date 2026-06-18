const searchInput = document.querySelector("#search-input");
const searchBtn = document.querySelector("#search-btn");
const categorySelect = document.querySelector("#category");
const availabilityFilter = document.querySelector("#availability-filter");
const booksContainer = document.querySelector("#books-container");

async function fetchBooks() {
    const query = searchInput.value.trim();
    const category = categorySelect.value;
    const availability = availabilityFilter.value;

    try {
        booksContainer.innerHTML = "<p>Loading...</p>";

        let url = "";
        if (query) {
            url = `https://shelve-qjkx.onrender.com/books/search?name=${query}`;
        } else if (category) {
            url = `https://shelve-qjkx.onrender.com/books/genre/${category}`;
        } else {
            url = `https://shelve-qjkx.onrender.com/books`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch books");

        let books = await response.json();

        if (availability === "available") books = books.filter(b => b.status === "available");
        if (availability === "borrowed") books = books.filter(b => b.status === "borrowed");

        renderBooks(books);

    } catch (err) {
        console.error(err);
        booksContainer.innerHTML = "<p>Error loading books</p>";
    }
}

function coverHTML(book) {
    if (book.cover_url) {
        return `<img src="${book.cover_url}" class="book-cover" alt="${book.title}">`;
    }
    return `<div class="book-cover-placeholder">📚</div>`;
}

function renderBooks(books) {
    if (!books.length) {
        booksContainer.innerHTML = "<p>No books found</p>";
        return;
    }

    booksContainer.innerHTML = books.map(book => {
        const isBorrowed = book.status === "borrowed";
        return `
        <div class="book-card ${isBorrowed ? "is-borrowed" : ""}">
            ${coverHTML(book)}
            <span class="status-stamp ${isBorrowed ? "borrowed" : ""}">
                ${isBorrowed ? "Borrowed" : "Available"}
            </span>
            <h3>${book.title}</h3>
            <p>${book.author}</p>
            <button
                class="desc-btn"
                data-title="${book.title.replace(/"/g, '&quot;')}"
                data-desc="${(book.description || "No description available").replace(/"/g, '&quot;')}"
            >
                Description
            </button>
            <button
                class="interest-btn ${isBorrowed ? "btn-disabled" : ""}"
                data-owner="${book.owner_flat}"
                data-title="${book.title.replace(/"/g, '&quot;')}"
                ${isBorrowed ? "disabled" : ""}
            >
                ${isBorrowed ? "Unavailable" : "Interested"}
            </button>
        </div>
        `;
    }).join("");

    // Fix broken cover images
    document.querySelectorAll(".book-cover").forEach(img => {
        img.addEventListener("error", () => {
            const placeholder = document.createElement("div");
            placeholder.className = "book-cover-placeholder";
            placeholder.textContent = "📚";
            img.replaceWith(placeholder);
        });
    });

    // Description modal buttons
    document.querySelectorAll(".desc-btn").forEach(btn => {
        btn.addEventListener("click", () => showDesc(btn.dataset.title, btn.dataset.desc));
    });

    // Interested / WhatsApp buttons
    document.querySelectorAll(".interest-btn:not([disabled])").forEach(btn => {
        btn.addEventListener("click", () => contactOwner(btn.dataset.owner, btn.dataset.title));
    });
}

function showDesc(title, desc) {
    const existing = document.querySelector(".desc-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.className = "desc-modal";
    modal.innerHTML = `
        <div class="desc-modal-box">
            <h4>${title}</h4>
            <p>${desc}</p>
            <button id="close-modal">Close</button>
        </div>
    `;

    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
    modal.querySelector("#close-modal").addEventListener("click", () => modal.remove());

    document.body.appendChild(modal);
}

async function contactOwner(ownerFlat, bookTitle) {
    try {
        const res = await fetch(`https://shelve-qjkx.onrender.com/user/${ownerFlat}`);
        const owner = await res.json();
        const message = encodeURIComponent(
            `Hi ${owner.name}, I'm interested in your book "${bookTitle}" on Shelve. Can we discuss?`
        );
        window.open(`https://wa.me/${owner.phone_number}?text=${message}`, "_blank");
    } catch (err) {
        console.error(err);
        alert("Could not contact owner");
    }
}

searchBtn.addEventListener("click", fetchBooks);
searchInput.addEventListener("keypress", (e) => { if (e.key === "Enter") fetchBooks(); });
categorySelect.addEventListener("change", fetchBooks);
availabilityFilter.addEventListener("change", fetchBooks);

fetchBooks();