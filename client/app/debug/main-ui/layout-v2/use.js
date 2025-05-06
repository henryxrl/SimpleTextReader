import { SidebarSplitView } from "./sidebar-splitview.js";

document.addEventListener("DOMContentLoaded", () => {
    const splitView = new SidebarSplitView({
        container: document.querySelector(".sidebar-splitview-container"),
        divider: document.querySelector(".sidebar-splitview-divider"),
        tooltip: document.querySelector(".sidebar-splitview-tooltip"),
        toggleButton: document.querySelector(".sidebar-splitview-toggle"),
        storageKey: "sidebar-splitview-sidebarWidth",
        sidebarStyle: {
            sidebarWidthDefault: "15.5vw",
            sidebarWidth: "15.5vw",
            gapWidth: "2.5vw",
            marginWidth: "5vw",
            sidebarInnerWidth: "100%",
            contentInnerWidth: "100%",
            contentInnerHeight: "100%",
            autoHide: true,
        },
    });

    // Example: Add a callback to the onResize event
    // splitView.onResize((vw) => {
    //     console.log("onResize", vw);
    // });

    // Example: Update the max width of the sidebar based on the window size
    // window.addEventListener("resize", () => {
    //     const isNarrow = window.innerWidth < 1000;
    //     splitView.setMaxWidth(isNarrow ? 30 : 45);
    // });

    // Reveal layout once sidebar width is set
    document.querySelector(".sidebar-splitview-outer").style.visibility = "visible";
});
