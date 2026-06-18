const book_form = document.querySelector("#book_form");
const findBookBtn = document.querySelector("#find-book-btn");
const coverPreview = document.querySelector("#cover-preview");
const searchResults = document.querySelector("#search-results");

let cover_url = "";

function detectGenre(subjects) {
    if (!subjects || !subjects.length) return "";

    const text = subjects.join(" ").toLowerCase();

    if (text.includes("fantasy")) return "Fantasy";
    if (text.includes("romance")) return "Romance";
    // OpenLibrary uses "science fiction" (lowercase works after .toLowerCase())
    if (text.includes("science fiction") || text.includes("sci-fi") || text.includes("scifi")) return "Sci-Fi";
    if (text.includes("mystery") || text.includes("detective")) return "Mystery";
    if (text.includes("thriller") || text.includes("suspense")) return "Thriller";
    if (text.includes("biography") || text.includes("autobiography") || text.includes("memoir")) return "Biography";
    if (text.includes("self-help") || text.includes("self help") || text.includes("personal development")) return "Self-Help";
    if (text.includes("fiction")) return "Fiction";

    // Don't default to Academic — leave blank so user can pick
    return "";
}

book_form.addEventListener("submit", async function add(e) {
    e.preventDefault();

    const title = document.querySelector("#title").value;
    const author = document.querySelector("#author").value;
    const genre = document.querySelector("#category").value;

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        alert("Please login first");
        window.location.href = "login.html";
        return;
    }

    const owner_flat = user.flat_no;
    const isbn = document.querySelector("#isbn").value;
    const description = document.querySelector("#description").value;

    const response = await fetch("https://shelve-qjkx.onrender.com/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author, genre, isbn, owner_flat, cover_url, description })
    });

    const data = await response.json();
    if (response.ok) {
        alert(data.message);
    } else {
        alert(data.detail);
    }
});

async function findBook() {
    const title = document.querySelector("#title").value.trim();
    if (!title) return;

    findBookBtn.textContent = "Searching...";
    findBookBtn.disabled = true;

    try {
        const res = await fetch(
            `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=5&fields=title,author_name,cover_i,isbn,subject,key,first_publish_year`
        );
        const data = await res.json();

        if (!data.docs || !data.docs.length) {
            alert("Book not found");
            return;
        }

        window.bookResults = data.docs.slice(0, 5);

        searchResults.innerHTML = window.bookResults.map((book, index) => `
            <button type="button" onclick="selectBook(${index})">
                ${book.title}${book.author_name ? ` — ${book.author_name[0]}` : ""}
                ${book.first_publish_year ? ` (${book.first_publish_year})` : ""}
            </button>
        `).join("");

    } catch (err) {
        console.error(err);
        alert("Could not fetch book info");
    } finally {
        findBookBtn.textContent = "Find Book";
        findBookBtn.disabled = false;
    }
}

async function selectBook(index) {
    const book = window.bookResults[index];

    document.querySelector("#title").value = book.title || "";
    document.querySelector("#author").value = book.author_name?.[0] || "";

    // Prefer 13-digit ISBN, fall back to any
    const isbn13 = book.isbn?.find(i => i.length === 13);
    const isbn10 = book.isbn?.find(i => i.length === 10);
    document.querySelector("#isbn").value = isbn13 || isbn10 || book.isbn?.[0] || "";

    if (book.cover_i) {
        cover_url = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
        coverPreview.src = cover_url;
        coverPreview.style.display = "block";
    }

    // Set genre from subjects
    const subjects = book.subject || [];
    const detectedGenre = detectGenre(subjects);
    document.querySelector("#category").value = detectedGenre;

    // Set description from subjects as a preview, then try to fetch real description
    if (subjects.length) {
        document.querySelector("#description").value = subjects.slice(0, 8).join(", ");
    }

    searchResults.innerHTML = "";

    // Try to fetch a real description from the Works API
    if (book.key) {
        try {
            const workRes = await fetch(`https://openlibrary.org${book.key}.json`);
            const workData = await workRes.json();

            let desc = "";
            if (workData.description) {
                desc = typeof workData.description === "string"
                    ? workData.description
                    : workData.description.value || "";
            }

            if (desc) {
                // Trim to reasonable length
                document.querySelector("#description").value = desc.slice(0, 500);
            }
        } catch (err) {
            // Not critical — subjects fallback is already set
            console.warn("Could not fetch work description:", err);
        }
    }
}

findBookBtn.addEventListener("click", findBook);

// Allow pressing Enter in title field to trigger search
document.querySelector("#title").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        findBook();
    }
});

window.selectBook = selectBook;
