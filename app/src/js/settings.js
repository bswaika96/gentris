const {ipcRenderer, remote} = require('electron')

let win = remote.getCurrentWindow()

const clicker = document.querySelector('.sidebar')

const components = {
    gens: document.querySelector('#gens'),
    gensText: document.querySelector('#gensText'),
    popSize: document.querySelector('#popSize'),
    popSizeText: document.querySelector('#popSizeText'),    
    mutRate: document.querySelector('#mutRate'),    
    mutRateText: document.querySelector('#mutRateText'),
    mutStep: document.querySelector('#mutStep'),
    mutStepText: document.querySelector('#mutStepText'),
    controller: [document.querySelector('#onePiece'), document.querySelector('#twoPiece')],
    selection: [document.querySelector('#top10'), document.querySelector('#top25'), document.querySelector('#top50')],
    crossover: [document.querySelector('#random'), document.querySelector('#average')],
    weights: [document.querySelector('#blockades'), document.querySelector('#wells'), document.querySelector('#blocks'), document.querySelector('#wblocks')]
}

components.gens.addEventListener('input', (e) => {
    components.gensText.value = components.gens.value
})

components.popSize.addEventListener('input', (e) => {
    components.popSizeText.value = components.popSize.value
})

components.mutRate.addEventListener('input', (e) => {
    components.mutRateText.value = components.mutRate.value
})

components.mutStep.addEventListener('input', (e) => {
    components.mutStepText.value = components.mutStep.value
})

const renderParams = (params) => {
    if(params.gens){
        components.gens.value = params.gens
        components.gensText.value = params.gens
    }
    if(params.popSize){
        components.popSize.value = params.popSize
        components.popSizeText.value = params.popSize
    }
    if(params.mutRate){
        components.mutRate.value = params.mutRate
        components.mutRateText.value = params.mutRate
    }
    if(params.mutStep){
        components.mutStep.value = params.mutStep
        components.mutStepText.value = params.mutStep
    }
    if(params.controller){
        components.controller.forEach((c) => {
            c.checked = false
        })
        components.controller[params.controller-1].checked = true
    }
    if(params.selection){
        components.selection.forEach((s) => {
            s.checked = false
        })
        if(params.selection === 0.1){
            components.selection[0].checked = true
        }
        if(params.selection === 0.25){
            components.selection[1].checked = true
        }
        if(params.selection === 0.5){
            components.selection[2].checked = true
        }
    }
    if(params.crossover){
        components.crossover.forEach((c) => {
            c.checked = false
        })
        if(params.crossover === 'random'){
            components.crossover[0].checked = true
        }
        if(params.crossover === 'average'){
            components.crossover[1].checked = true
        }
    }
    if(params.weights){
        if(params.weights.blockades){
            components.weights[0].checked = true
        }
        if(params.weights.wells){
            components.weights[1].checked = true
        }
        if(params.weights.blocks){
            components.weights[2].checked = true
        }
        if(params.weights.weightedBlocks){
            components.weights[3].checked = true
        }
    }
}

const generateSettings = () => {
    const settings = {}

    settings.popSize = Number(components.popSizeText.value)
    settings.gens = Number(components.gensText.value)
    settings.mutRate = Number(components.mutRateText.value)
    settings.mutStep = Number(components.mutStepText.value)
    
    components.controller.forEach((c, i) => {
        if(c.checked)
            settings.controller = i+1
    })

    components.selection.forEach((s, i) => {
        if(s.checked){
            if(i === 0){
                settings.selection = 0.1
            }else if(i === 1){
                settings.selection = 0.25
            }else{
                settings.selection = 0.5
            }
        }
    })

    components.crossover.forEach((c, i) => {
        if(c.checked){
            if(i === 0){
                settings.crossover = 'random'
            }else{
                settings.crossover = 'average'
            }
        }
    })

    settings.weights = {
        blocks: false,
        wells: false,
        blockades: false,
        weightedBlocks: false
    }

    components.weights.forEach((w, i) => {
        if(w.checked){
            if(i===0){
                settings.weights.blockades = true
            }
            if(i===1){
                settings.weights.wells = true
            }
            if(i===2){
                settings.weights.blocks = true
            }
            if(i===3){
                settings.weights.weightedBlocks = true
            }
        }
    })

    return settings
}

clicker.addEventListener('click',  (e) => {
    const settings = generateSettings()
    ipcRenderer.send('settings:close', settings)

    win.close()
})

ipcRenderer.on('params:update', (event, params) => {
    renderParams(params)
    win.show()
})