class ZoomTooltip {
    constructor (app) {
        this.sliderId = 'zoomSlider'
        this.tooltipClass = 'gecko-zoom-tooltip'
        this.tooltipInner = 'tooltip-inner'
        this.app = app

        const slider = document.getElementById(this.sliderId)
        slider.addEventListener('input', () => this.update(true))
        this.sliderBoundingBox = slider.getBoundingClientRect()

        const sliderParent = slider.parentNode
        this.parentComputedStyle =  window.getComputedStyle(sliderParent, null)
    }

    textTemplate (val) {
        return `Zoom level: ${val}`
    }

    update (updateText = false) {
        const slider = document.getElementById(this.sliderId)
        const value = Number.parseInt(slider.value)
        const x = value * (this.sliderBoundingBox.width) / this.app.maxZoom
        this.app.$timeout(() => {
            const tooltip = document.querySelector(`.${this.tooltipClass}`)
            if (tooltip) {
                const tooltipContent = tooltip.querySelector(`.${this.tooltipInner}`)
                if (updateText) {
                    tooltipContent.textContent = this.textTemplate(value)
                }
                const parentPadding = parseInt(this.parentComputedStyle.getPropertyValue('padding-left'))
                tooltip.style.left = `${x + parentPadding - tooltip.offsetWidth / 2}px`
            }
        })
    }
}

export default ZoomTooltip