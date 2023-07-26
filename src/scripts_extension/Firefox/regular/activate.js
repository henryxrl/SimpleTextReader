browser.browserAction.onClicked.addListener(function (tab) {
    browser.tabs.create({
        url: "index.html",
        active: true,
    });
});