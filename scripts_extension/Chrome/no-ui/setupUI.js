// Create an observer instance.
var visited_title = false;
var visited_body = false;
var visited_pre = false;
var visited_content = false;
var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        if ((document.getElementsByTagName("title").length > 0) && (!visited_title)) {
            document.title = decodeURI(window.location.href.split("/").pop());
            visited_title = true;
        }
        if ((document.getElementsByTagName("body").length > 0) && (!visited_body)) {
            document.body.setAttribute('style', 'background-color: #fefcf4 !important;');

            let loading = document.createElement('div');
            loading.setAttribute('id', 'loading');
            loading.setAttribute('class', 'uifont prevent-select');
            loading.setAttribute('style', 'background: #fefcf4; position: fixed; top: 0; left: 0; width: 100%; height: 100%; visibility: visible !important; z-index: 999;');
            let loading_img = document.createElement('img');
            loading_img.setAttribute('id', 'loading_img');
            loading_img.setAttribute('class', 'uifont prevent-select');
            loading_img.setAttribute('src', chrome.runtime.getURL('images/loading_geometry.gif'));
            loading_img.setAttribute('style', 'position: absolute; top: 50%; left: 50%; width: 380px; transform: translate(-50%, -50%); -webkit-transform: translate(-50%, -50%); filter: invert(52%) sepia(93%) saturate(187%) hue-rotate(166deg) brightness(92%) contrast(82%); visibility: visible !important; z-index: 999;');
            loading.appendChild(loading_img);
            document.body.appendChild(loading);

            let tocWrapper = document.createElement('div');
            tocWrapper.setAttribute('id', 'tocWrapper');
            tocWrapper.innerHTML = "<div id='tocContent'></div>";
            document.body.appendChild(tocWrapper);

            let progress = document.createElement('div');
            progress.setAttribute('id', 'progress');
            progress.setAttribute('class', 'uifont prevent-select');
            document.body.appendChild(progress);

            let content = document.createElement('div');
            content.setAttribute('id', 'content');
            document.body.appendChild(content);

            let pagination = document.createElement('div');
            pagination.setAttribute('id', 'pagination');
            pagination.setAttribute('class', 'uifont prevent-select');
            document.body.appendChild(pagination);

            let footnote = document.createElement('ol');
            footnote.setAttribute('id', 'footnote-content');
            document.body.appendChild(footnote);

            visited_body = true;
            // console.log("elements created");
        }

        if ((document.getElementsByTagName("pre").length > 0) && (!visited_pre)) {
            document.getElementsByTagName("pre")[0].setAttribute("style", "visibility: hidden !important; overflow: hidden !important; -ms-overflow-style: none !important; scrollbar-width: none !important;");
            visited_pre = true;
            // console.log("pre hidden");
        }

        // console.log(document.getElementById("content"));
        if ((document.getElementById("content")) && (document.getElementById("content").innerHTML !== "") && (!visited_content)) {
            document.getElementById("loading").setAttribute("style", "visibility: hidden !important");
            document.getElementById("loading_img").setAttribute("style", "visibility: hidden !important");
            observer.disconnect();
            visited_content = true;
            // console.log("observer disconnected");
        }
    });
});

// Observe the body (and its descendants) for `childList` changes.
observer.observe(document, {
    childList: true, 
    subtree: true
});