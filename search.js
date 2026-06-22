const API = "https://shelve-qjkx.onrender.com";

const user = JSON.parse(localStorage.getItem("user"));

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

        let books = [];

        if (query) {
            // Natural-language search — let the AI figure out title/author/genre/status filters
            const response = await fetch(`${API}/ai-search`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query })
            });

            if (!response.ok) throw new Error("AI search failed");
            const data = await response.json();

            if (data.error) {
                // Fall back to a plain title/author search if the AI choked on the query
                const fallback = await fetch(`${API}/books/search?name=${encodeURIComponent(query)}`);
                books = fallback.ok ? await fallback.json() : [];
            } else {
                books = data.results || [];
            }

            // Dropdown category acts as an extra filter on top of the AI's own understanding
            if (category) books = books.filter(b => b.genre === category);

        } else if (category) {
            const response = await fetch(`${API}/books/genre/${category}`);
            if (!response.ok) throw new Error("Failed to fetch books");
            books = await response.json();
        } else {
            const response = await fetch(`${API}/books`);
            if (!response.ok) throw new Error("Failed to fetch books");
            books = await response.json();
        }

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
        const res = await fetch(`${API}/user/${ownerFlat}`);
        const owner = await res.json();
        const message = encodeURIComponent(
            `Hi ${owner.name}, I'm interested in your book "${bookTitle}" on Shelve.

        My flat number is ${user.flat_no}.

        If you're happy to lend it, could we discuss a suitable time and place for collection?

        After lending the book, you can update its status directly from your profile:
        https://sai-akshara-bysani.github.io/Shelve/profile.html`
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

/* ----------------------------------------------------------
   Shelve Buddy — floating chat widget.
   Tries a literal AI search first (/ai-search). If nothing
   concrete matches, falls back to taste-based recommendations
   (/recommend). Either way, results render into the SAME main
   book grid as a normal search — the buddy is just a different
   front door to the same results.
   ---------------------------------------------------------- */

const chatToggle = document.querySelector("#chat-toggle");
const chatPanel = document.querySelector("#chat-panel");
const chatClose = document.querySelector("#chat-close");
const chatMessages = document.querySelector("#chat-messages");
const chatInput = document.querySelector("#chat-input");
const chatSend = document.querySelector("#chat-send");

function appendChatMessage(text, sender = "bot") {
    const msg = document.createElement("div");
    msg.className = `chat-msg chat-${sender}`;
    msg.textContent = text;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return msg;
}

// Pushes results into the same grid + same renderBooks() the top search bar uses,
// then scrolls the page down to them and tucks the chat panel away.
function showBuddyResults(books) {
    categorySelect.value = "";
    availabilityFilter.value = "all";
    renderBooks(books);
    chatPanel.classList.add("hidden");
    document.querySelector(".search-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    appendChatMessage(text, "user");
    chatInput.value = "";
    const loading = appendChatMessage("Let me check the shelves...", "bot-loading");

    try {
        // Step 1 — try a literal/filtered search first
        const searchRes = await fetch(`${API}/ai-search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: text })
        });
        const searchData = await searchRes.json();

        if (!searchData.error && searchData.results && searchData.results.length) {
            loading.remove();
            const count = searchData.results.length;
            appendChatMessage(`Found ${count} book${count > 1 ? "s" : ""} that match — check them out below!`);
            showBuddyResults(searchData.results);
            return;
        }

        // Step 2 — nothing matched directly, fall back to taste-based recommendations
        loading.textContent = "Nothing matched directly — let me think of something close...";

        const recRes = await fetch(`${API}/recommend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: text })
        });
        const recData = await recRes.json();
        loading.remove();

        if (recData.message) {
            appendChatMessage(recData.message);
            return;
        }

        if (recData.error) {
            appendChatMessage("I couldn't quite place that one — could you try rephrasing?");
            return;
        }

        const recs = recData.recommendations || [];
        if (recs.length) {
            appendChatMessage("Couldn't find an exact match, but here's what I'd recommend instead:");
            showBuddyResults(recs);
        } else {
            appendChatMessage("No luck this time — try describing it a bit differently?");
        }

    } catch (err) {
        console.error(err);
        loading.remove();
        appendChatMessage("Something went wrong reaching the librarian bot. Try again in a bit.");
    }
}

chatToggle.addEventListener("click", () => {
    chatPanel.classList.toggle("hidden");
    if (!chatPanel.classList.contains("hidden") && !chatMessages.dataset.greeted) {
        appendChatMessage("Hi! I'm your Shelve buddy 📚 Tell me what you're looking for — I'll search the shelves, and if nothing matches exactly, I'll suggest something close.");
        chatMessages.dataset.greeted = "1";
    }
});

chatClose.addEventListener("click", () => chatPanel.classList.add("hidden"));
chatSend.addEventListener("click", sendChatMessage);
chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendChatMessage(); });
