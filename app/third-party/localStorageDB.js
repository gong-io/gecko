(function() {
    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    if (!indexedDB) {
      console.error('indexDB not supported');
      return;
    }
    var db,
      keyValue = {
        k: '',
        v: ''
      },
      request = indexedDB.open('d2', 1);
    request.onsuccess = function(evt) {
      db = this.result;
    };
    request.onerror = function(event) {
      console.error('indexedDB request error');
      console.log(event);
    };
  
    request.onupgradeneeded = function(event) {
      db = null;
      var store = event.target.result.createObjectStore('str', {
        keyPath: 'k'
      });
  
      store.transaction.oncomplete = function (e){
        db = e.target.db; 
      };
    };
  
    function getValue(key, callback) {
      if(!db) {
        setTimeout(function () {
          getValue(key, callback);
        }, 100);
        return;
      }
      db.transaction('str').objectStore('str').get(key).onsuccess = function(event) {
        var result = (event.target.result && event.target.result.v) || null;
        callback(result);
      };
    }
  
    // if using proxy mode comment this
  
    window['ldb'] = {
      get: getValue,
      set: function(key, value) {
        // no callback for set needed because every next transaction will be anyway executed after this one
        keyValue.k = key;
        keyValue.v = value;
        db.transaction('str', 'readwrite').objectStore('str').put(keyValue);
      }
    }
  
    // Use only for apps that will only work on latest devices only
  
    // window.ldb = new Proxy({}, {
    //   get: function(func, key, callback) {
    //     return (key === 'get') ? getValue : function(callback) {
    //       return getValue(key, callback)
    //     };
    //   },
    //   set: function(func, key, value) {
    //     keyValue.k = key;
    //     keyValue.v = value;
    //     db.transaction('str', 'readwrite').objectStore('str').put(keyValue);
    //   }
    // });
  })();