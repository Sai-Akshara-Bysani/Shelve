const book_form = document.querySelector("#book_form");

const findBookBtn =
    document.querySelector("#find-book-btn");

const coverPreview =
    document.querySelector("#cover-preview");

const descriptionPreview =
    document.querySelector("#book-description");

function detectGenre(subjects) {

    const text =
        subjects.join(" ").toLowerCase();

    if (text.includes("fantasy"))
        return "Fantasy";

    if (text.includes("romance"))
        return "Romance";

    if (text.includes("science fiction"))
        return "Sci-Fi";

    if (text.includes("mystery"))
        return "Mystery";

    if (text.includes("thriller"))
        return "Thriller";

    if (text.includes("biography"))
        return "Biography";

    if (text.includes("self-help"))
        return "Self-Help";

    return "Academic";
}

book_form.addEventListener("submit", async function add(e) {

    e.preventDefault();

    const title = document.querySelector("#title").value;
    const author = document.querySelector("#author").value;
    const genre = document.querySelector("#category").value;
    
    const user =
        JSON.parse(localStorage.getItem("user"));

    if (!user) {
        alert("Please login first");
        window.location.href = "login.html";
        return;
    }

    const owner_flat =
        user.flat_no;

    const isbn = document.querySelector("#isbn").value;

    const response = await fetch(
        "http://127.0.0.1:8000/add",
        {
            method: "POST",

            headers: {
                "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
                title,
                author,
                genre,
                isbn,
                owner_flat
            })
        }
    );

    const data = await response.json();

    if (response.ok) {
        alert(data.message);
    } else {
        alert(data.detail);
    }

});

async function findBook() {

    const title =
        document.querySelector("#title").value.trim();

    if (!title) return;

    try {

        const res = await fetch(
            `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`
        );

        const data = await res.json();

        if (!data.docs.length) {
            alert("Book not found");
            return;
        }

        const book =
            data.docs[0];

        document.querySelector("#title").value =
            book.title || "";

        document.querySelector("#author").value =
            book.author_name?.[0] || "";

        document.querySelector("#isbn").value =
            book.isbn?.[0] || "";

        if (book.cover_i) {

            coverPreview.src =
                `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
        }

        const subjects =
            book.subject || [];

        document.querySelector("#category").value =
            detectGenre(subjects);

    }

    catch (err) {

        console.error(err);

        alert("Could not fetch book info");
    }
}

findBookBtn.addEventListener(
    "click",
    findBook
);
