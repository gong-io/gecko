import Swal from 'sweetalert2'

export default (parent, e) => {
    Swal.fire({
        icon: 'error',
        title: 'Wavesurfer error',
        text: e
    })
    console.error("wavesurfer error:")
    console.log(e)
    parent.reset()
    if (!parent.isServerMode) {
        parent.loadClientMode()
    }
}