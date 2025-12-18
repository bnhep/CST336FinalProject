document.addEventListener("DOMContentLoaded", () => {
  // logout modal behavior
  const logoutBtn = document.querySelector("#logout-btn");
  const logoutModalEl = document.getElementById("logoutModal");

  if (logoutBtn && logoutModalEl && typeof bootstrap !== "undefined") {
    logoutBtn.addEventListener("click", (event) => {
      event.preventDefault();
      const logoutModal = new bootstrap.Modal(logoutModalEl);
      logoutModal.show();
    });
  }

  loadFeaturedCryptid();
});

async function loadFeaturedCryptid() {
  try {
    const res = await fetch("/api/cryptids");
    const cryptids = await res.json();

    if (!Array.isArray(cryptids) || cryptids.length === 0) return;

    const featured =
      cryptids[Math.floor(Math.random() * cryptids.length)];

    const nameEl = document.querySelector(".featured-name");
    const regionEl = document.querySelector(".featured-region");
    const blurbEl = document.querySelector(".featured-blurb");

    if (nameEl) nameEl.textContent = featured.name || "Unknown Cryptid";
    if (regionEl)
      regionEl.textContent =
        featured.original_region || "Unknown region";
    if (blurbEl)
      blurbEl.textContent =
        featured.description || "No description available.";
  } catch (err) {
    console.error("Featured cryptid failed to load:", err);
  }
}
