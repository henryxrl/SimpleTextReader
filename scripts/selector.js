/*
Reference: http://jsfiddle.net/BB3JK/47/
*/
function selector_init(
    $selectElement,
    defaultIdx,
    EventListenerFunc,
    EventListenerFuncParameters
) {
    // Cache the select element and number of options (ignores optgroup)
    var $this = $selectElement,
        allOptions = $this.find("option"), // Find all options, including those inside optgroups
        numberOfOptions = allOptions.length;

    // Hides the select element
    $this.addClass("select-hidden");

    // Wrap the select element in a div
    $this.wrap('<div class="select"></div>');

    // Insert a styled div to sit over the top of the hidden select element
    $this.after('<div class="select-styled"></div>');

    // Cache the styled div
    var $styledSelect = $this.next("div.select-styled");

    // Ensure defaultIdx is within the valid range
    if (defaultIdx < 0 || defaultIdx >= numberOfOptions) {
        defaultIdx = 0; // Fallback to the first option if defaultIdx is invalid
    }

    // Show the default select option in the styled div
    $styledSelect.text(allOptions.eq(defaultIdx).text());
    $styledSelect.attr("style", allOptions.eq(defaultIdx).attr("style"));

    // Insert an unordered list after the styled div and also cache the list
    var $list = $("<ul />", {
        class: "select-options",
    }).insertAfter($styledSelect);

    // Check for optgroups and handle them
    $this.children("optgroup, option").each(function () {
        if ($(this).is("optgroup")) {
            // If the current element is an optgroup, add a label for the group
            var optgroupLabel = $("<li />", {
                text: $(this).attr("label"),
                class: "optgroup-label",
                "data-optgroup": true,
            }).appendTo($list);

            // Iterate over each option inside the optgroup
            $(this)
                .children("option")
                .each(function () {
                    $("<li />", {
                        text: $(this).text(),
                        rel: $(this).val(),
                        class: "optgroup-option",
                        style: $(this).attr("style"),
                    }).appendTo($list);
                });
        } else {
            // If the current element is a regular option, add it directly
            $("<li />", {
                text: $(this).text(),
                rel: $(this).val(),
                style: $(this).attr("style"),
            }).appendTo($list);
        }
    });

    // Cache the list items (excluding optgroup-label)
    var $listItems = $list.children("li").not(".optgroup-label");

    // Show the unordered list when the styled div is clicked (also hides it if the div is clicked again)
    $styledSelect.click(function (e) {
        e.stopPropagation();
        $("div.select-styled.active").each(function () {
            $(this).removeClass("active").next("ul.select-options").hide();
        });
        $(this).toggleClass("active").next("ul.select-options").toggle();
    });

    // Hides the unordered list when a list item is clicked and updates the styled div to show the selected list item
    // Updates the select element to have the value of the equivalent option
    $listItems.click(function (e) {
        e.stopPropagation();
        $styledSelect.text($(this).text()).removeClass("active");
        $styledSelect.attr("style", $(this).attr("style"));
        $this.val($(this).attr("rel"));
        $list.find("li.is-selected").removeClass("is-selected");
        $list
            .find('li[rel="' + $(this).attr("rel") + '"]')
            .addClass("is-selected");
        $list.hide();
        EventListenerFunc(...EventListenerFuncParameters);
    });

    // Hides the unordered list when clicking outside of it
    $(document).click(function () {
        $styledSelect.removeClass("active");
        $list.hide();
    });

    // Disable click event for optgroup-label
    $(".optgroup-label").click(function (e) {
        e.stopPropagation();
    });

    // Select the default index item in the dropdown list
    $list
        .find('li[rel="' + allOptions.eq(defaultIdx).val() + '"]')
        .addClass("is-selected");
}
