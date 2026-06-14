const book_form = document.querySelector("#book_form");

book_form.addEventListener("submit", async function add(e) {

    e.preventDefault();

    const title = document.querySelector("#title").value;
    const author = document.querySelector("#author").value;
    const genre = document.querySelector("#category").value;
    const owner_flat = localStorage.getItem("flat_no");

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
