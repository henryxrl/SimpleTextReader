// Define variables
var style = new CSSGlobalVariables();
// console.log("in ui_variables style: ", style);
var init = true;
var filename = "";
var fileContentChunks = []; // Declare the variable outside the handleDrop function
var allTitles = [];
var encodingLookupByteLength = 1000;
var isEasternLan = true;
var itemsPerPage = 200;
var currentPage = 1;
var totalPages = 0;
var gotoTitle_Clicked = false;
var bookAndAuthor = {};
var footnotes = [];
var footnote_proccessed_counter = 0;
// Credit https://stackoverflow.com/questions/7110353/html5-dragleave-fired-when-hovering-a-child-element
var dragCounter = 0;
var historyLineNumber = 0;
var storePrevWindowWidth = window.innerWidth;
var titlePageLineNumberOffset = 0;

setTitle();
var dropZone = document.getElementById('dropZone');
var loadingScreen = document.getElementById('loading');
// loadingScreen.style.visibility = "visible"; // For debugging the loading screen

var dropZoneTextImgWrapper = document.getElementById("dropZoneTextImgWrapper");
var dropZoneText = document.getElementById("dropZoneText");
var dropZoneImg = document.getElementById("dropZoneImg");
var contentContainer = document.getElementById("content");
var tocContainer = document.getElementById("tocContent");
var paginationContainer = document.getElementById("pagination");
var progressContainer = document.getElementById("progress");
var progressTitle = document.getElementById("progress-title");
var progressContent = document.getElementById("progress-content");
var footNoteContainer = document.getElementById("footnote-content");

var darkModeActualButton = document.getElementById("toggle-btn");   // just for set title
var darkModeToggle = document.getElementById("toggle");
var settingsButton = document.getElementById("STRe-setting-btn");