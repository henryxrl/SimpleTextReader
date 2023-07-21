var paths;
document.addEventListener("injectCustomJsLoaded", function (event) {
    // console.log(event);
    paths = event.detail;
    // console.log(paths);
}, false);
