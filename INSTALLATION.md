# Installation & Deployment

## Requirements

* node >= v10
* npm  >= v6

## Usage

1. Install packages with: `npm install`

2. Run with: `npm run dev`

## Configuration

When running Gecko in server mode, you'll be able to configure the host port, create a .env file with:

```bash
GECKO_SERVER_CONTAINER_PORT=<<<host port>>
```

### AWS integration

#### S3 storage

You can use a S3 storage account to:

* Load audio & annotation from a bucket
* Save annotations to a bucket

You need to add these environment variables to your .env file:

```bash
AWS_BUCKET=<<<put your aws bucket name here>>>
AWS_REGION=<<<put the region where your bucket is, something like us-east-3>>>
AWS_ACCESS_KEY_ID=<<<aws access key id>>>
AWS_SECRET_ACCESS_KEY=<<<aws secret access key>>>
AWS_FOLDER=<<<the folder containing your files (audio & annotations)>>>
```

At this point, you can load data from S3 Storage using this url:

`http://localhost:8080/?save_mode=server&audio=http://localhost:8080/s3_files/file.mp3&json=http://localhost:8080/s3_files/annotation.json`

Notes:

1. Gecko will aggregate the AWS_FOLDER with the file name, do not use the object key S3 gives you, only the file name is required.
2. You can use any annotation format available in Gecko, just replace the key of the parameter, for exemple with rttm : `http://localhost:8080/?save_mode=server&audio=http://localhost:8080/s3_files/file.mp3&rttm=http://localhost:8080/s3_files/annotation.rttm`
3. On save, Gecko will override the annotation file and save another file with a timestamp, to maintain some kind of primitive history mechanism.

## Deploy

### Client mode

`npm run build`

Copy the `build` folder to an annotator machine.

Run `index.html`

### Server mode

`npm run build`

`npm run server`

Annotator can now access the server remotly, and can use S3 integration if configured.
