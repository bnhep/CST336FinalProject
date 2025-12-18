// public/js/admindashboard.js

document.addEventListener("DOMContentLoaded", () => {
  // --- USERS ---
  const userSelect = document.getElementById("userSelect");
  const manageUserLink = document.getElementById("manageUserLink");

  if (userSelect && manageUserLink) {
    userSelect.addEventListener("change", () => {
      const userId = userSelect.value;
      if (userId && userId !== "0") {
        manageUserLink.href = `/admindashboard/users?user_id=${userId}`;
      } else {
        manageUserLink.href = `/admindashboard/users`;
      }
    });
  }

  // --- SIGHTINGS ---
  const sightingSelect = document.getElementById("sightingSelect");
  const manageSightingLink = document.getElementById("manageSightingLink");

  if (sightingSelect && manageSightingLink) {
    sightingSelect.addEventListener("change", () => {
      const sightingId = sightingSelect.value;
      if (sightingId && sightingId !== "0") {
        manageSightingLink.href = `/admindashboard/sightings?sighting_id=${sightingId}`;
      } else {
        manageSightingLink.href = `/admindashboard/sightings`;
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
