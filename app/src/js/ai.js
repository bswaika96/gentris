const util = require('./util')
const {ipcRenderer} = require('electron')


const AI = function (game, config) {
    this.game = game
    
    if(!config){
        this.config = {
            popSize: 50,
            gens: 50,
            mutRate: 0.05,
            mutStep: 0.2,
            controller: 2,
            selection: 0.5,
            crossover: 'random',
            weights: {
                blocks: false,
                wells: false,
                blockades: false,
                weightedBlocks: false
            }
        }
    }else{
        this.config = config
    }
    
    this.populationSize = this.config.popSize
    this.genomes = []
    this.currentGenome = -1
    this.generation = 0
    this.mutationRate = this.config.mutRate
    this.mutationStep = this.config.mutStep

    this.roundState = undefined
    this.lastState = undefined

    this.archive = {
        config: {},
        elites: [],
        genomes: []
    }

    this.draw = true
    this.interval = undefined

    this.visualComponents = {
        generation: document.querySelector('.console .generation .place'),
        genome: document.querySelector('.console .genome .place')
    }
}

AI.prototype.start = function () {
    this.archive.config = this.config

    this.draw = true

    this.game.nextShape()
    this.game.applyShape()
    this.game.render()

    this.roundState = this.game.getState()

    this.createInitialPopulation()

    let gameLoop = () => {
        if (!this.game.isOver) {
            this.update()
        } else {
            this.game.reset()
        }
    }
    this.interval = setInterval(gameLoop, 10)
}

AI.prototype.update = function () {
    var results = this.moveDown();
    if (results) {
        if (!results.moved) {
            if (results.lose) {
                this.genomes[this.currentGenome].fitness = util.clone(this.game.score);
                this.game.reset()
                this.evaluateNextGenome();
            } else {
                this.makeNextMove();
            }
        }
        if (this.draw)
            this.game.render()
    } else {
        clearInterval(this.interval)
        this.interval = undefined
        this.start()
    }
}

AI.prototype.stop = function () {
    clearInterval(this.interval)
    this.interval = undefined
    
    console.log(this.archive)

    this.game.render()

    this.game.reset()
    this.genomes = []
    this.generation = -1

    this.renderGenome()
    
    ipcRenderer.send('sim:complete', this.archive)
}

AI.prototype.moveDown = function () {
    if (this.game.currentShape.shape !== undefined) {
        let result = {
            lose: false,
            moved: true,
            rowsCleared: 0
        }
        this.game.removeShape()
        this.game.currentShape.y++
        if (util.collides(this.game.board, this.game.currentShape)) {
            this.game.currentShape.y--
            this.game.applyShape()
            this.game.nextShape()
            result.rowsCleared = this.game.clearRows()
            if (util.collides(this.game.board, this.game.currentShape) || this.game.movesTaken === this.game.moveLimit) {
                result.lose = true
            }
            result.moved = false
        }
        if (!result.lose) {
            this.game.applyShape()
        }
        if (this.draw)
            this.game.render()
        return result
    }
    return undefined
}

AI.prototype.makeChild = function (mum, dad) {
    let child
    if(this.config.crossover === 'random'){
        child = {
            id: Math.random(),
            rowsCleared: util.randomChoice(mum.rowsCleared, dad.rowsCleared),
            weightedHeight: util.randomChoice(mum.weightedHeight, dad.weightedHeight),
            cumulativeHeight: util.randomChoice(mum.cumulativeHeight, dad.cumulativeHeight),
            relativeHeight: util.randomChoice(mum.relativeHeight, dad.relativeHeight),
            holes: util.randomChoice(mum.holes, dad.holes),
            roughness: util.randomChoice(mum.roughness, dad.roughness),
            fitness: -1
        }
        if(this.config.weights.blockades){
            child.blockades = util.randomChoice(mum.blockades, dad.blockades)
        }
        if(this.config.weights.wells){
            child.wells = util.randomChoice(mum.wells, dad.wells)
        }
        if(this.config.weights.blocks){
            child.blocks = util.randomChoice(mum.blocks, dad.blocks)
        }
        if(this.config.weights.weightedBlocks){
            child.weightedBlocks = util.randomChoice(mum.weightedBlocks, dad.weightedBlocks)
        }
    }else{
        child = {
            id: Math.random(),
            rowsCleared: (mum.rowsCleared+dad.rowsCleared)/2,
            weightedHeight: (mum.weightedHeight+dad.weightedHeight)/2,
            cumulativeHeight: (mum.cumulativeHeight+dad.cumulativeHeight)/2,
            relativeHeight: (mum.relativeHeight+dad.relativeHeight)/2,
            holes: (mum.holes+dad.holes)/2,
            roughness: (mum.roughness+dad.roughness)/2,
            fitness: -1
        }
        if(this.config.weights.blockades){
            child.blockades = (mum.blockades+dad.blockades)/2
        }
        if(this.config.weights.wells){
            child.wells = (mum.wells+dad.wells)/2
        }
        if(this.config.weights.blocks){
            child.blocks = (mum.blocks+dad.blocks)/2
        }
        if(this.config.weights.weightedBlocks){
            child.weightedBlocks = (mum.weightedBlocks+dad.weightedBlocks)/2
        }
    }
    
    if (Math.random() < this.mutationRate) {
        child.rowsCleared = child.rowsCleared + Math.random() * this.mutationStep * 2 - this.mutationStep
    }
    if (Math.random() < this.mutationRate) {
        child.weightedHeight = child.weightedHeight + Math.random() * this.mutationStep * 2 - this.mutationStep
    }
    if (Math.random() < this.mutationRate) {
        child.cumulativeHeight = child.cumulativeHeight + Math.random() * this.mutationStep * 2 - this.mutationStep
    }
    if (Math.random() < this.mutationRate) {
        child.relativeHeight = child.relativeHeight + Math.random() * this.mutationStep * 2 - this.mutationStep
    }
    if (Math.random() < this.mutationRate) {
        child.holes = child.holes + Math.random() * this.mutationStep * 2 - this.mutationStep
    }
    if (Math.random() < this.mutationRate) {
        child.roughness = child.roughness + Math.random() * this.mutationStep * 2 - this.mutationStep
    }

    if(this.config.weights.blockades && Math.random() < this.mutationRate){
        child.blockades = child.blockades + Math.random() * this.mutationStep * 2 - this.mutationStep
    }
    if(this.config.weights.wells && Math.random() < this.mutationRate){
        child.wells = child.wells + Math.random() * this.mutationStep * 2 - this.mutationStep
    }
    if(this.config.weights.blocks && Math.random() < this.mutationRate){
        child.blocks = child.blocks + Math.random() * this.mutationStep * 2 - this.mutationStep
    }
    if(this.config.weights.weightedBlocks && Math.random() < this.mutationRate){
        child.weightedBlocks = child.weightedBlocks + Math.random() * this.mutationStep * 2 - this.mutationStep
    }

    return child
}

AI.prototype.getRandomGenome = function () {
    return this.genomes[util.randomWeightedNumBetween(0, this.genomes.length - 1)]
}

AI.prototype.evolve = function () {
    console.log("Generation " + this.generation + " evaluated.")
    this.currentGenome = 0
    this.generation++

    this.archive.genomes.push(util.clone(this.genomes))
    
    this.genomes.sort(function (a, b) {
        return b.fitness - a.fitness
    });
    this.archive.elites.push(util.clone(this.genomes[0]))
    console.log("Elite's fitness: " + this.genomes[0].fitness)
    

    if(this.generation === this.config.gens){
        this.stop()
    }else{
        this.game.reset()
        this.roundState = this.game.getState()

        while (this.genomes.length > Math.floor(this.populationSize * this.config.selection)) {
            this.genomes.pop()
        }
        var totalFitness = 0
        for (var i = 0; i < this.genomes.length; i++) {
            totalFitness += this.genomes[i].fitness
        }

        var children = []
        children.push(util.clone(this.genomes[0]));
        while (children.length < this.populationSize) {
            children.push(this.makeChild(this.getRandomGenome(), this.getRandomGenome()))
        }

        this.genomes = []
        this.genomes = this.genomes.concat(children)
    }
}

AI.prototype.getAllPossibleMoves = function () {
    let lastState = this.game.getState()
    let possibleMoves = []
    let iterations = 0
    for (let rots = 0; rots < 4; rots++) {
        let oldX = []
        for (let t = -5; t <= 5; t++) {
            iterations++
            this.game.setState(lastState)
            for (let j = 0; j < rots; j++) {
                this.game.rotateShape()
            }
            if (t < 0) {
                for (let l = 0; l < Math.abs(t); l++) {
                    this.game.moveLeft()
                }
            } else if (t > 0) {
                for (let r = 0; r < t; r++) {
                    this.game.moveRight()
                }
            }
            if (!util.contains(oldX, this.game.currentShape.x)) {
                let moveDownResults = this.moveDown()
                while (moveDownResults.moved) {
                    moveDownResults = this.moveDown()
                }
                let algorithm = {
                    rowsCleared: moveDownResults.rowsCleared,
                    weightedHeight: Math.pow(this.game.getHeight(), 1.5),
                    cumulativeHeight: this.game.getCumulativeHeight(),
                    relativeHeight: this.game.getRelativeHeight(),
                    holes: this.game.getHoles(),
                    roughness: this.game.getRoughness()
                }

                if(this.config.weights.blockades){
                    algorithm.blockades = this.game.getBlockades()
                }
                if(this.config.weights.wells){
                    algorithm.wells = this.game.getWellsSum()
                }
                if(this.config.weights.blocks){
                    algorithm.blocks = this.game.getBlocks()
                }
                if(this.config.weights.weightedBlocks){
                    algorithm.weightedBlocks = this.game.getWeightedBlocks()
                }

                let rating = 0
                rating += util.clone(algorithm.rowsCleared) * util.clone(this.genomes[this.currentGenome].rowsCleared)
                rating += util.clone(algorithm.weightedHeight) * util.clone(this.genomes[this.currentGenome].weightedHeight)
                rating += util.clone(algorithm.cumulativeHeight) * util.clone(this.genomes[this.currentGenome].cumulativeHeight)
                rating += util.clone(algorithm.relativeHeight) * util.clone(this.genomes[this.currentGenome].relativeHeight)
                rating += util.clone(algorithm.holes) * util.clone(this.genomes[this.currentGenome].holes)
                rating += util.clone(algorithm.roughness) * util.clone(this.genomes[this.currentGenome].roughness)

                if(this.config.weights.blockades){
                    rating += util.clone(algorithm.blockades) * util.clone(this.genomes[this.currentGenome].blockades)
                }
                if(this.config.weights.wells){
                    rating += util.clone(algorithm.wells) * util.clone(this.genomes[this.currentGenome].wells)
                }
                if(this.config.weights.blocks){
                    rating += util.clone(algorithm.blocks) * util.clone(this.genomes[this.currentGenome].blocks)
                }
                if(this.config.weights.weightedBlocks){
                    rating += util.clone(algorithm.weightedBlocks) * util.clone(this.genomes[this.currentGenome].weightedBlocks)
                }

                if (moveDownResults.lose) {
                    rating -= 500
                }
                possibleMoves.push({ rotations: rots, translation: t, rating: rating, algorithm: algorithm })
                oldX.push(this.game.currentShape.x)
            }
        }
    }
    this.game.setState(lastState);
    return possibleMoves;
}

AI.prototype.getHighestRatedMove = function (moves) {
    let maxRating = -10000000000000
    let maxMove = -1
    let ties = []
    for (let index = 0; index < moves.length; index++) {
        if (moves[index].rating > maxRating) {
            maxRating = moves[index].rating
            maxMove = index
            ties = [index]
        } else if (moves[index].rating == maxRating) {
            ties.push(index)
        }
    }
    let move = moves[ties[0]]
    move.algorithm.ties = ties.length
    return move
}

AI.prototype.makeNextMove = function () {
    this.game.movesTaken++;
    if (this.game.movesTaken > this.game.moveLimit) {
        this.genomes[currentGenome].fitness = util.clone(this.game.score)
        this.game.reset()
        this.evaluateNextGenome()
    } else {
        let oldDraw = util.clone(this.draw)
        this.draw = false
        let possibleMoves = this.getAllPossibleMoves()
        let lastState = this.game.getState()
        if(this.config.controller === 2){
            this.game.nextShape()
            for (let i = 0; i < possibleMoves.length; i++) {
                let nextMove = this.getHighestRatedMove(this.getAllPossibleMoves())
                possibleMoves[i].rating += nextMove.rating
            }
        }
        this.game.setState(lastState)
        let move = this.getHighestRatedMove(possibleMoves)
        for (let rotations = 0; rotations < move.rotations; rotations++) {
            this.game.rotateShape()
        }
        if (move.translation < 0) {
            for (let lefts = 0; lefts < Math.abs(move.translation); lefts++) {
                this.game.moveLeft()
            }
        } else if (move.translation > 0) {
            for (let rights = 0; rights < move.translation; rights++) {
                this.game.moveRight()
            }
        }
        this.draw = oldDraw
        if (this.draw)
            this.game.render()
    }
}

AI.prototype.evaluateNextGenome = function () {
    this.currentGenome++
    if (this.currentGenome == this.genomes.length) {
        this.evolve()
    }
    if(this.genomes.length > 0){
        this.renderGenome()
        this.game.setState(this.roundState)
        this.game.movesTaken = 0
        this.makeNextMove()
    }
}

AI.prototype.createInitialPopulation = function () {
    this.genomes = []
    for (let i = 0; i < this.populationSize; i++) {
        let genome = {
            id: Math.random(),
            rowsCleared: Math.random() - 0.5,
            weightedHeight: Math.random() - 0.5,
            cumulativeHeight: Math.random() - 0.5,
            relativeHeight: Math.random() - 0.5,
            holes: Math.random() * 0.5,
            roughness: Math.random() - 0.5,
        }
        if(this.config.weights.blockades){
            genome.blockades = Math.random() - 0.5
        }
        if(this.config.weights.wells){
            genome.wells = Math.random() - 0.5
        }
        if(this.config.weights.blocks){
            genome.blocks = Math.random() - 0.5
        }
        if(this.config.weights.weightedBlocks){
            genome.weightedBlocks = Math.random() - 0.5
        }

        this.genomes.push(genome)
    }
    this.game.reset()
    this.evaluateNextGenome()
}

AI.prototype.renderGenome = function () {
    this.visualComponents.genome.innerHTML = ''
    if (this.currentGenome > -1 && this.currentGenome <= this.populationSize && this.genomes.length > 0) {
        this.renderGeneration()
        this.visualComponents.genome.innerHTML = `${this.currentGenome + 1}/${this.populationSize}`
    }
}

AI.prototype.renderGeneration = function () {
    this.visualComponents.generation.innerHTML = ''
    if (this.generation > -1) {
        this.visualComponents.generation.innerHTML = `${this.generation + 1}`
    }
}

AI.prototype.getConfig = function () {
    return util.clone(this.config)
}

module.exports = AI