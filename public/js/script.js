// event listeners
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
});