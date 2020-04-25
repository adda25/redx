'use strict'

const http = require('http')

function getPage (code, text) {
    return `<!DOCTYPE html>
    <html>
    <head>
    <title>Welcome to RedX</title>
    <style>
        body {
            width: 100vw;
            height: 100vh;
            margin: 0 auto;
            font-family: Tahoma, Verdana, Arial, sans-serif;
            #background: #333333;  /* fallback for old browsers */
            #background: -webkit-linear-gradient(to bottom, #dd1818, #333333);  /* Chrome 10-25, Safari 5.1-6 */
            #background: linear-gradient(to bottom, #ff1818, #cc1818); /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
            color: #cc1818;
        }
        .mex {
            position:fixed;
            top: 50%;
            left: 50%;
            width: 30em;
            height: 120px;
            margin-top: -10em;
            margin-left: -15em;
            text-align: center;
        }
    </style>
    </head>
    <body>
        <div class="mex">
            <h1 style="font-size:100px;">RedX</h1>
        </div>
    </body>
    </html>`
}

module.exports = () => {
    return getPage()
}