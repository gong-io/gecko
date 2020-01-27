import CBuffer from './cbuffer'

function OLATS(frameSize, windowType) {

    this.process = function(frame, outputArray) {
  
      var input  = window_mul(frame);
  
      overlap_and_add(_Hs, input, _squaredFramingWindow, _overlapBuffers, _owOverlapBuffers, _frameSize, outputArray);
  
      _clean = false;
  
      return _Hs;
  
    }
  
    /*
     *  Overlap & Add with CBuffer.
     */
    function overlap_and_add(RS, inF, squaredWinF, oBuf, owOBuf, windowSize, outF) {
  
      var owSample, oSample = 0;
  
      for (var i = 0; i < RS; i++) {
        owSample = owOBuf.shift() || 0;
        oSample  = oBuf.shift() || 0;
        outF.push(oSample / ((owSample<10e-3)? 1 : owSample));
        oBuf.push(0);
        owOBuf.push(0);
      }
  
      for (var i = 0; i < windowSize; i++) {
        oSample = oBuf.shift();
        oBuf.push(inF[i] + oSample);
        owSample = owOBuf.shift();
        owOBuf.push(squaredWinF[i] + owSample);
      }
  
    }
  
    this.beta_fn = function(alpha) {
      if (_alpha <= 1) {
          return 2.0;
        } else if (_alpha <= 1.2) {
          return 2.0;
        } else if (_alpha <= 1.4) {
          return 2.0;
        } else if (_alpha <= 1.8) {
          return 2.5;
        } else {
          return 3.0;
        }
    }
  
    this.overlap_fn = function(alpha) {
      if (alpha < 1.25) {
        return alpha + 0.15;
      } else if (alpha >= 1.25 && alpha < 1.5) {
        return alpha + 0.2;
      } else if (alpha >= 1.5 && alpha < 1.8) {
        return alpha + 0.6;
      } else if (alpha >= 1.8 && alpha < 2) {
        return alpha + 0.9;
      } else if (alpha >= 2 && alpha < 2.5) {
        return alpha + 2.2;
      } else {
        return alpha + 2.2;
      }
    }
  
    /*
     * --------------
     *    Getters
     * --------------
     */
  
    this.get_hs = function () { return _Hs; }
  
    this.get_ha = function () { return _Ha; }
  
    this.get_alpha = function() { return _alpha; }
  
    this.get_real_alpha = function() { return _Hs / _Ha; }
  
    this.get_overlap_factor = function() { return _overlapFactor; }
  
    this.clear_buffers = function() {
      _overlapBuffers = new CBuffer(_frameSize);
      _owOverlapBuffers = new CBuffer(_frameSize);
      _clean = true;
    }
  
  
    /*
     * --------------
     *    Setters
     * --------------
     */
  
    this.set_window_type = function(newType) {
      _windowType = (WindowFunctions[newType])? newType : _windowType;
    }
  
    this.set_alpha = function(newAlpha, newOverlap, newBeta) {
      _alpha = newAlpha;
  
      if (newBeta == undefined)
        this.set_beta(this.beta_fn(_alpha));
      else
        this.set_beta(newBeta);
  
      if (newOverlap == undefined)
        _overlapFactor = this.overlap_fn(_alpha);
      else
        _overlapFactor = newOverlap;
  
      // "Fixed" analysis hop
      _Ha = Math.round(_frameSize/_overlapFactor);
      _Hs = Math.round(_alpha * _Ha);
  
      // console.log([newAlpha, _Hs/_Ha]);
  
      // "Fixed" synthesis hop
      // _Hs = Math.round(_frameSize/_overlapFactor);
      // _Ha = Math.round(_Hs / _alpha);
    }
  
    
  
    this.set_beta = function(newBeta) {
      _beta = newBeta;
  
      _window = create_window(_frameSize, _beta, _windowType);
  
      _squaredFramingWindow = new Float32Array(_window.length);
      for (var i=0; i<_squaredFramingWindow.length; i++)
        _squaredFramingWindow[i] = Math.pow(_window[i], 1);
  
    }
  
  
    /*
     * --------------
     *    Helpers
     * --------------
     */
  
    function window_mul(frame) {
      var aux = new Float32Array(frame.length);
      for (var i=0; i<frame.length; i++) {
        aux[i] = _window[i] * frame[i];
      }
      return aux;
    }
  
    function create_window(length, beta, type) {
  
      var win = new Float32Array(length);
  
      for (var i=0; i<length; i++) {
        win[i] = WindowFunctions[type](length, i, beta);
      }
  
      return win;
  
    }
  
    function create_constant_array(size, constant, ArrayType) {
      var arr = new ((ArrayType)?ArrayType:Array)(size);
      for (var i=0; i<size; i++)
        arr[i] = constant;
      return arr;
    }
  
    var WindowFunctions = {
  
      Lanczos : function(length, index, beta) {
        var x = 2 * index / (length - 1) - 1;
        return Math.pow(Math.sin(Math.PI * x) / (Math.PI * x), beta);
      },
  
      Triangular : function(length, index, beta) {
        return Math.pow(2 / length * (length / 2 - Math.abs(index - (length - 1) / 2)), beta);
      },
  
      Bartlett : function(length, index, beta) {
        return Math.pow(2 / (length - 1) * ((length - 1) / 2 - Math.abs(index - (length - 1) / 2)), beta);
      },
  
      BartlettHann : function(length, index, beta) {
        return Math.pow(0.62 - 0.48 * Math.abs(index / (length - 1) - 0.5) - 0.38 * Math.cos(2 * Math.PI * index / (length - 1)), beta);
      },
  
      Blackman : function(length, index, alpha) {
        var a0 = (1 - alpha) / 2;
        var a1 = 0.5;
        var a2 = alpha / 2;
  
        return a0 - a1 * Math.cos(2 * Math.PI * index / (length - 1)) + a2 * Math.cos(4 * Math.PI * index / (length - 1));
      },
  
      Cosine : function(length, index, beta) {
        return Math.pow(Math.cos(Math.PI * index / (length - 1) - Math.PI / 2), beta);
      },
  
      Gauss : function(length, index, alpha) {
        return Math.pow(Math.E, -0.5 * Math.pow((index - (length - 1) / 2) / (alpha * (length - 1) / 2), 2));
      },
  
      Hamming : function(length, index, beta) {
        return Math.pow(0.54 - 0.46 * Math.cos(2 * Math.PI * index / (length - 1)), beta);
      },
  
      Hann : function(length, index, beta) {
        return Math.pow(0.5 * (1 - Math.cos(2 * Math.PI * index / (length - 1))), beta);
      },
  
      Rectangular : function(length, index, beta) {
        return beta;
      },
  
      SinBeta : function(length, index, beta) {
        return Math.pow(Math.sin(Math.PI*index/length), beta);
      },
  
      Trapezoidal: function(length, index, beta) {
        var div = 10;
        var topIdx = Math.round(length / 4);
        var i1 = topIdx - 1;
        var i2 = topIdx * (div - 1) - 1;
        if (index <= i1) {
          return Math.pow(index / i1, beta);
        } else if (index >= i2) {
          return Math.pow(i2 / index, beta);
        } else {
          return 1;
        }
      }
    };
  
  
    var _frameSize = frameSize;
    var _alpha, _Ha, _Hs;
    var _beta = 1;
    var _overlapFactor = 1.1;
    var _windowType = "Lanczos";
    var _window;
    var _squaredFramingWindow;
  
    this.set_alpha(1);
  
    this.set_beta(_beta);
  
    var _overlapBuffers = new CBuffer(_frameSize);
    var _owOverlapBuffers = new CBuffer(_frameSize);
    for (var i=0; i<_frameSize; i++) {
      _overlapBuffers.push(0);
      _owOverlapBuffers.push(0);
    }
  
  
    var _clean = true;
  
    this.is_clean = function() { return _clean; }
  
  }

  export default OLATS