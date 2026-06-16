const user = JSON.parse(localStorage.getItem("user"));

const usernameEl = document.querySelector("#user_name");
const lentCount = document.querySelector("#lent-count");
const borrowedCount = document.querySelector("#borrowed-count");

const borrowedBooksContainer = document.querySelector("#borrowed-books-container");
const myBooksContainer = document.querySelector("#my-books-container");
const lentBooksContainer = document.querySelector("#lent-books-container");

const logoutBtn = document.querySelector(".log-out");

if (!user) window.location.href = "login.html";

usernameEl.textContent = user.username;

async function loadProfile() {
    try {
        const res = await fetch("http://127.0.0.1:8000/books");
        const books = await res.json();

        const myFlat = user.flat_no;
        const myBooks = books.filter(b => String(b.owner_flat) === String(myFlat));

        const borrowedRes = await fetch(`http://127.0.0.1:8000/books/borrowed/${myFlat}`);
        const borrowedBooks = await borrowedRes.json();

        const lentBooks = myBooks.filter(book => book.status === "borrowed");

        lentCount.textContent = lentBooks.length;
        borrowedCount.textContent = borrowedBooks.length;

        renderMyBooks(myBooksContainer, myBooks);
        renderLentBooks(lentBooksContainer, lentBooks);
        renderBorrowedBooks(borrowedBooksContainer, borrowedBooks);

        attachCardEvents();

    } catch (err) {
        console.error("Profile load error:", err);
    }
}

function coverHTML(book) {
    if (book.cover_url) {
        return `<img src="${book.cover_url}" class="book-cover" alt="${book.title}">`;
    }
    return `<div class="book-cover-placeholder">📚</div>`;
}

function renderMyBooks(container, books) {
    if (!books.length) {
        container.innerHTML = "<p>No books found</p>";
        return;
    }

    container.innerHTML = books.map(book => {
        const isBorrowed = book.status === "borrowed";
        return `
        <div class="book-card ${isBorrowed ? "is-borrowed" : ""}">
            ${coverHTML(book)}
            <span class="status-stamp ${isBorrowed ? "borrowed" : ""}">
                ${isBorrowed ? "Lent Out" : "Available"}
            </span>
            <h4>${book.title}</h4>
            <p>${book.author}</p>
            ${book.borrower_flat ? `<p>Borrowed by: Flat ${book.borrower_flat}</p>` : ""}
            ${
                isBorrowed
                ? `<button class="action-btn" data-action="return" data-isbn="${book.isbn}">Mark Returned</button>`
                : `<button class="action-btn" data-action="lend" data-isbn="${book.isbn}">Mark as Lent</button>`
            }
            <button class="action-btn btn-delete" data-action="delete" data-isbn="${book.isbn}" data-title="${book.title.replace(/"/g, '&quot;')}">
                Remove Book
            </button>
        </div>
        `;
    }).join("");
}

function renderLentBooks(container, books) {
    if (!books.length) {
        container.innerHTML = "<p>No books currently lent out</p>";
        return;
    }

    container.innerHTML = books.map(book => `
        <div class="book-card is-borrowed">
            ${coverHTML(book)}
            <span class="status-stamp borrowed">Lent Out</span>
            <h4>${book.title}</h4>
            <p>${book.author}</p>
            ${book.borrower_flat ? `<p>Borrowed by: Flat ${book.borrower_flat}</p>` : ""}
            <button class="action-btn" data-action="return" data-isbn="${book.isbn}">Mark Returned</button>
        </div>
    `).join("");
}

function renderBorrowedBooks(container, books) {
    if (!books.length) {
        container.innerHTML = "<p>No books currently borrowed</p>";
        return;
    }

    container.innerHTML = books.map(book => `
        <div class="book-card is-borrowed">
            ${coverHTML(book)}
            <span class="status-stamp borrowed">Borrowed</span>
            <h4>${book.title}</h4>
            <p>${book.author}</p>
            ${book.owner_flat ? `<p>Owner: Flat ${book.owner_flat}</p>` : ""}
        </div>
    `).join("");
}

function attachCardEvents() {
    document.querySelectorAll(".book-cover").forEach(img => {
        img.addEventListener("error", () => {
            const placeholder = document.createElement("div");
            placeholder.className = "book-cover-placeholder";
            placeholder.textContent = "📚";
            img.replaceWith(placeholder);
        });
    });

    document.querySelectorAll(".action-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const action = btn.dataset.action;
            const isbn = btn.dataset.isbn;
            const title = btn.dataset.title;

            if (action === "return") markAvailable(isbn);
            if (action === "lend") markBorrowed(isbn);
            if (action === "delete") deleteBook(isbn, title);
        });
    });
}

async function markAvailable(isbn) {
    await fetch("http://127.0.0.1:8000/books/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            isbn,
            status: "available",
            borrower_flat: null,
            owner_flat: user.flat_no
        })
    });
    location.reload();
}

async function markBorrowed(isbn) {
    const borrowerFlat = prompt("Enter borrower's flat number:");
    if (!borrowerFlat) return;

    await fetch("http://127.0.0.1:8000/books/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            isbn,
            status: "borrowed",
            borrower_flat: borrowerFlat,
            owner_flat: user.flat_no
        })
    });
    location.reload();
}

async function deleteBook(isbn, title) {
    const confirmed = confirm(`Remove "${title}" from Shelve? This cannot be undone.`);
    if (!confirmed) return;

    try {
        const url = isbn
            ? `http://127.0.0.1:8000/books/${encodeURIComponent(isbn)}?owner_flat=${encodeURIComponent(user.flat_no)}`
            : `http://127.0.0.1:8000/books/by-title/${encodeURIComponent(title)}?owner_flat=${encodeURIComponent(user.flat_no)}`;

        const res = await fetch(url, { method: "DELETE" });

        if (res.ok) {
            location.reload();
        } else {
            const data = await res.json();
            alert(data.detail || "Could not remove book");
        }
    } catch (err) {
        console.error(err);
        alert("Server error");
    }
}

logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "login.html";
});

loadProfile();