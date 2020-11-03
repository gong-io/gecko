require('dotenv').config()
var express = require('express');
var app = express();
var cors = require('cors')
var bodyParser = require("body-parser");
const path = require('path')

const uploadFile = require('./gecko-upload-server/s3')
const S3Proxy = require('./gecko-upload-server/s3proxy');

const proxy = new S3Proxy({ bucket: process.env.AWS_BUCKET, pathPrefix: '/s3_files', folder: path.normalize(process.env.AWS_FOLDER) });
proxy.init();

const PORT = process.env.GECKO_SERVER_CONTAINER_PORT;

app.use(express.static('build'))
app.use(cors())
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}))
app.use(bodyParser.json({limit: '50mb', extended: true}))

app.route('/s3_files/*')
  .get((req, res) => {
    proxy.get(req,res)
      .on('error', () => res.end())
      .pipe(res);
  });

app.post('/upload_s3', function (req, res) {
  const filename = req.body.filename
  const data = req.body.data
  res.setHeader('Content-Type', 'application/json');
  if (filename && data && filename.length && data.length) {
    uploadFile(
      filename,
      data,
      function () {
        res.send(JSON.stringify({ OK: true }));
      },
      function (error) {
        res.send(JSON.stringify({ OK: false, error }));
      })
  } else {
    res.send(JSON.stringify({ OK: false, error: 'Empty data' }));
  }
})

app.listen(PORT, '0.0.0.0');
