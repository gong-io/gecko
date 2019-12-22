import { DomUtils } from '../utils/index.js'

export default () => {
    return {
        restrict: 'A',
        scope: {
            contextMenu: '@',
            app: '='
        },
        compile: function compile(tElement, tAttrs, transclude) {
          return {
            post: function postLink(scope, iElement, iAttrs, controller) {
              var ul = $('#' + scope.contextMenu),
                last = null;

              ul.css({
                'display': 'none'
              });
              $(iElement).bind('contextmenu', function(event) {
                event.preventDefault();
                if (event.target && event.target.tagName === 'REGION') {
                    ul.css({
                      position: "fixed",
                      display: "block",
                      left: event.clientX + 'px',
                      top: event.clientY + 'px'
                    });
                    last = event.timeStamp;
                    scope.app.setContextMenuRegion(event.target.getAttribute('data-id'))
                } else {
                    scope.app.setContextMenuRegion()
                }
                DomUtils.disableScroll()
              });

              $(document).click(function(event) {
                var target = $(event.target);
                if (!target.is(".popover") && !target.parents().is(".popover")) {
                  if (last === event.timeStamp)
                    return;
                  ul.css({
                    'display': 'none'
                  });
                  DomUtils.enableScroll()
                }
              });
            }
          };
        }
    }
}