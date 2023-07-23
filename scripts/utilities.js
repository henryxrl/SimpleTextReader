function setHistory(filename, lineNumber) {
    // console.log("History set to line: ", lineNumber);
    localStorage.setItem(filename, lineNumber);
    if (lineNumber === 0) {
        // Don't save history if line number is 0
        localStorage.removeItem(filename);
    }
}

function getHistory(filename) {
    if (localStorage.getItem(filename)) {
        let tempLine = localStorage.getItem(filename);
        try {
            tempLine = parseInt(tempLine) || 0;
        } catch (error) {
            tempLine = 0;
        }
        console.log("History found! Go to line: ", tempLine);
        gotoLine(tempLine, false);
        return tempLine;
    }
    return 0;
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