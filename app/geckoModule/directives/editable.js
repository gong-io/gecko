export default () => {
    return {
        restrict: "A",
        require: "ngModel",
        scope: {
            changed: '&',
            keysMapping: '&'
        },
        link: (scope, element, attrs, ngModel) => {
            element[0].setAttribute('contenteditable', true);

            const read = () => {
                // view -> model
                let newText = element.text();
                let oldText = ngModel.$viewValue;

                if (oldText !== newText) {
                    ngModel.$setViewValue(newText);

                    if (scope.changed) {
                        let returnValue = scope.changed({oldText: oldText, newText: newText})

                        if (returnValue === false){
                            ngModel.$setViewValue(oldText);
                            // force render
                            // probably because old == new so it does not render
                            ngModel.$render();
                        }
                    }
                }
            }

            // model -> view
            ngModel.$render = () => {
                element.text(ngModel.$viewValue || "");
            };

            element.bind('click', () => {
                event.stopPropagation();
                event.preventDefault();
            });

            element.bind('blur', () => {
                scope.$apply(read);
            });

            element.bind('dblclick', (e) => {
                document.execCommand('selectAll',false,null)
            })

            element.bind('paste', (e) => {
                if (e && e.originalEvent) {
                    const clipboardData = e.originalEvent.clipboardData
                    if (clipboardData) {
                        const text = clipboardData.getData('text/plain')
                        document.execCommand('insertText', false, text)
                    }
                }
                e.preventDefault()
            })


            element.bind('keydown', (e) => {
                const isMacMeta = window.navigator.platform === 'MacIntel' && e.metaKey
                const isAlt = e.altKey
                const isOtherControl = window.navigator.platform !== 'MacIntel' && e.ctrlKey
                const isDownCtrl = isMacMeta || isOtherControl
                if (e.which === 27 || e.which === 13 && !isDownCtrl && !isAlt) {
                    element.blur()
                    e.preventDefault()
                    e.stopPropagation()
                    return
                }
            })
        }
    };
}