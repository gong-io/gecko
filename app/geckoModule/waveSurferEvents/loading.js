export default (parent) => {
    parent.$scope.$evalAsync(() => {
        parent.loader = true
    })
}