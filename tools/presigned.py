import logging
import boto3
from botocore.exceptions import ClientError
from botocore.client import Config

from argparse import ArgumentParser


def create_presigned_put(bucket_name, object_name, expiration=3600):
    session = boto3.session.Session()
    s3_client = session.client('s3', config= boto3.session.Config(signature_version='s3v4'))
    try:
        response = s3_client.generate_presigned_url('put_object',
                                                    Params={'Bucket': bucket_name, 'Key': object_name},
                                                    HttpMethod='PUT',
                                                    ExpiresIn=expiration)
    except ClientError as e:
        logging.error(e)
        return None

    return response

parser = ArgumentParser()

parser.add_argument("-b", "--bucket", default="gecko-test", help="Bucket name")
parser.add_argument("-k", "--key", default="test.json", help="Object key")
parser.add_argument('-e', "--expiration", type=int, default=3600, help="URL expiration")

try:
    args = parser.parse_args()
except:
    parser.error("Invalid arguments.")
    sys.exit(0)

response = create_presigned_put(args.bucket, args.key, args.expiration)
print(response)