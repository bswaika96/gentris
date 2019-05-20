const remote = require('electron').remote

function init() {
    let window = remote.getCurrentWindow()
    const minButton = document.getElementById('min-button'),
        closeButton = document.getElementById('close-button')

    minButton.addEventListener("click", event => {
        window = remote.getCurrentWindow();
        window.minimize()
    })

    closeButton.addEventListener("click", event => {
        window = remote.getCurrentWindow()
        window.close()
    })
}

init()