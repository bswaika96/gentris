const { app, BrowserWindow, ipcMain, dialog, powerSaveBlocker } = require('electron')
const path = require('path')
const fs = require('fs')

//Change this value to production while building and packaging
process.env.NODE_ENV = 'production'
            
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'

if (process.env.NODE_ENV !== 'production') {
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
    })
}

powerSaveBlocker.start('prevent-app-suspension')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win, settingsWin, analyticsWin

function createWindow() {
    // Create the browser window.
    win = new BrowserWindow({
        width: 500,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            backgroundThrottling: false,
            devTools: false
        },
        frame: false,
        show: false,
        resizable: false
    })

    win.setPosition(100, win.getPosition()[1])

    win.loadURL(path.join('file://', __dirname, '/app/views/index.html'))

    // Open the DevTools.
    // if (process.env.NODE_ENV !== 'production') {
    //     // win.webContents.openDevTools()
    // }

    win.once('ready-to-show', () => {
        win.show()
    })

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null
        app.quit()
    })

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.on('settings:open', (event, args) => {
    settingsWin = new BrowserWindow({
        width: 300,
        height: 700,
        frame: false,
        x: win.getPosition()[0] + win.getSize()[0] + 10,
        y: win.getPosition()[1],
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
            devTools: false
        },
        show: false,
        parent: win,
        modal: true,
        resizable: false
    })

    settingsWin.loadURL(path.join('file://', __dirname, '/app/views/settings.html'))
    
    settingsWin.once('ready-to-show', () => {
        settingsWin.webContents.send('params:update', args)
        // settingsWin.show()
    })    

    settingsWin.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        settingsWin = null
    })

})

ipcMain.on('settings:close', (event, args) => {
    win.webContents.send('params', args)
})

ipcMain.on('sim:complete', (event, args) => {
    win.webContents.send('sim:results', args)
})

ipcMain.on('sim:save', (event, args) => {
    const fileName = `data_${new Date().getTime().toString()}.json`
    let filePath = dialog.showSaveDialog(win, {
        defaultPath: path.join(__dirname, '/app/.data/', fileName),
        filters: [
            { name: 'JSON Data', extensions: ['json'] }
        ]
    })
    if(filePath){
        if(filePath.match(/\.json$/g))
            fs.writeFileSync(filePath, JSON.stringify(args))
        else{
            filePath = undefined
            dialog.showErrorBox('Error', 'Could not save file in the specified format. Please use extension .json to save the file!')
        }
    }
    win.webContents.send('sim:saved', filePath)
})

ipcMain.on('sim:agent:upload', (event, args) => {
    let filePath = dialog.showOpenDialog(win, {
        defaultPath: path.join(__dirname, '/app/.data/'),
        filters: [
            { name: 'JSON Data', extensions: ['json'] }
        ],
        properties: ['openFile', 'showHiddenFiles']
    })

    if(filePath){
        const dataJSON = fs.readFileSync(filePath[0])
        const data = JSON.parse(dataJSON)

        if(data.config && data.elites){
            let maxFitness = 0
            let e

            data.elites.forEach((elite) => {
                if(elite.fitness > maxFitness){
                    maxFitness = elite.fitness
                    e = elite
                }
            })

            win.webContents.send('sim:agent:start', {
                config: data.config,
                weights: e
            })
        }else{
            filePath = undefined
            dialog.showErrorBox('Error', 'Could not load file! Check either file data or file extension. Some things don\'t match!')
        }
    }else{
        win.webContents.send('sim:agent:noupload')
    }
})

ipcMain.on('sim:agent:complete', (event, args) => {
    win.webContents.send('sim:agent:done')
})

ipcMain.on('analytics:open', (event) => {
    analyticsWin = new BrowserWindow({
        width: 700,
        height: 700,
        frame: false,
        x: win.getPosition()[0] + win.getSize()[0] + 10,
        y: win.getPosition()[1],
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
            devTools: false
        },
        show: false,
        parent: win,
        modal: true,
        resizable: false
    })

    analyticsWin.loadURL(path.join('file://', __dirname, '/app/views/analytics.html'))

    analyticsWin.once('ready-to-show', () => {
        analyticsWin.show()
    })

    analyticsWin.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        analyticsWin = null
    })
})

function getFileName(filePath){
    let fileName = ''
    for(let i = filePath.length - 1; i >= 0; i--){
        if(filePath[i] === '/' || filePath[i] === '\\')
            break
        else
            fileName += filePath[i]
    }
    return fileName.split('').reverse().join('')
}

ipcMain.on('analytics:upload', (event) => {
    let filePath = dialog.showOpenDialog(analyticsWin, {
        defaultPath: path.join(__dirname, '/app/.data/'),
        filters: [
            { name: 'JSON Data', extensions: ['json'] }
        ],
        properties: ['openFile', 'showHiddenFiles']
    })

    if(filePath){
        const dataJSON = fs.readFileSync(filePath[0])
        const data = JSON.parse(dataJSON)

        if(data.config && data.elites && data.genomes){
            let fileName = getFileName(filePath[0])

            analyticsWin.webContents.send('analytics:run', {
                config: data.config,
                elites: data.elites,
                genomes: data.genomes,
                fileName: fileName
            })
        }else{
            filePath = undefined
            dialog.showErrorBox('Error', 'Could not load file! Check either file data or file extension. Some things don\'t match!')
        }
    }
})

ipcMain.on('img:save', (event, args) => {
    const fileName = `img_${new Date().getTime().toString()}.png`
    let filePath = dialog.showSaveDialog(analyticsWin, {
        defaultPath: path.join(__dirname, '/app/.img/', fileName),
        filters: [
            { name: 'PNG Files', extensions: ['png'] }
        ]
    })
    if(filePath){
        if(filePath.match(/\.png$/g))
            fs.writeFileSync(filePath, args, 'base64')
        else{
            filePath = undefined
            dialog.showErrorBox('Error', 'Could not save file in the specified format. Please use extension .png to save the file!')
        }
    }
    analyticsWin.webContents.send('img:saved')
})