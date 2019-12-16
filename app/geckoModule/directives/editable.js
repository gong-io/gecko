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

            element.bind('keydown keypress', (e) => {
                if (e.which === 13 || e.which === 27) {
                    this.blur();
                    e.preventDefault();
                }

                e.stopPropagation()
            });

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
                const systemKeys = [ 65, 88, 67, 86, 90, 89] // a, x, c, v, z, y
                if (isDownCtrl || isAlt) {
                    if (e.which === 32) {
                        this.blur()
                        scope.keysMapping({keys: 'space'})
                        e.preventDefault()
                        e.stopPropagation()
                        return
                    }
                }

                if (isDownCtrl && e.which !== 91 && e.which !== 17) { // not a only ctrl button
                    if (systemKeys.includes(e.which)) {
                        return
                    }
                    this.blur()
                    scope.keysMapping({keys: e.key, which: e.which})
                    e.preventDefault()
                    e.stopPropagation()
                    return
                }

            })
        }
    };
}