const navbar__list = document.querySelector(".navbar__list");
const close_btn = document.querySelector(".navbar .close-menu");
const menu_btn = document.querySelector(".navbar .menu");
const toggleNav = (val) => {
  var current_list = navbar__list.classList.value;
  if (val) {
    navbar__list.classList = current_list + " active";
    return;
  }
  navbar__list.classList = "navbar__list";
};
