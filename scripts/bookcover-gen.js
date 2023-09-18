"use strict";

function generateCover(settings, ctx) {
    /* 
   Style Variables
  */
    var lineHeightMultiplier = 1.5;

    var rect1Height = settings.height * (1 - settings.bottomRectHeightRatio);
    var rect2Height = settings.height * settings.bottomRectHeightRatio;
    // console.log(rect1Height, rect2Height);

    var textWidth = settings.width - 2 * settings.padding;
    var textHeightRect1 = rect1Height - 2 * settings.padding;
    var textHeightRect2 = rect2Height - 2 * settings.padding;
    // console.log(textWidth, textHeightRect1, textHeightRect2);

    var coverStyle = {
        background: [
            {
                rect: `0, 0, ${settings.width}, ${settings.width}`,
                color: settings.coverColor1,
            },
            {
                rect: `0, ${rect1Height}, ${settings.width}, ${rect2Height}`,
                color: settings.coverColor2,
            },
        ],
        text: [
            {
                color: settings.textColor1,
                font: `0px ${settings.font1}`,
                pos: `${settings.width / 2}, ${rect1Height / 2 + 5}`,
                text: settings.bookTitle,
            },
            {
                color: settings.textColor2,
                font: `0px ${settings.font2}`,
                pos: `${settings.width / 2}, ${rect1Height + rect2Height / 2}`,
                text: settings.authorName,
            },
        ],
    };

    generate();

    /* 
   Main functions 
  */
    function drawBackground(data) {
        var r = parseRect(data.rect);
        
        var grV = ctx.createLinearGradient(0, 0, 10, 0);
        grV.addColorStop(0, data.color);
        grV.addColorStop(0.14, '#aeb0b5');
        grV.addColorStop(0.24,  '#7b7e87');
        grV.addColorStop(0.33,  data.color);
        grV.addColorStop(0.76,  '#7b7e87');
        grV.addColorStop(0.81,  '#63656b');
        grV.addColorStop(1,  data.color);

        ctx.fillStyle = grV;
        // ctx.fillStyle = data.color;      // uncomment to disable gradient on book covers
        ctx.fillRect(r.x, r.y, r.w, r.h);
    }

    function drawText(data, textHeight) {
        if (data.text.trim() === "") {
            // console.log("No text to draw");
            return;
        }

        var res = getFontSize(
            data.text.trim(),
            data.font,
            lineHeightMultiplier,
            textWidth,
            textHeight * 1
        ); // 0.8 limits the max height of the text to 80% of the rect height
        var finalFontSize = res[1];
        // console.log("final size: " + finalFontSize);
        // console.log(ctx.font);

        var pos = parsePos(data.pos);
        ctx.fillStyle = data.color;
        ctx.font = data.font;
        const match = /(?<value>\d+\.?\d*)/;
        ctx.font = ctx.font.replace(match, finalFontSize);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // console.log(ctx.font);

        // var res = fittingString(ctx, data.text, textWidth);
        printLines(
            ctx,
            res[0],
            pos.x,
            pos.y,
            finalFontSize * lineHeightMultiplier
        );
    }

    function drawAll(data) {
        var background = data.background || [];
        background.forEach((v) => drawBackground(v));
        var text = data.text || [];
        drawText(text[0], textHeightRect1); // Draw book title
        drawText(text[1], textHeightRect2); // Draw author name
    }

    function generate() {
        ctx.clearRect(0, 0, settings.width, settings.height);
        try {
            if (settings.authorName.trim() === "") {
                // console.log("No author name");
                coverStyle.background[1].color = coverStyle.background[0].color;
                rect1Height += rect2Height;
                textHeightRect1 = rect1Height - 2 * settings.padding;
                coverStyle.text[0].pos = `${settings.width / 2}, ${
                    rect1Height / 2
                }`;
            }
            var json = JSON.parse(JSON.stringify(coverStyle));
            drawAll(json);
        } catch (e) {
            console.log("Can not parse style JSON");
        }
    }

    /* 
   Helper functions 
  */
    function parsePos(str) {
        var array = str.split(",");
        return {
            x: parseInt(array[0].trim(), 10),
            y: parseInt(array[1].trim(), 10),
        };
    }

    function parseRect(str) {
        var array = str.split(",");
        return {
            x: parseInt(array[0].trim(), 10),
            y: parseInt(array[1].trim(), 10),
            w: parseInt(array[2].trim(), 10),
            h: parseInt(array[3].trim(), 10),
        };
    }

    function getFontSize(str, font, lineHeightMultiplier, maxWidth, maxHeight) {
        if (getLanguage(str)) {
            // is Eastern language
            str = str.replace(/ /g, "");
        }

        const match = /(?<value>\d+\.?\d*)/;
        const fontSizeIncrement = 5;

        var fontSize = Math.max(parseInt(maxHeight / 10) || 10, 10);
        ctx.font = font.replace(match, fontSize);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // console.log(font, ctx.font);
        var width = 0;
        var height = 0;
        var savedLines = [];
        var savedFontSizes = [];
        var countLimit = 50;
        var count = 0;
        var contineTrying = true;
        while (height < maxHeight && contineTrying) {
            count++;
            fontSize = parseFloat(ctx.font) + fontSizeIncrement;
            savedFontSizes.push(fontSize);
            if (savedFontSizes.length > 2) {
                savedFontSizes.shift();
            }
            ctx.font = ctx.font.replace(match, fontSize);
            var res = fittingString(ctx, str, maxWidth);
            width = res[1];
            contineTrying = ((width <= maxWidth) || (height <= maxHeight / 4));
            height = fontSize * (res[0].length + (res[0].length - 1) * (lineHeightMultiplier - 1));
            // console.log(`fontSize: ${fontSize}; height: ${height}; maxHeight: ${maxHeight}; width: ${width}; maxWidth: ${maxWidth}`);
            savedLines.push(res[0]);
            if (savedLines.length > 2) {
                savedLines.shift();
            }
            // console.log(savedLines[0]);

            if (count > countLimit) {
                break;
            }
        }

        // console.log(`result: ${savedLines[0]}; ${savedFontSizes[0]}`);
        return [savedLines[0], savedFontSizes[0]];
    }

    function fittingString(c, str, maxWidth) {
        var width = c.measureText(str).width;
        // console.log(`width: ${c.measureText(str).width}; maxWidth: ${maxWidth}`);
        var ellipsis = "…";
        var ellipsisWidth = c.measureText(ellipsis).width;
        // console.log(c.measureText(ellipsis));

        var strs = [];
        if (width <= maxWidth || width <= ellipsisWidth) {
            return [[str], width];
        } else {
            // console.log("splitting string");
            var savedWidths = [];
            var texts = str.split(" ");
            if (texts.length <= 1) {
                // console.log("no space");
                const numCharLowerBound = 3; // if the string is longer than this, we will try to split it
                var idx = 0;
                if (str.length > numCharLowerBound) {
                    for (var i = 1; i <= str.length; i++) {
                        var s = str.substring(idx, i).trim();
                        // console.log(s);
                        while (!isNaN(s.slice(-1))) {
                            // console.log("last character is number, expand.");
                            i++;
                            if (i > str.length) {
                                i = str.length;
                                s = str.substring(idx, i).trim();
                                break;
                            }
                            s = str.substring(idx, i).trim();
                            // console.log(s);
                        }
                        if (regex_isPunctuation.test(str.substring(i, i + 1).trim())) {
                            // console.log("next character is punctuation");
                            i += 2;
                            if (i > str.length)
                                i = str.length;
                            s = str.substring(idx, i).trim();
                            // console.log(s);
                        }
                        var w = c.measureText(s).width;
                        // console.log([s, w]);
                        if (w >= maxWidth) {
                            i--;
                            if (i < 1) {
                                i = 1;
                                idx = 0;
                            }
                            strs.push(str.substring(idx, i).trim());
                            savedWidths.push(
                                c.measureText(str.substring(idx, i).trim())
                                    .width
                            );
                            idx = i;
                            // console.log('[151] ', strs, savedWidths, i, idx);
                        }
                    }
                }
                if (idx < str.length) {
                    strs.push(str.substring(idx));
                    savedWidths.push(c.measureText(str.substring(idx)).width);
                    // console.log('[158] ', strs, savedWidths);
                }
            } else {
                // console.log("has spaces");
                for (var i = 0; i < texts.length; i++) {
                    var s = texts
                        .slice(0, i + 1)
                        .join(" ")
                        .trim();
                    var w = c.measureText(s).width;
                    if (w >= maxWidth) {
                        i--;
                        if (i < 0) {
                            i = 0;
                        }
                        strs.push(texts.slice(0, i + 1).join(" "));
                        savedWidths.push(
                            c.measureText(texts.slice(0, i + 1).join(" ")).width
                        );
                        texts = texts.splice(i + 1);
                        i = 0;
                    }
                }
                if (texts.length > 0) {
                    strs.push(texts.join(" "));
                    savedWidths.push(c.measureText(texts.join(" ")).width);
                }
            }

            // console.log('[179] ', [strs, savedWidths, Math.max(...savedWidths)]);
            return [strs, Math.max(...savedWidths)];
        }
    }

    function printLines(context, lines, x, y, lineHeight) {
        // calculate y value for middle centering
        y = y - (lineHeight * (lines.length - 1)) / 2;

        for (var i = 0; i < lines.length; i++) {
            context.fillText(lines[i], x, y + lineHeight * i);
        }
    }

    function createContext(width, height) {
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas.getContext("2d");
    }
}

// var canvas, ctx;
// canvas = document.getElementById('canvas');
// ctx = canvas.getContext('2d');

// var coverSettings = {
//   "width": canvas.getAttribute("width"),
//   "height": canvas.getAttribute("height"),
//   "padding": canvas.getAttribute("width") / 10,
//   "bottomRectHeightRatio": 0.275,
//   "coverColor1": "#30DACC",
//   "font1": "HiraKakuProN-W6",
//   "font2": "HiraKakuProN-W3",
//   "coverColor2": "#176D60",
//   "textColor1": "#FFF",
//   "textColor2": "#FFF",
//   "bookTitle": "唐",
//   "authorName": "三",
// };

// generateCover(coverSettings, ctx);
