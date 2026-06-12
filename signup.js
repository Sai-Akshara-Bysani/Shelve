const signup_form = document.querySelector("signup-form");


signup_form.addEventListener("submit", async function login(e) {

    e.preventDefault();

    const name = document.querySelector("#username").value;
    const flat = document.querySelector("#flat_no").value;
    const phone = document.querySelector("#phone_no").value;
    const pass = document.querySelector("#password").value;

    const response = await fetch(
        "http://127.0.0.1:8000/signup",
        {
            method: "POST",

            headers: {
                "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
                username,
                flat_no,
                phone_no,
                password
            })
        }
    );

    const data = await response.json();

    alert(data.message);

});
