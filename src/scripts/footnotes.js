/*
Footnotes script by Lukas Mathis
Web: http://ignorethecode.net/blog/2010/04/20/footnotes/
Twitter: https://twitter.com/ignorethecode
License: Public Domain

Some tweaks by Matt Gemmell
Web: http://mattgemmell.com/
Twitter: http://twitter.com/mattgemmell
*/

// this script requires jQuery
jQuery(document).ready(function() {
    Footnotes.setup();
});

var Footnotes = {
    footnotetimeout: false,
    setup: function() {
        var footnotelinks = jQuery("a[rel='footnote']")

        footnotelinks.unbind('mouseover',Footnotes.footnoteover);
        footnotelinks.unbind('mouseout',Footnotes.footnoteoout);

        footnotelinks.bind('mouseover',Footnotes.footnoteover);
        footnotelinks.bind('mouseout',Footnotes.footnoteoout);
    },
    footnoteover: function() {
        clearTimeout(Footnotes.footnotetimeout);
        jQuery('#footnotediv').stop();
        jQuery('#footnotediv').remove();

        var id = jQuery(this).attr('href').substr(1);
        var position = jQuery(this).offset();
        var div = jQuery(document.createElement('div'));
        div.attr('id','footnotediv');
        div.bind('mouseover',Footnotes.divover);
        div.bind('mouseout',Footnotes.footnoteoout);

        var el = document.getElementById(id);
        var footnoteContent = jQuery(el).html();
        footnoteContent = footnoteContent.replace(/<a[^>]*rev="footnote">.*<\/a>/g, '');

        var closeLink;
        if (typeof TouchEvent != "undefined") {
            // On a touch device.
            closeLink = jQuery(document.createElement('a'));
            // closeLink.html("x");
            closeLink.attr('id','footnotecloselink');
            closeLink.attr('href','#');
            closeLink.click(function() {
                jQuery('#footnotediv').remove();
                return false;
            });
        }

        div.html(footnoteContent);
        div.append(closeLink);

        var margins = 20;
        var singleMargin = margins / 2.0;
        var max_width = jQuery(window).width() - margins;
        max_width = Math.min(max_width, 400);
        var max_height = jQuery(window).height() - margins;
        max_height = Math.min(max_height, 300);

        div.css({
            position:'absolute',
            width:'auto',
            'max-width':max_width+'px',
            'max-height':max_height+'px',
            opacity:1.0,
            overflow:'auto'
        });
        jQuery(document.body).append(div);

        var actual_width = div.width();
        var left = position.left;
        if (left + (margins + actual_width)  > jQuery(window).width() + jQuery(window).scrollLeft()) {
            left = jQuery(window).width() - (margins + actual_width) + jQuery(window).scrollLeft();
            left = (jQuery(window).width() - actual_width) / 2.0;
            left -= singleMargin;
        }
        var top = position.top + margins;
        if (top + div.height() > jQuery(window).height() + jQuery(window).scrollTop()) {
            top = position.top - div.height() - singleMargin;
        }
        var bodyOffset = jQuery(document.body).offset();
        top -= bodyOffset.top;
        left -= bodyOffset.left;
        div.css({
            left:left,
            top:top
        });
    },
    footnoteoout: function() {
        /*Footnotes.footnotetimeout = setTimeout(function() {
            jQuery('#footnotediv').animate({
                opacity: 0
            }, 200, function() {
                jQuery('#footnotediv').remove();
            });
        },100);*/
        Footnotes.footnotetimeout = setTimeout(function() {
            jQuery('#footnotediv').remove();
        }, 400);
    },
    divover: function() {
        clearTimeout(Footnotes.footnotetimeout);
        jQuery('#footnotediv').stop();
        /*jQuery('#footnotediv').css({
                opacity: 0.9
        });*/
    }
}
