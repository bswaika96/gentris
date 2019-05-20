const util = require('./util')

const Analyzer = function (dataset) {
    this.data = dataset

    this.colors = {
        orange: '#ff662f',
        lightOrange: '#ff875cda',
        lighterOrange: '#ff875c55',
        blue: '#0e51c6',
        lightBlue: '#0e51c6da',
        lighterBlue: '#0e51c655',
    }
}

Analyzer.prototype.getMethodDescription = function(){
    const config = util.clone(this.data.config)

    let title = '<h2 class="brand-blue"><span class="bold">Method</span> Description</h2><hr class="analytics-title-separator">'

    let description = title + '<p>'
    description += `No. of Generations: <span class="bold brand-orange">${config.gens}</span><br>`
    description += `Population Size: <span class="bold brand-orange">${config.popSize}</span><br>`
    description += `Mutation Rate: <span class="bold brand-orange">${config.mutRate}</span><br>`
    description += `Mutation Step: <span class="bold brand-orange">${config.mutStep}</span><br>`
    description += `Selection Rate: <span class="bold brand-orange">Top ${config.selection*100} %</span><br>`
    description += `Type of Controller: <span class="bold brand-orange">${config.controller === 1 ? 'One-Piece' : 'Two-Piece' }</span><br>`
    description += `Type of CrossOver: <span class="bold brand-orange">${config.crossover === 'random' ? 'Children are made by selecting each gene from a random parent.' : 'Children are made by averaging each gene from both parents.'}</span><br></p>`

    return description
}

Analyzer.prototype.getEliteFitnessVsGenerationChart = function(){
    const elites = util.clone(this.data.elites)

    const fitnessSeries = []
    const labels = []

    let i = 0

    elites.forEach((elite) => {
        fitnessSeries.push(elite.fitness)
        labels.push(i++)     
    })

    const chart = {
        type: 'line',
        data:{
            labels,
            datasets: [{
                label: 'Fitness',
                data: fitnessSeries,
                borderColor: this.colors.orange,
                backgroundColor: this.colors.lighterOrange
            }],
        },
        options: {
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display:true,
                        labelString: 'Fitness'
                    },
                    ticks: {
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    scaleLabel: {
                        display:true,
                        labelString: 'Generation'
                    }
                }]
            }
        }
    }

    return chart
}

Analyzer.prototype.getGenomeFitnessVsPopulationSizeEvolutionChart = function() {
    const generations = util.clone(this.data.genomes)
    const datasets = []
    const labels = []

    let i = 0, counter = 0

    generations.forEach((generation, index) => {
        const genomeFitness = []
        generation.forEach((genome) => {
            genomeFitness.push(genome.fitness)
            if(index === 0)
                labels.push(i++)
        })
        let r = Math.abs(Math.floor((((counter/this.data.config.gens) * 14) + (((counter/this.data.config.gens) - 1) * 255))))
        let g = Math.abs(Math.floor((((counter/this.data.config.gens) * 81) + (((counter/this.data.config.gens) - 1) * 102))))
        let b = Math.abs(Math.floor((((counter/this.data.config.gens) * 198) + (((counter/this.data.config.gens) - 1) * 47)))) 
        datasets.push({
            label: 'Generation ' + (counter+1),
            data: genomeFitness,
            borderColor: `rgb(${r}, ${g}, ${b})`,
            backgroundColor: 'rgba(0,0,0,0)'
        })
        counter++
    })

    const chart = {
        type: 'line',
        data:{
            labels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display:true,
                        labelString: 'Fitness'
                    },
                    ticks: {
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    scaleLabel: {
                        display:true,
                        labelString: 'Genome'
                    }
                }]
            }
        }
    }

    return chart
}

Analyzer.prototype.getCorrelationChart = function() {
    const generations = util.clone(this.data.genomes)

    const rawData = []
    const procData = {}
    const correlation = {}

    generations.forEach((generation) => {
        generation.forEach((genome) => {
            let g = {}
            for(let gene in genome){
                if(gene !== 'id'){
                    g[gene] = genome[gene]
                }
            }
            rawData.push(g)
        })
    })

    for(let property in rawData[0]){
        procData[property] = []
    }

    rawData.forEach((data) => {
        for(let property in data){
            procData[property].push(data[property])
        }
    })

    for(let property in procData){
        if(property !== 'fitness'){
            correlation[property] = Number(this.getCorrelation(procData[property], procData['fitness']))
        }
    }

    const data = []
    const labels = []
    for(let property in correlation){
        labels.push(property+' : '+correlation[property].toFixed(2))
        data.push(correlation[property])
    }

    const chart = {
        type: 'radar',
        data:{
            labels,
            datasets : [{
                label: 'Correlation',
                data,
                borderColor: this.colors.orange,
                backgroundColor: this.colors.lighterOrange
            }]
        },
        options: {}
    }

    return chart
}

Analyzer.prototype.getBestFitEliteWeightsChart = function () {
    let maxFitness = 0
    let e = null

    this.data.elites.forEach((elite) => {
        if(elite.fitness > maxFitness){
            maxFitness = elite.fitness
            e = elite
        }
    })

    let factor = 50
    let counter = 0
    const data = {
        datasets: []
    }

    for(let gene in e){
        if(gene !== 'fitness' && gene !== 'id'){
            data.datasets.push({
                label: [gene],
                data: [{
                    x: counter,
                    y: e[gene],
                    r: Math.abs(Math.ceil(e[gene] * factor))
                }],
                backgroundColor: this.colors.lighterOrange,
                borderColor: this.colors.orange,
                borderWidth: 3
            })
            counter++
        }
    }

    const chart = {
        type: 'bubble',
        data,
        options: {
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display:true,
                        labelString: 'Weight Value'
                    },
                    ticks: {
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    scaleLabel: {
                        display:true,
                        labelString: 'Weight'
                    }
                }]
            }
        }
    }

    return chart    
}

Analyzer.prototype.getGenerationWiseMeanFitness = function(){
    const generations = util.clone(this.data.genomes)

    const rawData = []
    const meanData = []
    const varData = []
    const labels = []
    let counter = 0

    generations.forEach((generation) => {
        const gen = []
        generation.forEach((genome) => {
            gen.push(genome.fitness)
        })
        rawData.push(gen)
    })

    rawData.forEach((generation) => {
        meanData.push(Number(this.getMean(generation).toFixed(2)))
        varData.push(Number(Math.pow(this.getStdDev(generation), 2).toFixed(2)))
        labels.push(counter++)
    })

    const chart = {
        type: 'bar',
        data:{
            labels,
            datasets: [{
                label: 'Mean',
                data: meanData,
                borderColor: this.colors.orange,
                borderWidth: 1,
                backgroundColor: this.colors.lighterOrange
            },{
                label: 'Variance',
                data: varData,
                borderColor: this.colors.blue,
                borderWidth: 1,
                backgroundColor: this.colors.lighterBlue
            }],
        },
        options: {
            scales: {
                yAxes: [{
                    scaleLabel: {
                        display:true,
                        labelString: 'Fitness'
                    },
                    ticks: {
                        beginAtZero: true
                    }
                }],
                xAxes: [{
                    scaleLabel: {
                        display:true,
                        labelString: 'Generation'
                    }
                }]
            }
        }
    }

    return chart

}

Analyzer.prototype.getMean = function(data){
    let sum = 0
    let length = data.length

    data.forEach((point) => {
        sum+=point
    })

    return (sum / length)
}

Analyzer.prototype.getStdDev = function(data){
    let mean = this.getMean(data)

    let sum = 0
    let length = data.length

    data.forEach((point) => {
        sum += Math.pow((point-mean),2)
    })

    return Math.sqrt((sum/length))
}

Analyzer.prototype.getCorrelation = function(independant, dependant){
    let meanI = this.getMean(independant),
        meanD = this.getMean(dependant),
        sdI = this.getStdDev(independant),
        sdD = this.getStdDev(dependant)

    let sum = 0,
        length = independant.length
    
    independant.forEach((point, index) => {
        sum += ((point - meanI) * (dependant[index] - meanD))
    })

    return (sum / (sdI * sdD * length)).toFixed(2)
}

module.exports = Analyzer