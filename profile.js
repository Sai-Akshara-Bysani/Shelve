const user = JSON.parse(localStorage.getItem("user"));

const usernameEl = document.querySelector("#user_name");
const lentCount = document.querySelector("#lent-count");
const borrowedCount = document.querySelector("#borrowed-count");

const borrowedBooksContainer = document.querySelector("#borrowed-books-container");
const myBooksContainer = document.querySelector("#my-books-container");
const lentBooksContainer = document.querySelector("#lent-books-container");

const logoutBtn = document.querySelector(".log-out");

if (!user) {
    window.location.href = "login.html";
}

usernameEl.textContent = user.username;

async function loadProfile() {
    try {
        const res = await fetch("http://127.0.0.1:8000/books");
        const books = await res.json();

        const myFlat = user.flat_no;

        const myBooks = books.filter(
            b => String(b.owner_flat) === String(myFlat)
        );

        const borrowedRes = await fetch(
            `http://127.0.0.1:8000/books/borrowed/${myFlat}`
        );

        const borrowedBooks = await borrowedRes.json();

        const availableBooks = myBooks.filter(
            book => book.status === "available"
        );

        const lentBooks = myBooks.filter(
            book => book.status === "borrowed"
        );

        lentCount.textContent = lentBooks.length;
        borrowedCount.textContent = borrowedBooks.length;

        renderBooks(myBooksContainer, myBooks);

        renderBooks(lentBooksContainer, lentBooks);

        renderBooks(borrowedBoksContainer, borrowedBooks);

    } catch (err) {
        console.error("Profile load error:", err);
    }
}

function renderBooks(container, books) {
    if (!books.length) {
        container.innerHTML = "<p>No books found</p>";
        return;
    }

    container.innerHTML = books.map(book => `
        <div class="book-card">
            <h4>${book.title}</h4>
            <p>${book.author}</p>
            <p>Status: ${book.status}</p>
            ${
                book.borrower_flat
                ? `<p>Borrowed by: ${book.borrower_flat}</p>`
                : ""
            }

            ${
                book.status === "available"
                ? `<button onclick='markBorrowed('${book.isbn}')'>
                    Mark Borrowed
                </button>`
                : `
                <button onclick='markAvailable('${book.isbn}')'>
                    Mark Available
                </button>
                `
            }
        </div>
    `).join("");
}

async function markAvailable(isbn) {
    await fetch("http://127.0.0.1:8000/books/update-status",{
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            isbn: isbn,
            status: "available",
            borrower_flat: null
        })
    });

    location.reload();
}

async function markBorrowed(isbn, borrower_flat) {

    const borrowerFlat =
        prompt("Enter borrower flat number");

    if (!borrowerFlat) return;

    await fetch("http://127.0.0.1:8000/books/update-status", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            isbn: isbn,
            status: "borrowed",
            borrower_flat: borrowerFlat
        })
    });

    location.reload();
}

logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("user");
    window.location.href = "login.html";
});

loadProfile();
