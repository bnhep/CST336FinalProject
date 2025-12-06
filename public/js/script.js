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

  // rubric toggle behavior
  const rubricItems = document.querySelectorAll(".rubric-item");

  rubricItems.forEach((item) => {
    item.addEventListener("click", () => {
      const statusText = item.querySelector(".rubric-status-text");
      const badge = item.querySelector(".rubric-badge");

      if (!statusText || !badge) return;

      const isCompleted = item.classList.toggle("completed");

      if (isCompleted) {
        statusText.textContent = "Complete";
        badge.classList.remove("rubric-badge-pending");
        badge.classList.add("rubric-badge-complete");
      } else {
        statusText.textContent = "Not done yet";
        badge.classList.remove("rubric-badge-complete");
        badge.classList.add("rubric-badge-pending");
      }
    });
  });
});