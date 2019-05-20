require('./title-bar')

const Game = require('./game')
const AI = require('./ai')

const AIAgent = require('./aiagent')

const path = require('path')

const { ipcRenderer } = require('electron')

const Spinner = require('spin')

let simulationRunning = false
let archive = null, agent = null

let tetris = new Game()
tetris.render()

let genetic = new AI(tetris)

const analytics = document.querySelector('.analytics')
const settings = document.querySelector('.settings')

const play = document.querySelector('.taskbar .play.control')
const playImg = document.querySelector('.taskbar .play .control-icon')

const upload = document.querySelector('.taskbar .upload.control')
const uploadImg = document.querySelector('.taskbar .upload .control-icon')

const spinDiv = document.querySelector('.console .progress-spinner')
const download = document.querySelector('.console .download.control .control-icon')

const generationDiv = document.querySelector('.console .generation .place')

let currentSettings = genetic.getConfig()
var opts = {
    lines: 10, // The number of lines to draw
    length: 8, // The length of each line
    width: 2, // The line thickness
    radius: 8, // The radius of the inner circle
    scale: 0.1, // Scales overall size of the spinner
    corners: 1, // Corner roundness (0..1)
    color: '#ff662f', // CSS color or array of colors
    fadeColor: 'transparent', // CSS color or array of colors
    speed: 1.2, // Rounds per second
    rotate: 0, // The rotation offset
    animation: 'spinner-line-fade-quick', // The CSS animation name for the lines
    direction: 1, // 1: clockwise, -1: counterclockwise
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    className: 'spinner', // The CSS class to assign to the spinner
    top: '20px', // Top position relative to parent
    left: '20px', // Left position relative to parent
    shadow: 'none', // Box-shadow for the lines
    position: 'absolute' // Element positioning
};

let spinner = new Spinner(opts)

settings.addEventListener('click', (e) => {
    if (!simulationRunning) {
        ipcRenderer.send('settings:open', currentSettings)
    }
})

ipcRenderer.on('params', (event, params) => {
    currentSettings = params
})

play.addEventListener('click', () => {
    if(!simulationRunning){
        simulationRunning = true
        tetris = null
        genetic = null

        tetris = new Game()

        genetic = new AI(tetris, currentSettings)

        genetic.start()

        if(!download.classList.contains('hidden'))
            download.classList.add('hidden')

        spinner.spin(spinDiv)

        playImg.setAttribute('src', path.join(__dirname, '../../assets/icons/play-disabled.png'))
        playImg.setAttribute('style', 'cursor:default;')

        uploadImg.setAttribute('src', path.join(__dirname, '../../assets/icons/upload-disabled.png'))
        uploadImg.setAttribute('style', 'cursor:default;')
    }
})

ipcRenderer.on('sim:results', (event, args) => {
    spinner.stop()

    if(download.classList.contains('hidden'))
        download.classList.remove('hidden')

    simulationRunning = false
    
    genetic = null
    generationDiv.innerHTML = ''
    tetris = null
    tetris = new Game()
    tetris.reset()
    tetris.render()

    archive = args

    playImg.setAttribute('src', path.join(__dirname, '../../assets/icons/play-color.png'))
    playImg.setAttribute('style', 'cursor:pointer;')

    uploadImg.setAttribute('src', path.join(__dirname, '../../assets/icons/upload.png'))
    uploadImg.setAttribute('style', 'cursor:pointer;')
})

download.addEventListener('click', () => {
    ipcRenderer.send('sim:save', archive)
})

ipcRenderer.on('sim:saved', (event, args) => {
    if(args){
        if(!download.classList.contains('hidden'))
            download.classList.add('hidden')
    }
})

upload.addEventListener('click', () => {
    if(!simulationRunning){
        simulationRunning = true

        playImg.setAttribute('src', path.join(__dirname, '../../assets/icons/play-disabled.png'))
        playImg.setAttribute('style', 'cursor:default;')

        uploadImg.setAttribute('src', path.join(__dirname, '../../assets/icons/upload-disabled.png'))
        uploadImg.setAttribute('style', 'cursor:default;')

        ipcRenderer.send('sim:agent:upload')
    }
})

ipcRenderer.on('sim:agent:noupload', (event, args) => {
    simulationRunning = false
    tetris = null

    playImg.setAttribute('src', path.join(__dirname, '../../assets/icons/play-color.png'))
    playImg.setAttribute('style', 'cursor:pointer;')

    uploadImg.setAttribute('src', path.join(__dirname, '../../assets/icons/upload.png'))
    uploadImg.setAttribute('style', 'cursor:pointer;')
})

ipcRenderer.on('sim:agent:start', (event, args) => {
    if(!download.classList.contains('hidden'))
        download.classList.add('hidden')
    
    tetris = null
    tetris = new Game()

    agent = new AIAgent(tetris, args.config, args.weights)
    
    tetris.render()

    agent.start()
})

ipcRenderer.on('sim:agent:done', (event, args) => {
    simulationRunning = false
    tetris = null
    agent = null

    playImg.setAttribute('src', path.join(__dirname, '../../assets/icons/play-color.png'))
    playImg.setAttribute('style', 'cursor:pointer;')

    uploadImg.setAttribute('src', path.join(__dirname, '../../assets/icons/upload.png'))
    uploadImg.setAttribute('style', 'cursor:pointer;')
})

analytics.addEventListener('click', () => {
    ipcRenderer.send('analytics:open')
})