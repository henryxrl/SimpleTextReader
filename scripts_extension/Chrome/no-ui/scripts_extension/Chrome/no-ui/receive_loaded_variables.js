var paths;
document.addEventListener("injectCustomResourcesLoaded", function (event) {
    // console.log(event);
    paths = event.detail;
}, false);
