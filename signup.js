const signup_form = document.querySelector("#signup-form");

signup_form.addEventListener("submit", async function (e) {

    e.preventDefault();

    const name =
        document.querySelector("#username").value;

    const flat =
        document.querySelector("#flat_no").value;

    const phone =
        document.querySelector("#phone_no").value;

    const pass =
        document.querySelector("#password").value;

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/signup",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    username: name,
                    flat_no: flat,
                    phone_no: phone,
                    password: pass
                })
            }
        );

        const data = await response.json();

        if (response.ok) {

            alert(data.message);

            window.location.href = "login.html";

        } else {

            alert(data.detail);

        }

    } catch (error) {

        console.error(error);

        alert("Server error");

    }

});
