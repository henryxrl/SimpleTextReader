/**
 * @fileoverview TextProcessorDOM module for handling DOM-related text processing tasks.
 * This class is designed to run in the main thread and perform all UI-related processing,
 * using data provided by TextProcessorCore.
 *
 * @module client/app/modules/text/text-processor-dom
 * @requires client/app/config/variables-dom
 * @requires client/app/modules/features/reader
 */

import * as CONFIG_DOM from "../../config/variables-dom.js";
import { reader } from "../features/reader.js";

/**
 * @class TextProcessorDOM
 * @description Class for creating DOM elements from text processing structures.
 */
export class TextProcessorDOM {
    /**
     * Create DOM element from structure
     * @param {Object} structure - The structure object containing type, tag, content, lineNumber, elementType, dropCap, and className.
     * @returns {Array} An array containing the created DOM element and its type.
     * @public
     */
    static createFromStructure(structure) {
        const { type, tag, content, lineNumber, elementType, dropCap, className } = structure;

        switch (type) {
            case "title": {
                const wrapper = document.createElement("div");
                wrapper.innerHTML = content;
                const tempElement = wrapper.firstElementChild;
                const tempAnchor = document.createElement("a");
                tempAnchor.href = `#line${lineNumber}`;
                tempAnchor.classList.add("prevent-select", "title");
                tempAnchor.innerHTML = tempElement.innerHTML;
                this.#addTitleClickHandler(tempAnchor);
                tempElement.innerHTML = "";
                tempElement.appendChild(tempAnchor);
                return [tempElement, elementType];
            }

            case "heading": {
                const tempAnchor = document.createElement("a");
                tempAnchor.href = `#line${lineNumber}`;
                tempAnchor.classList.add("prevent-select", "title");
                tempAnchor.innerHTML = content.replace(":", "").replace("：", "");
                this.#addTitleClickHandler(tempAnchor);
                const tempH2 = document.createElement("h2");
                tempH2.id = `line${lineNumber}`;
                tempH2.appendChild(tempAnchor);
                return [tempH2, elementType];
            }

            case "paragraph": {
                const tempP = document.createElement("p");
                tempP.id = `line${lineNumber}`;
                if (className) {
                    tempP.classList.add(className);
                }

                if (dropCap) {
                    const tempSpan = document.createElement("span");
                    tempSpan.classList.add("dropCap");
                    tempSpan.innerText = dropCap.content;
                    tempP.appendChild(tempSpan);
                    tempP.innerHTML += content;
                } else {
                    tempP.innerHTML = content;
                }
                return [tempP, elementType];
            }

            case "empty":
            default: {
                const tempSpan = document.createElement("span");
                tempSpan.id = `line${lineNumber}`;
                tempSpan.innerHTML = content;
                return [tempSpan, elementType];
            }
        }
    }

    /**
     * Add click handler to title anchor
     * @param {HTMLAnchorElement} anchor - The anchor element to add the click handler to.
     * @private
     */
    static #addTitleClickHandler(anchor) {
        anchor.addEventListener("click", function (e) {
            e.preventDefault();
            const lineID = parseInt(this.parentElement.id.slice(4));
            reader.gotoLine(lineID);
            const line = CONFIG_DOM.DOM_ELEMENT.GET_LINE(lineID);
            const top = line.offsetTop;
            const style = line.currentStyle || window.getComputedStyle(line);
            const top_margin = parseFloat(style.marginTop);
            window.scrollTo(0, top - top_margin, {
                behavior: "instant",
            });
        });
    }
}
