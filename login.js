const login_form = document.querySelector("#login-form");


login_form.addEventListener("submit", async function login(e) {

    e.preventDefault();

    const flat =
        document.getElementById("flat_no").value;

    const password =
        document.getElementById("password").value;

    const response = await fetch(
        "http://127.0.0.1:8000/login",
        {
            method: "POST",

            headers: {
                "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
                flat_no: flat,
                password: password
            })
        }
    );

    const data = await response.json();

    if(data.success){
        alert("Welcome " + data.username);

        window.location.href =
            "profile.html";
    }
    else{
        alert("Invalid login");
    }

});
