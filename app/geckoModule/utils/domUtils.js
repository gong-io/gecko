const DomUtils =  {
    // left: 37, up: 38, right: 39, down: 40,
    // spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
    keys : { 37: 1, 38: 1, 39: 1, 40: 1 },
    preventDefault: (e) => {
      e = e || window.event;
      if (e.preventDefault) e.preventDefault();
      e.returnValue = false;
    },
    preventDefaultForScrollKeys: (e) => {
      if (DomUtils.keys[e.keyCode]) {
        DomUtils.preventDefault(e);
        return false;
      }
    },
    disableScroll: () => {
      document.addEventListener('wheel', DomUtils.preventDefault, {
        passive: false,
      }); // Disable scrolling in Chrome
      document.addEventListener('keydown', DomUtils.preventDefaultForScrollKeys, {
        passive: false,
      });
    },
    enableScroll: () => {
      document.removeEventListener('wheel', DomUtils.preventDefault, {
        passive: false,
      }); // Enable scrolling in Chrome
      document.removeEventListener(
        'keydown',
        DomUtils.preventDefaultForScrollKeys,
        {
          passive: false,
        }
      ); // Enable scrolling in Chrome
    }
  }

  export default DomUtils