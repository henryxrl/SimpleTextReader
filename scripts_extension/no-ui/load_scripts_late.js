injectCustomIcon('images/icon.png', 'image/png');

injectCustomJs('scripts/ui.js');
injectCustomJs('scripts/processText.js');

injectCustomJs('scripts_extension/no-ui/file_handler.js');

function injectCustomJs(jsPath)
{
    let temp = document.createElement('script');
    temp.setAttribute('type', 'text/javascript');
    temp.setAttribute('charset', 'utf-8');
    temp.src = chrome.runtime.getURL(jsPath);
    document.head.appendChild(temp);
}

function injectCustomIcon(iconPath, iconType)
{
    let temp = document.createElement('link');
    temp.type = iconType;
    temp.rel = 'icon';
    temp.as = 'image';
    temp.href = chrome.runtime.getURL(iconPath);
    document.head.appendChild(temp);
}