// because "@yaireo/position" is used (in this demo) as a script file and not an node module (ES export)
position = position.default;

// get the ColorPicker & some helper functions for color format transformations
const {
    default: ColorPicker,
    any_to_hex,
    changeColorFormat,
} = window.ColorPicker;

// let the delayed (non-blocking) CSS a chance to load first
// setTimeout(myColor_init, 200);

function myColor_init() {
    // iterate all color inputs and instantiate new ColorPicker instances (for each one)
    document.querySelectorAll(".myColor").forEach((colorInput) => {
        const observerCallback = (entries) => {
            !cPicker.DOM.scope.classList.contains("hidden") &&
                position({
                    target: cPicker.DOM.scope,
                    ref: colorInput,
                    placement:
                        colorInput.dataset.placement ||
                        "center above",
                    offset: [20],
                });
        };
        const resizeObserver = new ResizeObserver(observerCallback);
        const intersectionObserver = new IntersectionObserver(
            observerCallback,
            { root: document, threshold: 1 }
        );

        const cPicker = new ColorPicker({
            color: colorInput.value, // accepts formats: HEX(A), RGB(A), HSL(A)

            defaultFormat: "hex",

            swatches:
                colorInput.dataset.swatches == "false"
                    ? false
                    : JSON.parse(colorInput.dataset.swatches),

            swatchesLocalStorage: true,

            // when clicking anywhere that is not within the color picker.
            // use special logic if clicked on the color-input which is
            // assosiacated with this specific picker
            onClickOutside(e) {
                let showPicker = false,
                    isTargetColorInput = e.target == colorInput;

                const pickerElem = cPicker.DOM.scope;

                if (isTargetColorInput) showPicker = true;
                if (e.key == "Escape") showPicker = false;

                // remove the color-picker from the DOM
                if (showPicker) showColorPicker(pickerElem);
                else hideColorPicker(pickerElem);

                isTargetColorInput && observerCallback();
            },

            onInput(c) {
                colorInput.value = c;
                colorInput.style.setProperty("--color", c);
                saveSettings();
            },

            // onChange: console.log
        });

        cPicker.DOM.scope.setAttribute("positioned", true);
        // document.body.appendChild(cPicker.DOM.scope)

        resizeObserver.observe(document.body);
        intersectionObserver.observe(cPicker.DOM.scope);
        observerCallback();

        // assign a custom property to color-input element
        // which points to the corresponding color-picker instance
        colorInput._colorPicker = cPicker;
    });

    function showColorPicker(pickerElem) {
        // if picker isn't already in the DOM:
        if (!document.body.contains(pickerElem))
            document.body.appendChild(pickerElem); // inject to DOM
    }

    function hideColorPicker(pickerElem) {
        pickerElem.remove();
    }

    // setTimeout(() => {
    //   document.querySelector('.myColor')._colorPicker.setColor( 'red' )
    // }, 2000)
}