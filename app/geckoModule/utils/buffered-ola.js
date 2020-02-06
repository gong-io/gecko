import OLATS from './olats'
import CBuffer from './cbuffer'
/*
 *	A helper class to use OLATS with the Web Audio API.
 *	Just pass an AudioBuffer with the "set_audio_buffer" method.
 *	Then, for example, at each cycle of ScriptProcessor.onaudioprocess, 
 *	change the "alpha" and "position" fields to change the stretching 
 *  factor and the audio buffer position pointer. After changing one 
 *  or both parameters, call the "process" method.
 *  
 */
function BufferedOLA(frameSize) {

	var _frameSize = frameSize || 4096;
	var _olaL = new OLATS(_frameSize);
	var _olaR = new OLATS(_frameSize);
	var _buffer;
	var _position = 0;
	var _newAlpha = 1;

	var _midBufL = new CBuffer(Math.round(_frameSize * 1.2));
	var _midBufR = new CBuffer(Math.round(_frameSize * 1.2));

	

	this.process = function(outputAudioBuffer) {
		if (!_buffer) 
			return;

		var sampleCounter = 0;

        var il = _buffer.getChannelData(0);
        var ir = _buffer.getChannelData(0);
        var ol = outputAudioBuffer.getChannelData(0);
        var or = outputAudioBuffer.getChannelData(1);


        while (_midBufR.size > 0 && sampleCounter < outputAudioBuffer.length) {
          var i = sampleCounter++;
          ol[i] = _midBufL.shift();
          or[i] = _midBufR.shift();
        }

        if (sampleCounter == outputAudioBuffer.length)
          return;

        while (sampleCounter < outputAudioBuffer.length) {

			var bufL = il.subarray(_position, _position + _frameSize);
			var bufR = ir.subarray(_position, _position + _frameSize);

			if (bufL.length < _frameSize) {
				
			}

			if (_newAlpha != undefined && _newAlpha != _olaL.get_alpha()) {
				_olaL.set_alpha(_newAlpha);
				_olaR.set_alpha(_newAlpha);
				_newAlpha = undefined;
			}

			_olaL.process(bufL, _midBufL);
			_olaR.process(bufR, _midBufR);
			for (var i=sampleCounter; _midBufL.size > 0 && i < outputAudioBuffer.length; i++) {
				ol[i] = _midBufL.shift();
				or[i] = _midBufR.shift();
			}

			sampleCounter += _olaL.get_hs();

			_position += _olaL.get_ha();

        }
	}

	this.set_audio_buffer = function(newBuffer) {
		_buffer = newBuffer;
	}

	Object.defineProperties(this, {
		'position' : {
			get : function() {
				return _position;
			}, 
			set : function(newPosition) {
				_position = new Number(newPosition);
			}
		}, 
		'alpha' : {
			get : function() {
				return _olaL.get_alpha();
			}, 
			set : function(newAlpha) {
				_newAlpha = new Number(newAlpha);
			}
		}
	});
}

export default BufferedOLA