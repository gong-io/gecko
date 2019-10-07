/* jslint node: true, esversion: 6 */

const EventEmitter = require('events');
const AWS = require('aws-sdk');
const url = require('url');

class UserException extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

module.exports = class s3proxy extends EventEmitter {
  constructor(p) {
    super();
    if (!p) {
      throw new UserException('InvalidParameterList', 'constructor parameters are required');
    }
    if (!p.bucket) {
      throw new UserException('InvalidParameterList', 'bucket parameter is required');
    }
    this.bucket = p.bucket;
    this.pathPrefix = p.pathPrefix;
    this.folder = p.folder
    this.options = Object.getOwnPropertyNames(p)
      .filter(name => (name !== 'bucket' && name !== 'pathPrefix' && name !== 'folder'))
      .reduce((obj, name) => {
        const withName = {};
        withName[name] = p[name];
        return Object.assign({}, obj, withName);
      }, {});
  }

  init(done) {
    this.s3 = new AWS.S3(Object.assign({ apiVersion: '2006-03-01' }, this.options));
    this.healthCheck((error, data) => {
      if (error) {
        if (typeof (done) !== typeof (Function)) this.emit('error', error, data);
      } else this.emit('init', data);
      if (typeof (done) === typeof (Function)) done(error, data);
    });
  }

  createReadStream(req) {
    this.isInitialized();
    const r = s3proxy.parseRequest(req, this.pathPrefix);
    const params = { Bucket: this.bucket, Key: r.key };
    if (this.folder) {
      params.Key = this.folder + '/' + params.Key
    }
    const s3request = this.s3.getObject(params);
    const s3stream = s3request.createReadStream();
    s3request.on('httpHeaders', (statusCode, headers) => {
      s3stream.emit('httpHeaders', statusCode, headers);
    });
    s3stream.addHeaderEventListener = (res) => {
      s3stream.on('httpHeaders', (statusCode, headers) => {
        res.writeHead(statusCode, headers);
      });
    };
    return s3stream;
  }

  isInitialized() {
    if (!this.s3) {
      const error = new UserException('UninitializedError', 'S3Proxy is uninitialized (call s3proxy.init)');
      throw error;
    }
  }

  /*
    Return key and query from request object, since Express and HTTP
    modules have different req objects.
    key is req.path if defined, or pathname from url.parse object
    key also has any leading slash stripped
    query is req.query, or query from url.parse object
  */
  static parseRequest(req, prefix) {
    const obj = {};
    // Express objects have path, HTTP objects do not
    if (typeof req.path === 'undefined') {
      const parsedUrl = url.parse(req.url, true);
      obj.query = parsedUrl.query;
      obj.key = parsedUrl.pathname;
    } else {
      obj.query = req.query;
      obj.key = req.path;
    }
    if (prefix) {
      obj.key = obj.key.replace(prefix, '')
    }
  
    obj.key = s3proxy.stripLeadingSlash(obj.key);
    return obj;
  }

  static stripLeadingSlash(str) {
    return str.replace(/^\/+/, '');
  }

  healthCheck(done) {
    const s3request = this.s3.headBucket({ Bucket: this.bucket }, (error, data) => {
      done(error, data);
    });
    return s3request;
  }

  healthCheckStream(res) {
    const s3request = this.s3.headBucket({ Bucket: this.bucket });
    const s3stream = s3request.createReadStream();
    s3request.on('httpHeaders', (statusCode, headers) => {
      res.writeHead(statusCode, headers);
      s3stream.emit('httpHeaders', statusCode, headers);
    });
    return s3stream;
  }

  head(req, res) {
    const stream = this.createReadStream(req);
    stream.addHeaderEventListener(res);
    return stream;
  }

  get(req, res) {
    const stream = this.createReadStream(req);
    stream.addHeaderEventListener(res);
    return stream;
  }
};