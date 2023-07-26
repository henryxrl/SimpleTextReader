var img_path_loading;
injectCustomImage('images/loading_geometry.gif', 'image/gif', function(path) {
    // console.log("img_path_loading: ", path);
    img_path_loading = path;
});


function injectCustomImage(imgPath, imgType, callback) {
    let temp = document.createElement('link');
    temp.type = imgType;
    temp.rel = 'preload';
    temp.as = 'image';
    temp.href = browser.runtime.getURL(imgPath);
    temp.onload = function() {
        // var imgName = imgPath.split("/").pop().replace(".png", "").replace(".gif", "");
        // var evt = new CustomEvent(`injectCustomImageLoaded_${imgName}`, {
        //     detail: {
        //         "loaded": this.href
        //     }
        // });
        // document.dispatchEvent(evt);
        callback(this.href);
    };
    document.documentElement.appendChild(temp);
    // return temp.href;
}