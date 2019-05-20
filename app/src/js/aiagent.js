const util = require('./util')
const {ipcRenderer} = require('electron')


const AIAgent = function (game, config, weights) {
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

    this.weights = weights

    this.roundState = undefined
    this.lastState = undefined

    this.draw = true
    this.interval = undefined
}

AIAgent.prototype.start = function () {

    this.draw = true

    this.game.nextShape()
    this.game.applyShape()
    this.game.render()

    this.roundState = this.game.getState()

    let gameLoop = () => {
        if (!this.game.isOver) {
            this.update()
        } else {
            this.stop()
        }
    }
    this.interval = setInterval(gameLoop, 10)
}

AIAgent.prototype.update = function () {
    var results = this.moveDown();
    if (results) {
        if (!results.moved) {
            if (results.lose) {
                this.game.isOver = true
            } else {
                this.makeNextMove();
            }
        }
        if (this.draw)
            this.game.render()
    }
}

AIAgent.prototype.stop = function () {
    clearInterval(this.interval)
    this.interval = undefined
    this.game.render()
    
    ipcRenderer.send('sim:agent:complete')
}

AIAgent.prototype.moveDown = function () {
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

AIAgent.prototype.getAllPossibleMoves = function () {
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
                rating += util.clone(algorithm.rowsCleared) * util.clone(this.weights.rowsCleared)
                rating += util.clone(algorithm.weightedHeight) * util.clone(this.weights.weightedHeight)
                rating += util.clone(algorithm.cumulativeHeight) * util.clone(this.weights.cumulativeHeight)
                rating += util.clone(algorithm.relativeHeight) * util.clone(this.weights.relativeHeight)
                rating += util.clone(algorithm.holes) * util.clone(this.weights.holes)
                rating += util.clone(algorithm.roughness) * util.clone(this.weights.roughness)

                if(this.config.weights.blockades){
                    rating += util.clone(algorithm.blockades) * util.clone(this.weights.blockades)
                }
                if(this.config.weights.wells){
                    rating += util.clone(algorithm.wells) * util.clone(this.weights.wells)
                }
                if(this.config.weights.blocks){
                    rating += util.clone(algorithm.blocks) * util.clone(this.weights.blocks)
                }
                if(this.config.weights.weightedBlocks){
                    rating += util.clone(algorithm.weightedBlocks) * util.clone(this.weights.weightedBlocks)
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

AIAgent.prototype.getHighestRatedMove = function (moves) {
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

AIAgent.prototype.makeNextMove = function () {
    this.game.movesTaken++;
    if (this.game.movesTaken > this.game.moveLimit) {
        this.game.isOver = true
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

AIAgent.prototype.getConfig = function () {
    return util.clone(this.config)
}

module.exports = AIAgent