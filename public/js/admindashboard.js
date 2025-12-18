//addevent listeners
document.addEventListener('DOMContentLoaded', () => {
    manageUserSelect();
    manageSightingSelect();
    manageCryptidSelect();
});

//functions
function manageUserSelect() {
    let userSelect = document.getElementById('userSelect');
    let manageUserLink = document.getElementById('manageUserLink');
    if (userSelect && manageUserLink) {
        userSelect.addEventListener('change', function () {
            let selectedId = this.value;
            if (selectedId !== "0") {
                manageUserLink.href = `/admin/users?id=${selectedId}`;
                manageUserLink.classList.remove("disabled");
            } else {
                manageUserLink.href = "#";
                manageUserLink.classList.add("disabled");
            }
        });
        //validate whether the value is 0
        // Prevent navigation if disabled
        manageUserLink.addEventListener('click', function (e) {
            if (userSelect.value === "0") {
                e.preventDefault();
            }
        });
    }
}

function manageSightingSelect() {
    let sightingSelect = document.getElementById('sightingSelect');
    let manageSightingLink = document.getElementById('manageSightingLink');
    if (sightingSelect && manageSightingLink) {
        sightingSelect.addEventListener('change', function () {
            let selectedId = this.value;
            if (selectedId !== "0") {
                manageSightingLink.href = `/admin/sightings?sighting=${selectedId}`;
                manageSightingLink.classList.remove("disabled");
            } else {
                manageSightingLink.href = "#";
                manageSightingLink.classList.add("disabled");
            }
        });
        //validate whether the value is 0
        // Prevent navigation if disabled
        manageSightingLink.addEventListener('click', function (e) {
            if (sightingSelect.value === "0") {
                e.preventDefault();
            }
        });
    }
}

function manageCryptidSelect() {
    let cryptidSelect = document.getElementById('cryptidSelect');
    let manageCryptidLink = document.getElementById('manageCryptidLink');
    if (cryptidSelect && manageCryptidLink) {
        cryptidSelect.addEventListener('change', function () {
            let selectedId = this.value;
            if (selectedId !== "0") {
                manageCryptidLink.href = `/admin/cryptids?cryptid=${selectedId}`;
                manageCryptidLink.classList.remove("disabled");
            } else {
                manageCryptidLink.href = "#";
                manageCryptidLink.classList.add("disabled");
            }
        });
        //validate whether the value is 0
        // Prevent navigation if disabled
        manageCryptidLink.addEventListener('click', function (e) {
            if (cryptidSelect.value === "0") {
                e.preventDefault();
            }
        });

    }
}
