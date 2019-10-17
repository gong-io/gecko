import Dexie from 'dexie'

class dataBase {
    constructor() {
        this.db = new Dexie('GeckoDatabase')
        this.db.version(1).stores(
            { 
                audioFiles: '++id,fileName,fileData',
                files: '++id,fileName,fileData'
            })
    }

    async getCounts () {
        try {
            const res = await this.db.audioFiles.count()
            return res
        } catch (e) {
            console.error('Error getting count from DB: ' + (e.stack || e))
            return 0
        }
    }

    async clearDB () {
        const deleteFiles = this.db.audioFiles.clear()
        const deleteCTMS = this.db.files.clear()
        try {
            const result = await Promise.all([ deleteFiles, deleteCTMS ])
            return result
        } catch (e) {
            return []
        }   
    }

    async saveFiles (files) {
        try {
            const promises = files.map((f) => {
                const fileName = f.filename
                const fileData = f.data
                return this.db.files.add({ fileName, fileData })
            })
           await Promise.all(promises)
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

    async addAudioFile ({ fileName, fileData }) {
        try {
           await this.db.audioFiles.add({ fileName, fileData })
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

    async getLastAudioFile () {
        try {
            const result = await this.db.audioFiles.orderBy('id').last()
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
            console.log('get error', e)
            return []
        }
        
    }

}


dataBase.$inject = [];
export {dataBase}