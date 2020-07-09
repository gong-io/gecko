import logging
import boto3
from botocore.exceptions import ClientError
from botocore.client import Config
from urllib.parse import quote
import sys

from argparse import ArgumentParser


def create_presigned(method, bucket_name, object_name, expiration=3600):
    session = boto3.session.Session()
    s3_client = session.client('s3', config=boto3.session.Config(signature_version='s3v4'))
    try:
        response = s3_client.generate_presigned_url(method,
                                                    Params={'Bucket': bucket_name, 'Key': object_name},
                                                    HttpMethod=method.split('_')[0].upper(),
                                                    ExpiresIn=expiration)
    except ClientError as e:
        logging.error(e)
        return None

    return response


parser = ArgumentParser()

# expiration is in seconds, set to a week:
expiration = 60 * 60 * 24 * 7

parser.add_argument('server', help='Hosting server URL')
parser.add_argument("bucket", help="Bucket name")
parser.add_argument('audio', help='audio S3 path')
parser.add_argument("transcript", help="Transcript S3 path")
parser.add_argument('-e', "--expiration", type=int, default=expiration, help="expiration date in seconds")

try:
    args = parser.parse_args()
except:
    parser.error("Invalid arguments.")
    sys.exit(0)

put_transcript = create_presigned('put_object', args.bucket, args.transcript, args.expiration)
get_transcript = create_presigned('get_object', args.bucket, args.transcript, args.expiration)
audio = create_presigned('get_object', args.bucket, args.audio, args.expiration)
result = f'{args.server}?save_mode=server&audio={quote(audio)}&json={quote(get_transcript)}&presigned_url={quote(put_transcript)}'
print(result)
