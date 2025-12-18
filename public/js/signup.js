//event listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadAvatars();
        attachAvatarListeners();
        signupValidation();
    } catch (err) {
        console.error('Error initializing avatar carousel:', err);
    }
});

//function
async function loadAvatars() {
    try {
        let url = '/api/avatars';
        let res = await fetch(url);
        let avatars = await res.json();

        let carouselInner = document.querySelector('#avatarCarousel .carousel-inner');
        carouselInner.innerHTML = '';

        avatars.forEach((avatar, index) => {
            let item = document.createElement('div');
            item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
            item.innerHTML = `<img src="${avatar.url}" 
                                alt="${avatar.filename}" 
                                class="rounded-circle avatar-choice mx-auto d-block" 
                                style="width:250px;height:250px;" 
                                data-avatar="${avatar.url}">
                                <p class="text-center">${avatar.filename.replace('.png','')}</p>`;
            carouselInner.appendChild(item);
        });
    } catch (err) {
        console.error('Error loading avatars:', err);
    }
}

// attach listeners after avatars are loaded
function attachAvatarListeners() {
    try {
        document.querySelectorAll('.avatar-choice').forEach(img => {
            img.addEventListener('click', () => {
                document.getElementById('avatarInput').value = img.dataset.avatar;
                document.querySelectorAll('.avatar-choice').forEach(i => i.classList.remove('selected'));
                img.classList.add('selected');
            });
        });
    } catch (err) {
        console.error('Error attaching avatar listeners:', err);
    }
}

function signupValidation() {
    const username = document.getElementById("username");
    const firstname = document.getElementById("firstname");
    const lastname = document.getElementById("lastname");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    const usernameErr = document.querySelector("#username-signuperr small");
    const firstnameErr = document.querySelector("#firstname-signuperr small");
    const lastnameErr = document.querySelector("#last_name-signuperr small");
    const passwordErr = document.querySelector("#password-signuperr small");
    const confirmpasswordErr = document.querySelector("#confirmpassword-signuperr small");

    const form = document.querySelector("form[action='/signup']");

    // Hide errors initially
    [usernameErr, firstnameErr, lastnameErr, passwordErr, confirmpasswordErr].forEach(err => {
        err.style.display = "none";
    });

    //Username
    username.addEventListener("input", () => {
        if (username.value.trim().length < 4) {
            usernameErr.textContent = "Username is too short.";
            usernameErr.style.display = "inline";
        } else {
            usernameErr.style.display = "none";
        }
    });

    //username spacing
    username.addEventListener("input", () => {
        if (/\s/.test(username.value)) {
            usernameErr.textContent = "Username cannot contain spaces.";
            usernameErr.style.display = "inline";
        } else {
            usernameErr.style.display = "none";
        }
    });


    //First name
    firstname.addEventListener("input", () => {
        if (!/^[A-Za-z]*$/.test(firstname.value)) {
            firstnameErr.textContent = "Please enter letters only.";
            firstnameErr.style.display = "inline";
        } else {
            firstnameErr.style.display = "none";
        }
    });

    //Last name
    lastname.addEventListener("input", () => {
        if (!/^[A-Za-z]*$/.test(lastname.value)) {
            lastnameErr.textContent = "Please enter letters only.";
            lastnameErr.style.display = "inline";
        } else {
            lastnameErr.style.display = "none";
        }
    });

    //Password length
    password.addEventListener("input", () => {
        if (password.value.length < 6) {
            passwordErr.textContent = "Password is too short.";
            passwordErr.style.display = "inline";
        } else {
            passwordErr.style.display = "none";
        }
    });

    //Final validation on submit
    form.addEventListener("submit", (e) => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        let valid = true;

        //username on button press
        if (username.value.trim().length < 6) {
            usernameErr.textContent = "Username is too short!";
            usernameErr.style.display = "inline";
            valid = false;
        }

        if (/\s/.test(username.value)) {
            usernameErr.textContent = "Username cannot contain spaces.";
            usernameErr.style.display = "inline";
            valid = false;
        }


        //firstname on button press
        if (!/^[A-Za-z]*$/.test(firstname.value)) {
            firstnameErr.textContent = "Please enter letters only.";
            firstnameErr.style.display = "inline";
            valid = false;

        }

        //lastname on button press
        if (!/^[A-Za-z]*$/.test(lastname.value)) {
            lastnameErr.textContent = "Please enter letters only.";
            lastnameErr.style.display = "inline";
            valid = false;
        }

        //password on button
        if (password.value.length < 6) {
            passwordErr.textContent = "Password is too short.";
            passwordErr.style.display = "inline";
            valid = false;
        }

        //confirm on button
        if (password.value !== confirmPassword.value) {
            confirmpasswordErr.textContent = "Password does not match.";
            confirmpasswordErr.style.display = "inline";
            valid = false;
        }

        //prevent from doing its action if not valid
        if (!valid) e.preventDefault();
    });
}
