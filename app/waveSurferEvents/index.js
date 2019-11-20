import ready from './ready'
import play from './play'
import regionCreated from './regionCreated'
import error from './error'
import pause from './pause'
import seek from './seek'
import regionUpdated from './regionUpdated'
import regionUpdateEnd from './regionUpdateEnd'
import regionClick from './regionClick'
import regionIn from './regionIn'
import regionOut from './regionOut'
import loading from './loading'
import audioProcess from './audioProcess'

export default {
    ready,
    play,
    regionCreated,
    pause,
    seek,
    regionUpdated,
    regionUpdateEnd,
    regionClick,
    regionIn,
    regionOut,
    error: error,
    loading,
    audioProcess
}