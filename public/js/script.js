//event listeners
document.querySelector("#logout-btn").addEventListener("click", logoutChecker);

document.addEventListener("DOMContentLoaded", () => {
  logoutChecker();
});

//triggers the modal
function logoutChecker() {
  var myModal = new bootstrap.Modal(document.getElementById('authorModal'));
  myModal.show();
}