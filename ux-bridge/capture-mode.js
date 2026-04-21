const params = new URLSearchParams(window.location.search);

if (params.get("capture") === "1") {
  document.body.classList.add("capture-mode");
}
