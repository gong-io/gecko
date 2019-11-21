import Dexie from 'dexie'

import { formatTime } from './utils'

class dataBase {
    constructor() {
        this.db = new Dexie('GeckoDatabase')
        this.db.version(2).stores(
            { 
                drafts: '++id,files,mediaFile.name,mediaFile.url,mediaFile.isVideo,draftType,ctime,mtime'
            }
        )

        this.db.version(1).stores(
            { 
                mediaFiles: '++id,fileName,fileData,isVideo',
                files: '++id,fileName,fileData',
            }
        )
    }

    async getCounts (draftType) {
        try {
            let res
            if (draftType >= 0) {
                res = await this.db.drafts.where({ 'draftType' : draftType }).count()
            } else {
                res = await this.db.drafts.count()
            }
            return res
        } catch (e) {
            console.error('Error getting count from DB: ' + (e.stack || e))
            return 0
        }
    }

    async deleteDraft (id) {
        try {
            const result = this.db.drafts.delete(parseInt(id))
            return result
        } catch (e) {
            console.error('Error deleting draft: ' + (e.stack || e));
        }
    }

    async saveFiles (files) {
        try {
            const promises = files.map((f) => {
                const fileName = f.filename
                const fileData = f.data
                return this.db.files.add({ fileName, fileData })
            })
           const result = await Promise.all(promises)
           return result
        } catch (e) {
            console.error('Error savig to DB: ' + (e.stack || e));
        }
    }

    async clearFiles () {
        try {
            await this.db.files.clear()
        } catch (e) {
            console.error('Error clear DB: ' + (e.stack || e))
        }
    }

    async checkDraftUrl (url) {
        try {
            const result = await this.db.drafts.where({ 'mediaFile.url' : url }).toArray()
            return result
        } catch (e) {

        }
    }

    async createDraft ({ mediaFile, files, draftType }) {
        try {
            const timestamp = Date.now()
            const res = await this.db.drafts.add({
                mediaFile,
                files,
                draftType,
                ctime: timestamp,
                mtime: timestamp
            })
            return res
        } catch (e) {
            console.error('Error creating draft: ' + (e.stack || e));
        }
    }

    async addMediaFile ({ fileName, fileData, isVideo }) {
        try {
           const res = await this.db.mediaFiles.add({ fileName, fileData, isVideo })
           return res
        } catch (e) {
            console.error('Error savig to DB: ' + (e.stack || e));
        }
    }

    async addFile ({ fileName, fileData }) {
        try {
           await this.db.files.add({ fileName, fileData })
        } catch (e) {
            console.error('Error savig to DB: ' + (e.stack || e));
        }
    }

    async getLastMediaFile () {
        try {
            const result = await this.db.mediaFiles.orderBy('id').last()
            return result      
        } catch (e) {
            return {}
        }
        
    }

    async getFiles () {
        try {
            const result = await this.db.files.toArray()
            return result
        } catch (e) {
            console.error('get error', e)
            return []
        }
    }

    async getDraft (draft) {
        try {
            const res = await this.db.drafts.get(draft.id)
            return res
        } catch (e) {

        }
    }

    async updateDraft(id, files) {
        try {
            const res = await this.db.drafts.update(id, { files, mtime: Date.now() })
            return res
        } catch (e) {
            console.log('Update draft error', e)
        }
    }

    async getDrafts (draftType) {
        try {
            let result
            if (draftType >= 0) {
                result = await this.db.drafts.where({ 'draftType' : draftType }).toArray()
            } else {
                result = await this.db.drafts.toArray()
            }
            return result
        } catch (e) {
            console.error('get drafts error', e)
            return []
        }
    }

}


dataBase.$inject = [];
export {dataBase}