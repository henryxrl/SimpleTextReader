import { SidebarSplitView } from "./sidebar-splitview.js";

document.addEventListener("DOMContentLoaded", () => {
    const splitView = new SidebarSplitView({
        container: document.querySelector(".sidebar-splitview-container"),
        divider: document.querySelector(".sidebar-splitview-divider"),
        dragTooltip: document.querySelector(".sidebar-splitview-dragTooltip"),
        toggleButton: document.querySelector(".sidebar-splitview-toggle"),
        storageKey: "sidebar-splitview-sidebarWidth",
        sidebarStyle: {
            sidebarWidthDefault: "15.5vw",
            sidebarWidth: "15.5vw",
            gapWidth: "2.5vw",
            marginWidth: "5vw",
            // sidebarInnerWidth: "80%",
            // contentInnerWidth: "80%",
            // contentInnerHeight: "90%",
            toggleButtonTitle: "Toggle Sidebar",
            showSidebar: true,
            showDragTooltip: true,
            showToggleButton: true,
            autoHide: true,
            proxyScroll: true,
            patchWindowScroll: true,
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
