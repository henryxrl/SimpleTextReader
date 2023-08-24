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
            loading_img.setAttribute('src', chrome.runtime.getURL('images/loading_geometry.gif'));
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
            // let darkModeSwitchIconLight = document.createElement('span');
            // darkModeSwitchIconLight.setAttribute('class', 'material-symbols-rounded');
            // darkModeSwitchIconLight.innerText = " light_mode ";
            // let darkModeSwitchIconDark = document.createElement('span');
            // darkModeSwitchIconDark.setAttribute('class', 'material-symbols-rounded');
            // darkModeSwitchIconDark.innerText = " nights_stay ";
            let darkModeSwitchIconLight = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            darkModeSwitchIconLight.setAttribute('version', '1.1');
            darkModeSwitchIconLight.setAttribute('class', 'sun');
            darkModeSwitchIconLight.setAttribute('viewBox', '0 0 24 24');
            darkModeSwitchIconLight.setAttribute('fill', 'none');
            darkModeSwitchIconLight.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            let darkModeSwitchIconLightPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            darkModeSwitchIconLightPath.setAttribute('d', 'M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5001M17.6859 17.69L18.5 18.5001M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z');
            darkModeSwitchIconLightPath.setAttribute('stroke-width', '2');
            darkModeSwitchIconLightPath.setAttribute('stroke-linecap', 'round');
            darkModeSwitchIconLightPath.setAttribute('stroke-linejoin', 'round');
            darkModeSwitchIconLight.appendChild(darkModeSwitchIconLightPath);
            let darkModeSwitchIconDark = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            darkModeSwitchIconDark.setAttribute('version', '1.1');
            darkModeSwitchIconDark.setAttribute('class', 'moon');
            darkModeSwitchIconDark.setAttribute('viewBox', '0 0 24 24');
            darkModeSwitchIconDark.setAttribute('fill', 'none');
            darkModeSwitchIconDark.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            let darkModeSwitchIconDarkPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            darkModeSwitchIconDarkPath.setAttribute('d', 'M3.32031 11.6835C3.32031 16.6541 7.34975 20.6835 12.3203 20.6835C16.1075 20.6835 19.3483 18.3443 20.6768 15.032C19.6402 15.4486 18.5059 15.6834 17.3203 15.6834C12.3497 15.6834 8.32031 11.654 8.32031 6.68342C8.32031 5.50338 8.55165 4.36259 8.96453 3.32996C5.65605 4.66028 3.32031 7.89912 3.32031 11.6835Z');
            darkModeSwitchIconDarkPath.setAttribute('stroke-width', '2');
            darkModeSwitchIconDarkPath.setAttribute('stroke-linecap', 'round');
            darkModeSwitchIconDarkPath.setAttribute('stroke-linejoin', 'round');
            darkModeSwitchIconDark.appendChild(darkModeSwitchIconDarkPath);
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