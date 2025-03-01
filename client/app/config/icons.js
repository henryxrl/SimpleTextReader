/**
 * @fileoverview This file defines a set of SVG icons and provides utility functions to generate and use SVG sprites.
 * It includes pre-configured SVG definitions and a method to create an SVG sprite for easy referencing in HTML.
 *
 * The SVG icons are defined as constants and can be used either as inline SVGs or referenced via `<use>` elements in HTML.
 * This approach ensures flexibility and reduces redundancy by allowing icons to be reused efficiently.
 *
 * Usage:
 * 1. Generate an SVG sprite using `createSvgSprite()` and append it to your document.
 * 2. Reference icons using `<use>` tags with the corresponding icon ID.
 *
 * @module client/app/config/icons
 */

/**
 * Definitions for various SVG icons, including their attributes and paths. Defined to be used in SVG sprite.
 * @private
 * @constant {Object} SVG_DEFS
 * @property {Object} SVG_DEFS.SUN - The "sun" icon definition.
 * @property {Object} SVG_DEFS.MOON - The "moon" icon definition.
 */
const SVG_DEFS = {
    SUN: {
        id: "icon-sun",
        viewBox: "0 0 24 24",
        class: "icon sun",
        attrs: {
            style: "fill: var(--icon-fill); stroke: var(--icon-stroke)",
            version: "1.1",
        },
        content: `<path class="tofill"
                        d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5001M17.6859 17.69L18.5 18.5001M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />`,
    },
    MOON: {
        id: "icon-moon",
        viewBox: "0 0 24 24",
        class: "icon moon",
        attrs: {
            style: "fill: var(--icon-fill); stroke: var(--icon-stroke)",
            version: "1.1",
        },
        content: `<path class="tofill"
                        d="M3.32031 11.6835C3.32031 16.6541 7.34975 20.6835 12.3203 20.6835C16.1075 20.6835 19.3483 18.3443 20.6768 15.032C19.6402 15.4486 18.5059 15.6834 17.3203 15.6834C12.3497 15.6834 8.32031 11.654 8.32031 6.68342C8.32031 5.50338 8.55165 4.36259 8.96453 3.32996C5.65605 4.66028 3.32031 7.89912 3.32031 11.6835Z"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />`,
    },
};

/**
 * Definitions for various SVG icons, including their attributes and paths.
 * @public
 * @constant {Object} ICONS
 * @property {string} ICONS.SUN - The "sun" icon definition.
 * @property {string} ICONS.MOON - The "moon" icon definition.
 * @property {string} ICONS.SETTINGS - The "settings" icon definition.
 * @property {string} ICONS.FINISHED - The "finished" icon definition.
 * @property {string} ICONS.FINISHED_BADGE_OLD - The "finished badge old" icon definition.
 * @property {string} ICONS.FINISHED_BADGE - The "finished badge" icon definition.
 * @property {string} ICONS.NEWBOOK_RIBBON - The "newbook ribbon" icon definition.
 * @property {string} ICONS.BOOK_IS_ON_SERVER - The "book is on server" icon definition.
 * @property {string} ICONS.DELETE_BOOK - The "delete book" icon definition.
 * @property {string} ICONS.DELETE_ALL_BOOKS - The "delete all books" icon definition.
 * @property {string} ICONS.BOOKLIST_SCROLL_TOP - The "booklist scroll top" icon definition.
 * @property {string} ICONS.BOOKLIST_SCROLL_BOTTOM - The "booklist scroll bottom" icon definition.
 * @property {string} ICONS.BOOKSHELF - The "bookshelf" icon definition.
 * @property {string} ICONS.WRONG_FILE_TYPE - The "wrong file type" icon definition.
 * @property {string} ICONS.FONT_FILE - The "font file" icon definition.
 * @property {string} ICONS.FONT_FILE_INVALID - The "font file invalid" icon definition.
 * @property {string} ICONS.ERROR - The "error" icon definition.
 * @property {string} ICONS.BOOK - The "book" icon definition.
 */
export const ICONS = {
    SUN: `<svg version="1.1" class="icon sun" viewBox="0 0 24 24" style="fill: none"><use href="#icon-sun"/></svg>`,
    MOON: `<svg version="1.1" class="icon moon" viewBox="0 0 24 24" style="fill: none"><use href="#icon-moon"/></svg>`,
    SETTINGS: `<svg class="icon-nofill" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path class="tofill" fill-rule="evenodd" clip-rule="evenodd" d="M11.567 9.8895C12.2495 8.90124 12.114 7.5637 11.247 6.7325C10.3679 5.88806 9.02339 5.75928 7.99998 6.4215C7.57983 6.69308 7.25013 7.0837 7.05298 7.5435C6.85867 7.99881 6.80774 8.50252 6.90698 8.9875C7.00665 9.47472 7.25054 9.92071 7.60698 10.2675C7.97021 10.6186 8.42786 10.8563 8.92398 10.9515C9.42353 11.049 9.94062 11.0001 10.413 10.8105C10.8798 10.6237 11.2812 10.3033 11.567 9.8895Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path class="tofill" fill-rule="evenodd" clip-rule="evenodd" d="M12.433 17.8895C11.7504 16.9012 11.886 15.5637 12.753 14.7325C13.6321 13.8881 14.9766 13.7593 16 14.4215C16.4202 14.6931 16.7498 15.0837 16.947 15.5435C17.1413 15.9988 17.1922 16.5025 17.093 16.9875C16.9933 17.4747 16.7494 17.9207 16.393 18.2675C16.0298 18.6186 15.5721 18.8563 15.076 18.9515C14.5773 19.0481 14.0614 18.9988 13.59 18.8095C13.1222 18.6234 12.7197 18.3034 12.433 17.8895V17.8895Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path class="tofill" d="M12 7.75049C11.5858 7.75049 11.25 8.08627 11.25 8.50049C11.25 8.9147 11.5858 9.25049 12 9.25049V7.75049ZM19 9.25049C19.4142 9.25049 19.75 8.9147 19.75 8.50049C19.75 8.08627 19.4142 7.75049 19 7.75049V9.25049ZM6.857 9.25049C7.27121 9.25049 7.607 8.9147 7.607 8.50049C7.607 8.08627 7.27121 7.75049 6.857 7.75049V9.25049ZM5 7.75049C4.58579 7.75049 4.25 8.08627 4.25 8.50049C4.25 8.9147 4.58579 9.25049 5 9.25049V7.75049ZM12 17.2505C12.4142 17.2505 12.75 16.9147 12.75 16.5005C12.75 16.0863 12.4142 15.7505 12 15.7505V17.2505ZM5 15.7505C4.58579 15.7505 4.25 16.0863 4.25 16.5005C4.25 16.9147 4.58579 17.2505 5 17.2505V15.7505ZM17.143 15.7505C16.7288 15.7505 16.393 16.0863 16.393 16.5005C16.393 16.9147 16.7288 17.2505 17.143 17.2505V15.7505ZM19 17.2505C19.4142 17.2505 19.75 16.9147 19.75 16.5005C19.75 16.0863 19.4142 15.7505 19 15.7505V17.2505ZM12 9.25049H19V7.75049H12V9.25049ZM6.857 7.75049H5V9.25049H6.857V7.75049ZM12 15.7505H5V17.2505H12V15.7505ZM17.143 17.2505H19V15.7505H17.143V17.2505Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
    FINISHED: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40">
                    <path d="M27.361,8.986a5.212,5.212,0,0,0-4.347-4.347,72.73,72.73,0,0,0-14.028,0A5.212,5.212,0,0,0,4.639,8.986a72.72,72.72,0,0,0,0,14.027,5.212,5.212,0,0,0,4.347,4.348,72.73,72.73,0,0,0,14.028,0,5.212,5.212,0,0,0,4.347-4.348A72.72,72.72,0,0,0,27.361,8.986Zm-4.194,4.083L16.2,20.922a1.5,1.5,0,0,1-1.114.5h-.008a1.5,1.5,0,0,1-1.111-.492L9.36,15.86a1.5,1.5,0,1,1,2.221-2.015l3.482,3.836,5.861-6.6a1.5,1.5,0,1,1,2.243,1.992Z"/>
                </svg>`,
    FINISHED_BADGE_OLD: `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 800" style="enable-background:new 0 0 800 800;">
                            <style type="text/css">
                                .svg-st0{fill:#FFC54D;}
                                .svg-st1{fill:#EDB24A;}
                                .svg-st2{fill:#EF4D4D;}
                                .svg-st3{fill:#EF4D4D;}
                                .svg-st4{fill:#FFF0BA;}
                            </style>
                            <circle class="svg-st0" cx="400" cy="558" r="155.3"/>
                            <circle class="svg-st1" cx="400" cy="558" r="124.7"/>
                            <path class="svg-st0" d="M400,362.7c-14.7,0-26.7,12-26.7,26.7c0,14.7,12,26.7,26.7,26.7c14.7,0,26.7-12,26.7-26.7 C426.7,374.7,414.7,362.7,400,362.7z M400,407.3c-10,0-17.3-8-17.3-17.3s8-17.3,17.3-17.3s17.3,8,17.3,17.3S410,407.3,400,407.3z"/>
                            <path class="svg-st2" d="M548,104.7v208c0,6-4,12-10.7,15.3L458,365.3l-46.7,21.3c-6.7,3.3-15.3,3.3-22,0l-46-22L264,327.3 c-6.7-3.3-10.7-9.3-10.7-15.3V104.7c0-10,10-18,22-18h251.3C538,86.7,548,94.7,548,104.7z"/>
                            <path class="svg-st3" d="M457.3,86.7v278.7l-46,21.3c-6.7,3.3-15.3,3.3-22,0l-46-22v-278H457.3z"/>
                            <path class="svg-st4" d="M406.9,467.7l22.7,45.3c1.3,2,3.3,4,5.3,4l50,7.3c6,1.3,8.7,8,4,12.7l-36,36c-1.3,1.3-2.7,4-2,6.7l8.7,50 c1.3,6-5.3,10.7-10.7,7.3l-44.7-23.3c-2-1.3-4.7-1.3-6.7,0L352.2,637c-5.3,2.7-12-1.3-10.7-7.3l8.7-50c0.7-2-0.7-4.7-2-6.7l-36-35.3 c-4-4-2-12,4-12.7l50-7.3c2-0.7,4-1.3,5.3-4l22.7-45.3C396.2,462.3,404.2,462.3,406.9,467.7z"/>
                        </svg>`,
    FINISHED_BADGE: `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
                    viewBox="0 0 800 800" style="enable-background:new 0 0 800 800;" xml:space="preserve">
                    <style type="text/css">
                    .svg-st0{fill:#FFC54D;}
                    .svg-st1{fill:#EF4D4D;}
                    .svg-st2{fill:#EF4D4D;}
                    </style>
                    <path class="svg-st0" d="M574.7,568.7l-37.3-37.3c-3.3-3.3-5.4-12.7-5.4-12.7V466c0,0-7.9-17.3-17.2-18H462c-4.7,0.7-9.3-1.3-12.7-4.6 L418,412c12.7-6.7,21.3-20,21.3-35.3c0-22-18-39.3-39.3-39.3s-39.3,18-39.3,39.3c0,15.3,8.7,28.7,21.3,35.3l-31.3,31.3 c-3.3,3.3-12.7,5.7-12.7,5.7h-52.7c-9.5,0-17.3,7.8-17.3,17.3v52.5c0,4.7-2,9.3-5.3,12.7l-37.2,37.2c-6.8,6.8-6.8,17.9,0,24.7 l37.2,37.2c3.3,3.3,5.3,8,5.3,12.7v52.5c0,9.5,7.8,17.3,17.3,17.3H338c0,0,9.3,2.3,12.7,5.6L388,756c6.7,6.7,18,6.7,24.7,0 l37.3-37.3c3.3-3.3,8-5.3,12.7-4.7h52.7c9.3-0.6,17.3-8.6,17.6-17.9v-52.7c-0.3-4.7,1.7-9.3,5-12.7l37.3-37.3 C581.3,586.7,581.3,576,574.7,568.7z M400,354c13.3,0,23.3,10.7,23.3,23.3c0,13.3-10.7,23.3-23.3,23.3c-12.7,0-23.3-10.7-23.3-23.3 S386.7,354,400,354z"/>
                    <path class="svg-st1" d="M547,98v208c0,6-4,12-10.7,15.3l-79.4,37.3l-46.7,21.3c-6.7,3.3-15.3,3.3-22,0l-46-22l-79.4-37.3 c-6.7-3.3-10.7-9.3-10.7-15.3V98c0-10,10-18,22-18h251.7C537,80,547,88,547,98z"/>
                    <path class="svg-st2" d="M457,80v278.7L411,380c-6.7,3.3-15.3,3.3-22,0l-46-22V80L457,80L457,80z"/>
                </svg>`,
    NEWBOOK_RIBBON: `<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 200 200" style="enable-background:new 0 0 200 200;">
                <style type="text/css">.svg-shadow{fill:#CC3432;}.svg-ribbon{fill:#EF4D4D;}</style>
                <g id="SVGRepo_bgCarrier"></g>
                <g id="SVGRepo_tracerCarrier"></g>
                <path class="svg-shadow" d="M199.3,90.5L109.8,0.8c-0.1,0-7.5,4.1-7.6,4.2h8.8l84,84.2V98L199.3,90.5z"/>
                    <polygon class="svg-ribbon" points="156,1 109.4,1 199,90.7 199,44.1 "/>
                </svg>`,
    BOOK_IS_ON_SERVER: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40">
                        <path d="M24.7793,25.30225H7.2207A6.02924,6.02924,0,0,1,1.84375,22.0708c-1.99856-3.83755.74946-8.94738,5.2832-8.8418a9.30623,9.30623,0,0,1,17.74121-.0249A6.04953,6.04953,0,0,1,24.7793,25.30225ZM7.25781,15.22754c-3.1607-.153-4.95556,3.33035-3.62493,5.94832a4.01435,4.01435,0,0,0,3.63079,2.12736l17.5166-.001A4.05253,4.05253,0,1,0,22.11722,16.202a1.00012,1.00012,0,0,1-1.41312-.05653c-1.00583-1.32476,1.17841-2.28273,2.15235-2.65332A7.30425,7.30425,0,0,0,8.8623,14.4779C8.70326,15.24838,7.89656,15.30989,7.25781,15.22754Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>`,
    DELETE_BOOK: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 7V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V7M6 7H5M6 7H8M18 7H19M18 7H16M10 11V16M14 11V16M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7M8 7H16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
    DELETE_ALL_BOOKS: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 10V17M8 10V17M19 9H22M19 14H22M19 19H21M16 6V16.2C16 17.8802 16 18.7202 15.673 19.362C15.3854 19.9265 14.9265 20.3854 14.362 20.673C13.7202 21 12.8802 21 11.2 21H8.8C7.11984 21 6.27976 21 5.63803 20.673C5.07354 20.3854 4.6146 19.9265 4.32698 19.362C4 18.7202 4 17.8802 4 16.2V6M2 6H18M14 6L13.7294 5.18807C13.4671 4.40125 13.3359 4.00784 13.0927 3.71698C12.8779 3.46013 12.6021 3.26132 12.2905 3.13878C11.9376 3 11.523 3 10.6936 3H9.30643C8.47705 3 8.06236 3 7.70951 3.13878C7.39792 3.26132 7.12208 3.46013 6.90729 3.71698C6.66405 4.00784 6.53292 4.40125 6.27064 5.18807L6 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>`,
    BOOKLIST_SCROLL_TOP: `<svg class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 125">
                        <path class="tofill" d="M15.1,65.7c-3.6,0-7.2-1.5-9.7-4.5C0.9,55.8,1.7,47.9,7,43.4l34.9-29.1c4.7-3.9,11.5-3.9,16.2,0L93,43.4 c5.4,4.5,6.1,12.4,1.6,17.8c-4.5,5.4-12.4,6.1-17.8,1.6L50,40.5L23.2,62.8C20.8,64.8,18,65.7,15.1,65.7z" opacity="1"/>
                        <path class="tofill" d="M15.1,113.6c-3.6,0-7.2-1.5-9.7-4.5C0.9,103.6,1.7,95.8,7,91.3l34.9-29.1c4.7-3.9,11.5-3.9,16.2,0L93,91.3 c5.4,4.5,6.1,12.4,1.6,17.8c-4.5,5.4-12.4,6.1-17.8,1.6L50,88.3l-26.8,22.3C20.8,112.6,18,113.6,15.1,113.6z" opacity="0.5"/>
                    </svg>`,
    BOOKLIST_SCROLL_BOTTOM: `<svg class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 125">
                                <path class="tofill" d="M84.9,59.3c3.6,0,7.2,1.5,9.7,4.5c4.5,5.4,3.7,13.3-1.6,17.8l-34.9,29.1c-4.7,3.9-11.5,3.9-16.2,0L7,81.6 c-5.4-4.5-6.1-12.4-1.6-17.8s12.4-6.1,17.8-1.6L50,84.5l26.8-22.3C79.2,60.2,82,59.3,84.9,59.3z" opacity="1"/>
                                <path class="tofill" d="M84.9,11.4c3.6,0,7.2,1.5,9.7,4.5c4.5,5.5,3.7,13.3-1.6,17.8L58.1,62.8c-4.7,3.9-11.5,3.9-16.2,0L7,33.7 c-5.4-4.5-6.1-12.4-1.6-17.8s12.4-6.1,17.8-1.6L50,36.7l26.8-22.3C79.2,12.4,82,11.4,84.9,11.4z" opacity="0.5"/>
                            </svg>`,
    BOOKSHELF: `<svg class="icon" viewBox="0 0 800 800" id="Flat" xmlns="http://www.w3.org/2000/svg">
                    <path class="tofill" d="M730,611.2l-129.4-483c-7.2-26.7-34.6-42.5-61.2-35.4l-96.6,25.9c-1.1,0.3-2.1,0.7-3.1,1c-9.4-12.4-24.1-19.7-39.7-19.7H300
                    c-8.8,0-17.4,2.3-25,6.8c-7.6-4.4-16.2-6.8-25-6.8H150c-27.6,0-50,22.4-50,50v500c0,27.6,22.4,50,50,50h100c8.8,0,17.4-2.3,25-6.8
                    c7.6,4.4,16.2,6.8,25,6.8h100c27.6,0,50-22.4,50-50V338.8l86.9,324.2c7.1,26.7,34.5,42.5,61.2,35.4c0,0,0,0,0,0l96.6-25.9
                    C721.3,665.2,737.2,637.8,730,611.2z M488.1,287.8l96.6-25.9l64.7,241.5l-96.6,25.9L488.1,287.8z M552.3,141.1l19.4,72.4l-96.6,25.9
                    L455.7,167L552.3,141.1z M400,150l0,375H300V150H400z M250,150v75H150v-75H250z M150,650V275h100v375H150z M400,650H300v-75h100
                    L400,650L400,650z M681.8,624.1L585.2,650l-19.4-72.4l96.6-25.9L681.8,624.1L681.8,624.1z"/>
                    <path class="tofill" d="M665.9,513.9l-122.7,32.8l-70.7-263.3l122.7-32.8L665.9,513.9z M262,262H136v400h126V262z" opacity="0.3" />
                </svg>`,
    WRONG_FILE_TYPE: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17 17L21 21M21 17L17 21M13 3H8.2C7.0799 3 6.51984 3 6.09202 3.21799C5.71569 3.40973 5.40973 3.71569 5.21799 4.09202C5 4.51984 5 5.0799 5 6.2V17.8C5 18.9201 5 19.4802 5.21799 19.908C5.40973 20.2843 5.71569 20.5903 6.09202 20.782C6.51984 21 7.0799 21 8.2 21H13M13 3L19 9M13 3V7.4C13 7.96005 13 8.24008 13.109 8.45399C13.2049 8.64215 13.3578 8.79513 13.546 8.89101C13.7599 9 14.0399 9 14.6 9H19M19 9V14M9 17H13M9 13H15M9 9H10" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
    FONT_FILE: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 18L8 6L3 18M11 14H5M21 18V15M21 15V12M21 15C21 16.6569 19.6569 18 18 18C16.3431 18 15 16.6569 15 15C15 13.3431 16.3431 12 18 12C19.6569 12 21 13.3431 21 15Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
    FONT_FILE_INVALID: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 18L8 6L3 18M11 14H5M21 18V15M21 15V12M21 15C21 16.6569 19.6569 18 18 18C16.3431 18 15 16.6569 15 15C15 13.3431 16.3431 12 18 12C19.6569 12 21 13.3431 21 15Z" 
                                stroke-width="2" 
                                stroke-linecap="round" 
                                stroke-linejoin="round"/>
                            <g transform="scale(0.5) translate(26, 1)">
                                <path d="M12 17V16.9929M12 14.8571C12 11.6429 15 12.3571 15 9.85714C15 8.27919 13.6568 7 12 7C10.6567 7 9.51961 7.84083 9.13733 9" 
                                stroke-width="2" 
                                stroke-linecap="round" 
                                stroke-linejoin="round"/>
                            </g>
                            <g transform="scale(0.5) translate(17, 1)">
                                <path d="M12 17V16.9929M12 14.8571C12 11.6429 15 12.3571 15 9.85714C15 8.27919 13.6568 7 12 7C10.6567 7 9.51961 7.84083 9.13733 9" 
                                stroke-width="2" 
                                stroke-linecap="round" 
                                stroke-linejoin="round"/>
                            </g>
                        </svg>`,
    ERROR: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 16H12.01M12 8V12M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
    BOOK: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 10.4V20M12 10.4C12 8.15979 12 7.03969 11.564 6.18404C11.1805 5.43139 10.5686 4.81947 9.81596 4.43597C8.96031 4 7.84021 4 5.6 4H4.6C4.03995 4 3.75992 4 3.54601 4.10899C3.35785 4.20487 3.20487 4.35785 3.10899 4.54601C3 4.75992 3 5.03995 3 5.6V16.4C3 16.9601 3 17.2401 3.10899 17.454C3.20487 17.6422 3.35785 17.7951 3.54601 17.891C3.75992 18 4.03995 18 4.6 18H7.54668C8.08687 18 8.35696 18 8.61814 18.0466C8.84995 18.0879 9.0761 18.1563 9.29191 18.2506C9.53504 18.3567 9.75977 18.5065 10.2092 18.8062L12 20M12 10.4C12 8.15979 12 7.03969 12.436 6.18404C12.8195 5.43139 13.4314 4.81947 14.184 4.43597C15.0397 4 16.1598 4 18.4 4H19.4C19.9601 4 20.2401 4 20.454 4.10899C20.6422 4.20487 20.7951 4.35785 20.891 4.54601C21 4.75992 21 5.03995 21 5.6V16.4C21 16.9601 21 17.2401 20.891 17.454C20.7951 17.6422 20.6422 17.7951 20.454 17.891C20.2401 18 19.9601 18 19.4 18H16.4533C15.9131 18 15.643 18 15.3819 18.0466C15.15 18.0879 14.9239 18.1563 14.7081 18.2506C14.465 18.3567 14.2402 18.5065 13.7908 18.8062L12 20" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>`,
};

/**
 * Creates an SVG sprite containing all icons defined in `SVG_DEFS`. Each icon is added as a `<symbol>` element.
 * @public
 * @returns {SVGSVGElement} A hidden `<svg>` element containing all icons as `<symbol>` elements.
 *
 * @example
 * // Append the sprite to the document for usage
 * const sprite = createSvgSprite();
 * document.body.appendChild(sprite);
 *
 * @example
 * // Use an icon in HTML
 * <svg class="icon">
 *   <use href="#icon-sun"></use>
 * </svg>
 */
export function createSvgSprite() {
    const sprite = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    sprite.style.display = "none";
    sprite.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    for (const [_, icon] of Object.entries(SVG_DEFS)) {
        const symbol = document.createElementNS("http://www.w3.org/2000/svg", "symbol");
        symbol.id = icon.id;
        symbol.setAttribute("viewBox", icon.viewBox);

        // Add class
        if (icon.class) {
            symbol.setAttribute("class", icon.class);
        }

        // Add other attributes
        if (icon.attrs) {
            for (const [attr, value] of Object.entries(icon.attrs)) {
                symbol.setAttribute(attr, value);
            }
        }

        symbol.innerHTML = icon.content;
        sprite.appendChild(symbol);
    }

    return sprite;
}
