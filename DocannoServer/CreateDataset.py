import boto3
import json
import os

newCallInsert = """
INSERT into server_document(text, project_id, metadata, created_date_time, updated_date_time)
values('{0}', :projectId, '{{}}', now(), now());"""

newTranscriptInsert = """
INSERT INTO server_audio_annotation(data, document_id, user_id, file_name, file_path, created_date_time, updated_date_time)
VALUES(E'{0}', currval(pg_get_serial_sequence('server_document', 'id')), :userId, '{1}', '{2}', now(), now());"""


def createInsertsForNewDataset(metadata):
    # metadata = json.loads(metadata)

    s3 = boto3.resource('s3')

    bucket = s3.Bucket(metadata['bucket'])

    sql = []

    for call in metadata['calls']:
        sql.append(newCallInsert.format(call['audio']))
        for filename in call['transcripts']:
            file_data = bucket.Object(metadata['root'] + filename).get()['Body'].read().decode()
            file_data = file_data.replace('\n', r'\n')
            file_data = file_data.replace("'", r"\'")
            sql.append(newTranscriptInsert.format(file_data, os.path.split(filename)[1], os.path.split(filename)[0]))

    return sql

    # objects = [x for x in bucket.objects.filter(
    #     Prefix='Processor/{0}/{1}/LanguageClassifier/'.format(call_id, hash)) if
    #            'language-classifier-result.json' in x.key]
    #
    # scores = json.loads(obj.get()['Body'].read().decode())['scoredLanguages']


def runDDL():
    execute = """
create table if not exists server_audio_annotation
(
	id serial not null
		constraint server_audio_annotation_pkey
			primary key,
    data text,
	done boolean not null default false,
	document_id integer not null
		constraint server_audio_annotation_document_id_fk
			references server_document
				deferrable initially deferred,
	user_id integer not null
		constraint server_audio_annotation_user_id_fk
			references auth_user
				deferrable initially deferred,
	file_name text,
	file_path text,
	created_date_time timestamp with time zone not null,
	updated_date_time timestamp with time zone not null
);

create index if not exists server_audio_annotation_document_id_index
	on server_audio_annotation (document_id);

"""


if __name__ == '__main__':
    metadata = {'bucket': 'gong-datasets',
                'root': 'Golan/temp/root/',  # for the transcripts location only
                'calls': [
                    {'audio': 'Golan/temp/audio/1853674366752009473.wav',
                     'transcripts': ['human/1853674366752009473_old.ctm', 'machine/1853674366752009473_new.ctm']}
                ]}

    for x in createInsertsForNewDataset(metadata):
        print(x)
