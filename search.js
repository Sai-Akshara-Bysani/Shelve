const searchInput = document.querySelector("#search-input");
const searchBtn = document.querySelector("#search-btn");
const categorySelect = document.querySelector("#category");
const availabilityFilter = document.querySelector("#availability-filter");
const booksContainer = document.querySelector("#books-container");

let allBooks = [];

async function fetchBooks() {
    const query = searchInput.value.trim();
    const category = categorySelect.value;
    const availability = availabilityFilter.value;

    try {
        booksContainer.innerHTML = "<p>Loading...</p>";

        let url = "";

        if (query) {
            url = `http://127.0.0.1:8000/books/search?name=${query}`;
        } else if (category) {
            url = `http://127.0.0.1:8000/books/genre/${category}`;
        } else {
            url = `http://127.0.0.1:8000/books`;
        }

        const response = await fetch(url);

        if (!response.ok) throw new Error("Failed to fetch books");

        let books = await response.json();

        if (availability === "available") {
            books = books.filter(book => book.status === "available");
        }

        if (availability === "borrowed") {
            books = books.filter(book => book.status === "borrowed");
        }

        allBooks = books;

        renderBooks(books);

    } catch (err) {
        console.error(err);
        booksContainer.innerHTML = "<p>Error loading books</p>";
    }
}

function renderBooks(books) {
    if (!books.length) {
        booksContainer.innerHTML = "<p>No books found</p>";
        return;
    }

    booksContainer.innerHTML = books.map(book => `
        <div class="book-card">
            <h3>${book.title}</h3>
            <p><strong>Author:</strong> ${book.author}</p>
            <p><strong>Genre:</strong> ${book.genre}</p>
            <p><strong>Status:</strong> ${book.status}</p>
            <p><strong>ISBN:</strong> ${book.isbn}</p>
        </div>
    `).join("");
}

searchBtn.addEventListener("click", fetchBooks);

searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") fetchBooks();
});

categorySelect.addEventListener("change", fetchBooks);
availabilityFilter.addEventListener("change", fetchBooks);
