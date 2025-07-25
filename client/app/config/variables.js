/**
 * @fileoverview Application variables management
 *
 * Defines and manages runtime variables used throughout the application.
 * Includes variables for UI state, bookshelf data, file processing,
 * content management, settings, pagination, and various status flags.
 *
 * @module client/app/config/variables
 */

/**
 * Application variables manager class
 * Maintains the state of all runtime variables used in the application
 * @private
 */
class AppVariables {
    /**
     * Initialize all application variables
     */
    constructor() {
        // Bookshelf-related variables
        /** @type {Object} Information about all books on the bookshelf */
        this.ALL_BOOKS_INFO = {};

        // File-related variables
        /** @type {string} Current filename */
        this.FILENAME = "";
        /** @type {Array} File content chunks */
        this.FILE_CONTENT_CHUNKS = [];
        /** @type {boolean} Whether the content is in East Asian language */
        this.IS_EASTERN_LAN = true;
        /** @type {string} File encoding */
        this.ENCODING = "utf-8";

        // Content-related variables
        /** @type {Array} List of all titles */
        this.ALL_TITLES = [];
        /** @type {Object} Map of all title indices */
        this.ALL_TITLES_IND = {};
        /** @type {number} Save active title line number */
        this.ACTIVE_TITLE = -1;
        /** @type {Object} Book name and author information */
        this.BOOK_AND_AUTHOR = {};
        /** @type {Array<Object>} Chronological timeline of all anchor and footnote events in the document */
        this.FOOTNOTES = [];
        /** @type {number} Counter for processed footnotes */
        this.FOOTNOTE_PROCESSED_COUNTER = 0;
        /** @type {boolean} Whether mouse is inside TOC content */
        this.IS_MOUSE_INSIDE_TOC_CONTENT = false;
        /** @type {boolean} Whether TOC is scrolling */
        this.IS_TOC_SCROLLING = false;
        /** @type {Tippy} Tippy instance */
        this.TIPPY_INSTANCE = null;

        // Settings-related variables
        /** @type {Array} Filtered font names */
        this.FILTERED_FONT_NAMES = [];
        /** @type {Array} Filtered font labels */
        this.FILTERED_FONT_LABELS = [];
        /** @type {Array} Filtered font labels in Chinese */
        this.FILTERED_FONT_LABELS_ZH = [];
        /** @type {Array} Font group types */
        this.FONT_GROUP_TYPES = [];
        /** @type {Array} Font group order */
        this.FONT_GROUP_ORDER = [];
        /** @type {Array} Font groups */
        this.FONT_GROUPS = [];
        /** @type {Array} Font groups in Chinese */
        this.FONT_GROUPS_ZH = [];
        /** @type {Object} Object of custom fonts */
        this.CUSTOM_FONTS = {};
        /** @type {boolean} Whether settings menu is shown */
        this.IS_SETTINGS_MENU_SHOWN = false;
        /** @type {Array<boolean>} Color picker open states */
        this.IS_COLOR_PICKER_OPEN = [false, false];
        /** @type {boolean} Whether the popup window is shown */
        this.IS_POPUP_WINDOW_SHOWN = false;

        // Pagination-related variables
        /** @type {number} Current page number */
        this.CURRENT_PAGE = 1;
        /** @type {number} Total number of pages */
        this.TOTAL_PAGES = 0;
        /** @type {Array} Page break points */
        this.PAGE_BREAKS = [];
        /** @type {boolean} Whether the last page only contains end page */
        this.IS_LAST_PAGE_ONLY_END_PAGE = false;

        // Status flags
        /** @type {boolean} Initialization flag */
        this.INIT = true;
        /** @type {boolean} Whether "goto title" was clicked */
        this.GOTO_TITLE_CLICKED = false;
        /** @type {number} History line number */
        this.HISTORY_LINE_NUMBER = 0;
        /** @type {number} Title page line number offset */
        this.TITLE_PAGE_LINE_NUMBER_OFFSET = 0;
        /** @type {boolean} Whether processing is ongoing */
        this.IS_PROCESSING = false;
        /** @type {boolean} Whether book is opened */
        this.IS_BOOK_OPENED = false;
        /** @type {boolean} Whether settings are initialized */
        this.SETTINGS_INITIALIZED = false;
        /** @type {boolean} Whether custom fonts are loaded */
        this.CUSTOM_FONTS_LOADED = false;
    }

    /**
     * Reset application variables to their initial state
     * Resets UI, file, content, pagination variables and status flags
     */
    reset() {
        // Reset file-related variables
        this.FILENAME = "";
        this.FILE_CONTENT_CHUNKS = [];
        this.IS_EASTERN_LAN = true;
        this.ENCODING = "utf-8";

        // Reset content-related variables
        this.ALL_TITLES = [];
        this.ALL_TITLES_IND = {};
        this.ACTIVE_TITLE = -1;
        this.BOOK_AND_AUTHOR = {};
        this.FOOTNOTES = [];
        this.FOOTNOTE_PROCESSED_COUNTER = 0;

        // Reset pagination-related variables
        this.CURRENT_PAGE = 1;
        this.TOTAL_PAGES = 0;

        // Reset status flags
        this.INIT = true;
        this.GOTO_TITLE_CLICKED = false;
        this.HISTORY_LINE_NUMBER = 0;
        this.TITLE_PAGE_LINE_NUMBER_OFFSET = 0;
        this.IS_PROCESSING = false;
        this.IS_BOOK_OPENED = false;
    }
}

/**
 * Exported instance of AppVariables
 * @type {AppVariables}
 */
export const VARS = new AppVariables();
