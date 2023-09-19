/*
Reference: http://jsfiddle.net/BB3JK/47/
*/
function selector_init(EventListenerFunc, defaultIdx) {
    $('select').each(function(){
        var $this = $(this), numberOfOptions = $(this).children('option').length;
    
        $this.addClass('select-hidden'); 
        $this.wrap('<div class="select"></div>');
        $this.after('<div class="select-styled"></div>');

        var $styledSelect = $this.next('div.select-styled');
        $styledSelect.text($this.children('option').eq(defaultIdx).text());
    
        var $list = $('<ul />', {
            'class': 'select-options'
        }).insertAfter($styledSelect);
    
        for (var i = 0; i < numberOfOptions; i++) {
            $('<li />', {
                text: $this.children('option').eq(i).text(),
                rel: $this.children('option').eq(i).val()
            }).appendTo($list);
            // console.log(defaultIdx, $this.children('option').eq(defaultIdx));
            // if ($this.children('option').eq(defaultIdx).is(':selected')){
            if (defaultIdx == i){
                // console.log(defaultIdx, $this.children('option').eq(i).val());
                $('li[rel="' + $this.children('option').eq(i).val() + '"]').addClass('is-selected')
            }
        }
    
        var $listItems = $list.children('li');
    
        $styledSelect.click(function(e) {
            e.stopPropagation();
            $('div.select-styled.active').not(this).each(function(){
                $(this).removeClass('active').next('ul.select-options').hide();
            });
            $(this).toggleClass('active').next('ul.select-options').toggle();
        });
    
        $listItems.click(function(e) {
            e.stopPropagation();
            $styledSelect.text($(this).text()).removeClass('active');
            $this.val($(this).attr('rel'));
            $list.find('li.is-selected').removeClass('is-selected');
            $list.find('li[rel="' + $(this).attr('rel') + '"]').addClass('is-selected');
            $list.hide();
            // console.log($this.val());
            EventListenerFunc(true);
        });
    
        $(document).click(function() {
            $styledSelect.removeClass('active');
            $list.hide();
        });

    });
}