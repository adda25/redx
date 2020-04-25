'use strict'

const http = require('http')

function getPage (basepath, files) {
    let _files = ''
    files.forEach((f) => { _files +=  '<a href="' + encodeURI(f.link) + '">' + f.name  + '</a><br>'})
    return `<!DOCTYPE html>
    <html>
    <head>
    <title>Welcome to RedX</title>
    <style>
        body {
            font-family: Tahoma, Verdana, Arial, sans-serif;
            color: #cc1818;
        }
    </style>
    </head>
    <body style="padding: 0px 15px 15px 15px">
        <div class="mex">
            <h2>RedX</h2> <h5 style="color: black"> ` + basepath + `</h5>
        </div>
        
        <br>
        ` + _files + `
    </body>
    </html>`
}

module.exports = (basepath, files) => {
    return getPage(basepath, files)
}