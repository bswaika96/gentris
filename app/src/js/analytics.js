const {ipcRenderer, remote} = require('electron')
const path = require('path')
const Chart = require('chart.js')

const h2c = require('html2canvas')

const Analyzer = require('./analyzer')

let win = remote.getCurrentWindow()

const resetHTML = document.querySelector('section.analytics').innerHTML

const clicker = document.querySelector('.sidebar')
const upload = document.querySelector('.analytics-menu .upload.control')

const download = document.querySelector('.analytics-menu .download.control')
const downloadImg = document.querySelector('.analytics-menu .download.control .control-icon')

const uploadName = document.querySelector('.analytics-menu .upload-file-name')

let analyzer = null

let analyticsDashboard = {}

upload.addEventListener('click', (e) => {
    ipcRenderer.send('analytics:upload')
})

ipcRenderer.on('analytics:run', (event, dataset) => {
    document.querySelector('section.analytics').innerHTML = resetHTML

    analyticsDashboard = {
        description: document.querySelector('section.analytics .method-description'),
        eliteFitnessVsGenerationDiv: document.querySelector('.efvg-title'),
        eliteFitnessVsGeneration: document.getElementById('chart-elite-fitness-vs-generation').getContext('2d'),
        genomeFitnessVsPopSizeDiv: document.querySelector('.gfvp-title'),
        genomeFitnessVsPopSize: document.getElementById('chart-genome-fitness-vs-popSize').getContext('2d'),
        generationMeanVarFitness: document.getElementById('chart-generation-mean-variance-fitness').getContext('2d'),
        correlationOfWeightsDiv: document.querySelector('.cow-title'),
        correlationOfWeights: document.getElementById('chart-correlation-of-weights').getContext('2d'),
        bestFitEliteWeightsDiv: document.querySelector('.bfew-title'),
        bestFitEliteWeights: document.getElementById('chart-best-fit-elite-weights').getContext('2d')
    }

    if(downloadImg.classList.contains('disabled'))
        downloadImg.classList.remove('disabled')

    downloadImg.setAttribute('src', path.join(__dirname, '../../assets/icons/download.png'))

    let fileName = dataset.fileName
    uploadName.textContent = fileName

    analyzer = new Analyzer(dataset)

    analyticsDashboard.description.innerHTML = analyzer.getMethodDescription()

    analyticsDashboard.eliteFitnessVsGenerationDiv.innerHTML = '<h2 class="brand-blue">Generation Wise <span class="bold">Elite Performance</span></h2><hr class="analytics-title-separator">'
    let EFVGChart = new Chart(analyticsDashboard.eliteFitnessVsGeneration, analyzer.getEliteFitnessVsGenerationChart())

    analyticsDashboard.genomeFitnessVsPopSizeDiv.innerHTML = '<h2 class="brand-blue"><span class="bold">Evolution</span> Visualisation</h2><hr class="analytics-title-separator">'
    let GFVPChart = new Chart(analyticsDashboard.genomeFitnessVsPopSize, analyzer.getGenomeFitnessVsPopulationSizeEvolutionChart())
    let GMVFChart = new Chart(analyticsDashboard.generationMeanVarFitness, analyzer.getGenerationWiseMeanFitness())

    analyticsDashboard.correlationOfWeightsDiv.innerHTML = '<h2 class="brand-blue">Correlation of <span class="bold">Weights</span> with <span class="bold">Fitness</span></h2><hr class="analytics-title-separator">'
    let COWChart = new Chart(analyticsDashboard.correlationOfWeights, analyzer.getCorrelationChart())

    analyticsDashboard.bestFitEliteWeightsDiv.innerHTML = '<h2 class="brand-blue"><span class="bold">Best Fit Elite</span> Weights</h2><hr class="analytics-title-separator">'
    let BFEWChart = new Chart(analyticsDashboard.bestFitEliteWeights, analyzer.getBestFitEliteWeightsChart())
})

download.addEventListener('click', () => {
    if(!downloadImg.classList.contains('disabled')){
        h2c(document.getElementById('export-analytics-to-img')).then((canvas) => {
            const img = canvas.toDataURL('image/png')
            ipcRenderer.send('img:save', img.replace(/^data:image\/png;base64,/,''))
        })
    }
})

clicker.addEventListener('click',  (e) => {
    win.close()
})