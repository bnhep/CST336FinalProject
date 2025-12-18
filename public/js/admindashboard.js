// public/js/admindashboard.js

document.addEventListener("DOMContentLoaded", () => {
  // --- USERS ---
  const userSelect = document.getElementById("userSelect");
  const manageUserLink = document.getElementById("manageUserLink");

    manageUserLink.addEventListener('click', function (e) {
      if (userSelect.value === "0") {
          e.preventDefault();
      }
    });

  if (userSelect && manageUserLink) {
    userSelect.addEventListener("change", () => {
      const userId = userSelect.value;
      if (userId && userId !== "0") {
        manageUserLink.href = `/admin/users?id=${userId}`;
      } else {
        manageUserLink.href = `#`;
      }
    });
  }

  // --- SIGHTINGS ---
  const sightingSelect = document.getElementById("sightingSelect");
  const manageSightingLink = document.getElementById("manageSightingLink");

    manageSightingLink.addEventListener('click', function (e) {
      if (sightingSelect.value === "0") {
          e.preventDefault();
      }
    });
    if (sightingSelect && manageSightingLink) {
      sightingSelect.addEventListener("change", () => {
        const sightingId = sightingSelect.value;
        if (sightingId && sightingId !== "0") {
          manageSightingLink.href = `/admin/sightings?sighting=${sightingId}`;
        } else {
          manageSightingLink.href = `#`;
        }
      });
    }

  // --- CRYPTIDS ---
  const cryptidSelect = document.getElementById("cryptidSelect");
  const manageCryptidLink = document.getElementById("manageCryptidLink");
  if (cryptidSelect && manageCryptidLink) {
    cryptidSelect.addEventListener("change", () => {
      const cryptidId = cryptidSelect.value;
      if (cryptidId && cryptidId !== "0") {
        manageCryptidLink.href = `/admindashboard/cryptids?cryptid_id=${cryptidId}`;
      } else {
        manageCryptidLink.href = `/admindashboard/cryptids`;
      }
    });
  }
});
