function setLanguage(lang, saveToLocalStorage = true) {
    if (saveToLocalStorage) {
        webLANG = lang;
        localStorage.setItem("UILang", lang);
    }
    style.ui_LANG = lang;
    document.documentElement.setAttribute("data-lang", style.ui_LANG);
    style = new CSSGlobalVariables();
    if (document.title === style.ui_title_zh || document.title === style.ui_title_en) {
        setTitle();
    }

    // reset all tooltips
    // document.querySelectorAll(".hasTitle").forEach((el) => {
    //     console.log(el);
    // });
    // only reset visible tooltips
    if (isVariableDefined(darkModeActualButton))
        darkModeActualButton.title = style.ui_tooltip_modeToggle;
    let bookshelfButton = document.getElementById("STRe-bookshelf-btn");
    if (isVariableDefined(bookshelfButton))
        bookshelfButton.title = style.ui_tooltip_goToLibrary;
    if (isVariableDefined(settingsButton))
        settingsButton.title = style.ui_tooltip_settings;

    console.log(`Language set to "${lang}".`);
}

function setTitle(title = "") {
    if (title === "") {
        document.title = style.ui_title || style.ui_title_zh;
    } else {
        document.title = title;
    }
}

function setHistory(filename, lineNumber) {
    // console.log("History set to line: ", lineNumber);
    localStorage.setItem(filename, lineNumber);
    if (lineNumber === 0) {
        // Don't save history if line number is 0
        localStorage.removeItem(filename);
    }
}

function getHistory(filename, consoleLog=true) {
    if (localStorage.getItem(filename)) {
        let tempLine = localStorage.getItem(filename);
        try {
            tempLine = parseInt(tempLine) || 0;
        } catch (error) {
            tempLine = 0;
        }
        if (consoleLog) {
            console.log(`History of "${filename}" found! Go to line: ${tempLine}`);
        }
        let success = gotoLine(tempLine, false);
        if (success === -1) {
            tempLine = 0;
        }
        return tempLine;
    }
    return 0;
}

function setProgressText(filename, progressText) {
    localStorage.setItem(filename + "_progressText", progressText);
}

function getProgressText(filename, consoleLog=true) {
    if (localStorage.getItem(filename + "_progressText")) {
        let tempText = localStorage.getItem(filename + "_progressText");
        if (consoleLog) {
            console.log(`Progress of "${filename}" found! Progress: ${tempText}`);
        }
        return tempText;
    }
    return "";
}

function setBookLastReadTimestamp(filename) {
    // save current timestamp in UTC to localStorage
    let now = new Date();
    localStorage.setItem(`${filename}_lastopened`, Date.UTC(now.getFullYear(),now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()));
}

function getBookLastReadTimestamp(filename) {
    if (localStorage.getItem(`${filename}_lastopened`)) {
        return localStorage.getItem(`${filename}_lastopened`);
    }
    return "";
}

function convertUTCTimestampToLocalString(utcTimestamp) {
    return new Date(parseInt(utcTimestamp) + new Date().getTimezoneOffset() * 60000).toLocaleString();
}

function setIsOnServer(filename, isOnserver) {
    let final_isOnServer = isOnserver || false;
    localStorage.setItem(`${filename}_isOnServer`, final_isOnServer);
}

function getIsOnServer(filename) {
    if (localStorage.getItem(`${filename}_isOnServer`)) {
        return localStorage.getItem(`${filename}_isOnServer`).toLowerCase() === "true";
    }
    return false;
}

function setIsFromLocal(filename, isFromLocal) {
    let final_isFromLocal = isFromLocal || false;
    localStorage.setItem(`${filename}_isFromLocal`, final_isFromLocal);
}

function getIsFromLocal(filename) {
    if (localStorage.getItem(`${filename}_isFromLocal`)) {
        return localStorage.getItem(`${filename}_isFromLocal`).toLowerCase() === "true";
    }
    return false;
}

function removeAllHistory() {
    localStorage.clear();
}

// Credit: https://stackoverflow.com/questions/46382109/limit-the-number-of-visible-pages-in-pagination
// Returns an array of maxLength (or less) page numbers
// where a 0 in the returned array denotes a gap in the series.
// Parameters:
//   totalPages:     total number of pages
//   page:           current page
//   maxLength:      maximum size of returned array
function getPageList(totalPages, page, maxLength) {
    if (maxLength < 5) throw "maxLength must be at least 5";

    function range(start, end) {
        return Array.from(Array(end - start + 1), (_, i) => i + start); 
    }

    var sideWidth = maxLength < 9 ? 1 : 2;
    var leftWidth = (maxLength - sideWidth*2 - 3) >> 1;
    var rightWidth = (maxLength - sideWidth*2 - 2) >> 1;
    if (totalPages <= maxLength) {
        // no breaks in list
        return range(1, totalPages);
    }
    if (page <= maxLength - sideWidth - 1 - rightWidth) {
        // no break on left of page
        return range(1, maxLength - sideWidth - 1)
            .concat(0, range(totalPages - sideWidth + 1, totalPages));
    }
    if (page >= totalPages - sideWidth - 1 - rightWidth) {
        // no break on right of page
        return range(1, sideWidth)
            .concat(0, range(totalPages - sideWidth - 1 - rightWidth - leftWidth, totalPages));
    }
    // Breaks on both sides
    return range(1, sideWidth)
        .concat(0, range(page - leftWidth, page + rightWidth),
                0, range(totalPages - sideWidth + 1, totalPages));
}

// Credit: https://www.javascripttutorial.net/dom/css/check-if-an-element-is-visible-in-the-viewport/
function isInViewport(el) {
    try {
        const rect = el.getBoundingClientRect();
        return (
            rect.bottom >= 0 &&
            rect.top <= (window.innerHeight || document.documentElement.clientHeight)
        );
    } catch (error) {
        return false;
    }
}

function isInContainerViewport(container, el, margin=0) {
    try {
        const containerRect = container.getBoundingClientRect();
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= (containerRect.top + margin) &&
            rect.bottom <= (containerRect.bottom - margin)
        );
    } catch (error) {
        return false;
    }
}

// Credit: https://stackoverflow.com/questions/10463518/converting-em-to-px-in-javascript-and-getting-default-font-size
function getSize(size='1em', parent=document.body) {
    let l = document.createElement('div');
    l.style.visibility = 'hidden';
    l.style.boxSize = 'content-box';
    l.style.position = 'absolute';
    l.style.maxHeight = 'none';
    l.style.height = size;
    parent.appendChild(l);
    size = l.clientHeight;
    l.remove();
    return size;
}

function getSizePrecise(size='1em', parent=document.body) {
    if (isVariableDefined(parent)) {
        let l = document.createElement('div'), i = 1, s, t;
        l.style.visibility = 'hidden';
        l.style.boxSize = 'content-box';
        l.style.position = 'absolute';
        l.style.maxHeight = 'none';
        l.style.height = size;
        parent.appendChild(l);
        t = l.clientHeight;
        do {
            if (t > 1789569.6) {
                break;
            }
            s = t;
            i *= 10;
            l.style.height = `calc(${i}*${size})`;
            t = l.clientHeight;
        } while(t !== s * 10);
        l.remove();
        return t / i;
    } else {
        return -1;
    }
}

function randomFloatFromInterval(min, max) {
    return (Math.random() * (max - min) + min);
}

function isVariableDefined(v) {
    return (v !== "undefined" && v !== "" && v !== null && v !== undefined && v !== NaN);
}

function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstElementChild;
}

function setUIMode(mode) {
    console.log(`UI mode set to ${(mode ? "light" : "dark")}.`);
    localStorage.setItem("UIMode", mode);
    style.ui_Mode = (mode ? "light" : "dark");
    loadSettings();
    applySettings();
    document.documentElement.setAttribute("data-theme", (mode ? "light" : "dark"));

    // Update book covers
    if (typeof bookshelf !== "undefined" && isVariableDefined(bookshelf)) {
        bookshelf.updateAllBookCovers();
    }
}

function getUIMode() {
    if (isVariableDefined(localStorage.getItem("UIMode"))) {
        let mode = JSON.parse(localStorage.getItem("UIMode"));
        console.log(`UI mode is ${(mode ? "light" : "dark")}.`);
        return mode;
    } else {
        console.log("UI mode is light by default.");
        return true;
    }
}

function hexToRGB(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => {
        return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? [
              parseInt(result[1], 16),
              parseInt(result[2], 16),
              parseInt(result[3], 16),
          ]
        : null;
}

function hexToHSL(H, lightness_percent=1) {
    // Convert hex to RGB first
    let r = 0, g = 0, b = 0;
    if (H.length == 4) {
      r = "0x" + H[1] + H[1];
      g = "0x" + H[2] + H[2];
      b = "0x" + H[3] + H[3];
    } else if (H.length == 7) {
      r = "0x" + H[1] + H[2];
      g = "0x" + H[3] + H[4];
      b = "0x" + H[5] + H[6];
    }
    // Then to HSL
    r /= 255;
    g /= 255;
    b /= 255;
    let cmin = Math.min(r,g,b),
        cmax = Math.max(r,g,b),
        delta = cmax - cmin,
        h = 0,
        s = 0,
        l = 0;
  
    if (delta == 0)
      h = 0;
    else if (cmax == r)
      h = ((g - b) / delta) % 6;
    else if (cmax == g)
      h = (b - r) / delta + 2;
    else
      h = (r - g) / delta + 4;
  
    h = Math.round(h * 60);
  
    if (h < 0)
      h += 360;
  
    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    l = Math.min(l * lightness_percent, 100).toFixed(1);
  
    // return "hsl(" + h + "," + s + "%," + l + "%)";
    return [h, s, l];
}

function HSLToHex(h,s,l) {
    s /= 100;
    l /= 100;
  
    let c = (1 - Math.abs(2 * l - 1)) * s,
        x = c * (1 - Math.abs((h / 60) % 2 - 1)),
        m = l - c/2,
        r = 0,
        g = 0, 
        b = 0; 
  
    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }
    // Having obtained RGB, convert channels to hex
    r = Math.round((r + m) * 255).toString(16);
    g = Math.round((g + m) * 255).toString(16);
    b = Math.round((b + m) * 255).toString(16);
  
    // Prepend 0s, if necessary
    if (r.length == 1)
      r = "0" + r;
    if (g.length == 1)
      g = "0" + g;
    if (b.length == 1)
      b = "0" + b;
  
    return "#" + r + g + b;
}

// Credit: https://github.com/PimpTrizkit/PJs/wiki/12.-Shade,-Blend-and-Convert-a-Web-Color-(pSBC.js)#stackoverflow-archive-begin
// Version 4.1
const pSBC=(p,c0,c1,l)=>{
	let r,g,b,P,f,t,h,m=Math.round,a=typeof(c1)=="string";
	if(typeof(p)!="number"||p<-1||p>1||typeof(c0)!="string"||(c0[0]!='r'&&c0[0]!='#')||(c1&&!a))return null;
	h=c0.length>9,h=a?c1.length>9?true:c1=="c"?!h:false:h,f=pSBC.pSBCr(c0),P=p<0,t=c1&&c1!="c"?pSBC.pSBCr(c1):P?{r:0,g:0,b:0,a:-1}:{r:255,g:255,b:255,a:-1},p=P?p*-1:p,P=1-p;
	if(!f||!t)return null;
	if(l)r=m(P*f.r+p*t.r),g=m(P*f.g+p*t.g),b=m(P*f.b+p*t.b);
	else r=m((P*f.r**2+p*t.r**2)**0.5),g=m((P*f.g**2+p*t.g**2)**0.5),b=m((P*f.b**2+p*t.b**2)**0.5);
	a=f.a,t=t.a,f=a>=0||t>=0,a=f?a<0?t:t<0?a:a*P+t*p:0;
	if(h)return"rgb"+(f?"a(":"(")+r+","+g+","+b+(f?","+m(a*1000)/1000:"")+")";
	else return"#"+(4294967296+r*16777216+g*65536+b*256+(f?m(a*255):0)).toString(16).slice(1,f?undefined:-2)
}

pSBC.pSBCr=(d)=>{
	const i=parseInt;
	let n=d.length,x={};
	if(n>9){
		const [r, g, b, a] = (d = d.split(','));
	        n = d.length;
		if(n<3||n>4)return null;
		x.r=i(r[3]=="a"?r.slice(5):r.slice(4)),x.g=i(g),x.b=i(b),x.a=a?parseFloat(a):-1
	}else{
		if(n==8||n==6||n<4)return null;
		if(n<6)d="#"+d[1]+d[1]+d[2]+d[2]+d[3]+d[3]+(n>4?d[4]+d[4]:"");
		d=i(d.slice(1),16);
		if(n==9||n==5)x.r=d>>24&255,x.g=d>>16&255,x.b=d>>8&255,x.a=Math.round((d&255)/0.255)/1000;
		else x.r=d>>16,x.g=d>>8&255,x.b=d&255,x.a=-1
	}return x
};

function invertColor(hex, bw, alpha=1) {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
    }
    var r = parseInt(hex.slice(0, 2), 16),
        g = parseInt(hex.slice(2, 4), 16),
        b = parseInt(hex.slice(4, 6), 16);
    if (bw) {
        // https://stackoverflow.com/a/3943023/112731
        return (r * 0.299 + g * 0.587 + b * 0.114) > 186
            ? '#000000'
            : '#FFFFFF';
    }
    // invert color components
    r = (255 - r).toString(16);
    g = (255 - g).toString(16);
    b = (255 - b).toString(16);

    // add transparency
    a = 'FF';
    if (parseFloat(alpha) <= 1 && parseFloat(alpha) >= 0) {
        a = Math.round(Math.min(Math.max(parseFloat(alpha) || 1, 0), 1) * 255).toString(16);
    }

    // pad each with zeros and return
    return "#" + padZero(r) + padZero(g) + padZero(b) + padZero(a);
}

function padZero(str, len) {
    len = len || 2;
    var zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
}

function simulateClick(elem) {
    var event = new MouseEvent('click', {
      'view': window,
      'bubbles': true,
      'cancelable': true
    });
    console.log('simulateClick');
    return elem.dispatchEvent(event);
}

function formatBytes_simple(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';

    const k = 1000;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatBytes(pBytes, pUnits = 'si') {
    // pBytes: the size in bytes to be converted.
    // pUnits: 'si'|'iec' si units means the order of magnitude is 10^3, iec uses 2^10

    // Handle some special cases
    if(pBytes == 0) return '0 Bytes';
    if(pBytes == 1) return '1 Byte';
    if(pBytes == -1) return '-1 Byte';

    var bytes = Math.abs(pBytes)
    if(pUnits && pUnits.toLowerCase() && pUnits.toLowerCase() == 'si') {
        // SI units use the Metric representation based on 10^3 as a order of magnitude
        var orderOfMagnitude = Math.pow(10, 3);
        var abbreviations = ['Bytes', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    } else {
        // IEC units use 2^10 as an order of magnitude
        var orderOfMagnitude = Math.pow(2, 10);
        var abbreviations = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    }
    var i = Math.floor(Math.log(bytes) / Math.log(orderOfMagnitude));
    var result = (bytes / Math.pow(orderOfMagnitude, i));

    // This will get the sign right
    if(pBytes < 0) {
        result *= -1;
    }

    // This bit here is purely for show. it drops the percision on numbers greater than 100 before the units.
    // it also always shows the full number of bytes if bytes is the unit.
    if(result >= 99.995 || i==0) {
        return result.toFixed(0) + ' ' + abbreviations[i];
    } else {
        return result.toFixed(2) + ' ' + abbreviations[i];
    }
}

// Credit: https://stackoverflow.com/questions/14334740/missing-parentheses-with-regex
function checkBalancedBrackets(str) {
    var s;
    str = str.replace( /[^{}[\]()（）《》「」『』﹁﹂﹃﹄【】]/g, '' );
    while ( s != str ) { 
        s = str;
        str = str.replace( /{}|\[]|\(\)|（）|《》|「」|『』|﹁﹂|﹃﹄|【】/g, '' )
    }
    return [!str, str];
}

// Credit: https://stackoverflow.com/questions/30771362/check-if-string-contains-the-substrings-sequence-of-characters-in-order-but-no
function getFirstUnbalancedBracketIndex(orig_str, unbalanced_brackets_str) {
    // Keep track of our position in the orig_str.
    let index = 0;
    let indices = [];

    // Iterate through all of the characters in the unbalanced_brackets_str.
    for (const character of unbalanced_brackets_str) {
        // Find the current character starting from the last character we stopped on.
        index = orig_str.indexOf(character, index+1);
        indices.push(index);
        // If the method returned -1, the character was not found, so the result is false.
        if (index === -1) {
            return -1;
        }
    }

    // If we reach this point, that means all characters were found, so the result is true.
    return indices[0];
}

function ignoreContentFromUnbalancedBracketIndex(orig_str) {
    const res = checkBalancedBrackets(orig_str);
    if (!res[0]) {
        const idx = getFirstUnbalancedBracketIndex(orig_str, res[1]);
        if (idx !== -1) {
            return orig_str.slice(0, idx);
        } else {
            return orig_str;
        }
    } else {
        return orig_str;
    }
}

function isEllipsisActive($jQueryObject, tolerance=1) {
    return ($jQueryObject.outerWidth() + tolerance < $jQueryObject[0].scrollWidth);
}

async function URLToFileObject(url, filename) {
    const response = await fetch(url);
    const data = await response.blob();
    return new File([data], filename, { type: data.type });
}