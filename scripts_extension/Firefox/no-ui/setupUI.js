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
            // Implement getUIMode() here
            let lightMode = true;
            if (localStorage.getItem("UIMode") !== null) {
                lightMode = JSON.parse(localStorage.getItem("UIMode"));
                console.log(`UI mode is ${(lightMode ? "light" : "dark")}.`);
                document.documentElement.setAttribute("data-theme", (lightMode ? "light" : "dark"));
            } else {
                console.log("UI mode is light by default.");
                document.documentElement.setAttribute("data-theme", "light");
            }

            let bgColor = lightMode ? "#fdf5e8" : "#0d1018";
            let filter = lightMode ? "invert(52%) sepia(93%) saturate(187%) hue-rotate(166deg) brightness(92%) contrast(82%)" : "invert(22%) sepia(47%) saturate(1327%) hue-rotate(180deg) brightness(91%) contrast(80%)";
            // document.body.setAttribute('style', 'background-color: #fefcf4 !important;');
            document.body.setAttribute('style', `background-color: ${bgColor};`);

            let loading = document.createElement('div');
            loading.setAttribute('id', 'loading');
            loading.setAttribute('class', 'uifont prevent-select');
            loading.setAttribute('style', `background: ${bgColor}; position: fixed; top: 0; left: 0; width: 100%; height: 100%; visibility: visible !important; z-index: 999;`);
            let loading_img = document.createElement('img');
            loading_img.setAttribute('id', 'loading_img');
            loading_img.setAttribute('class', 'uifont prevent-select');
            loading_img.setAttribute('src', browser.runtime.getURL('images/loading_geometry.gif'));
            loading_img.setAttribute('style', `position: absolute; top: 50%; left: 50%; width: 380px; transform: translate(-50%, -50%); -webkit-transform: translate(-50%, -50%); filter: ${filter}; visibility: visible !important; z-index: 999;`);
            loading.appendChild(loading_img);
            document.body.appendChild(loading);

            let tocWrapper = document.createElement('div');
            tocWrapper.setAttribute('id', 'tocWrapper');
            tocWrapper.innerHTML = "<div id='tocContent'></div>";
            document.body.appendChild(tocWrapper);

            let progress = document.createElement('div');
            progress.setAttribute('id', 'progress');
            progress.setAttribute('class', 'uifont prevent-select');
            let progressTitle = document.createElement('span');
            progressTitle.setAttribute('id', 'progress-title');
            progress.appendChild(progressTitle);
            progress.appendChild(document.createElement('br'));
            let progressContent = document.createElement('span');
            progressContent.setAttribute('id', 'progress-content');
            progress.appendChild(progressContent);
            document.body.appendChild(progress);

            let darkModeCheckbox = document.createElement('input');
            darkModeCheckbox.setAttribute('id', 'switch');
            darkModeCheckbox.setAttribute('type', 'checkbox');
            let darkModeSwitchBtn = document.createElement('div');
            darkModeSwitchBtn.setAttribute('id', 'switch-btn');
            darkModeSwitchBtn.setAttribute('class', 'switch-btn');
            darkModeSwitchBtn.setAttribute('style', 'visibility: hidden');
            darkModeSwitchBtn.setAttribute('z-index', '1005');
            let darkModeSwitchBtnLabel = document.createElement('label');
            darkModeSwitchBtnLabel.setAttribute('for', 'switch');
            let darkModeSwitchIcons = document.createElement('div');
            darkModeSwitchIcons.setAttribute('class', 'icons');
            let darkModeSwitchIconLight = document.createElement('span');
            darkModeSwitchIconLight.setAttribute('class', 'material-symbols-rounded');
            darkModeSwitchIconLight.innerText = " light_mode ";
            let darkModeSwitchIconDark = document.createElement('span');
            darkModeSwitchIconDark.setAttribute('class', 'material-symbols-rounded');
            darkModeSwitchIconDark.innerText = " nights_stay ";
            darkModeSwitchIcons.appendChild(darkModeSwitchIconLight);
            darkModeSwitchIcons.appendChild(darkModeSwitchIconDark);
            darkModeSwitchBtnLabel.appendChild(darkModeSwitchIcons);
            darkModeSwitchBtn.appendChild(darkModeSwitchBtnLabel);
            document.body.appendChild(darkModeCheckbox);
            document.body.appendChild(darkModeSwitchBtn);

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