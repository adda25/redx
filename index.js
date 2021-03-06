#!/usr/bin/env node

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
*                                                                                    *
*                              ____          ___  __                                 *
*                             |  _ \ ___  __| \ \/ /                                 *
*                             | |_) / _ \/ _` |\  /                                  *
*                             |  _ <  __/ (_| |/  \                                  *
*                             |_| \_\___|\__,_/_/\_\                                 *
*                                                                                    *
*                                                                                    *
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * **  
*                                                                                    *
*   The MIT License (MIT)                                                            *
*                                                                                    *
*   Copyright (c) 2020 Amedeo Setti, ProM Facility                                   *
*                                                                                    *
*   Permission is hereby granted, free of charge, to any person obtaining a copy     *
*   of this software and associated documentation files (the "Software"), to deal    *
*   in the Software without restriction, including without limitation the rights     *
*   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell        *
*   copies of the Software, and to permit persons to whom the Software is            *
*   furnished to do so, subject to the following conditions:                         *
*                                                                                    *
*   The above copyright notice and this permission notice shall be included in all   *
*   copies or substantial portions of the Software.                                  *
*                                                                                    *
*   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR       *
*   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,         *
*   FITNESS FOR A PARTICULAR PURPOSE AND NON INFRINGEMENT. IN NO EVENT SHALL THE     *
*   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER           *
*   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,    *
*   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE    *
*   SOFTWARE                                                                         *
*                                                                                    *
* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

'use strict'

if (require.main === module) {
    const args = process.argv.slice(2)
    const forkRedx = function () {
        let child_process = require('child_process')
        let forker = child_process.fork(__dirname + '/src/redx.js', 
            args, {detached: true, silent: false})
        forker.disconnect()
        forker.unref()
        process.exit()
    }
    const ifRedxNotRunning = function (cb) {
        let RedX = require('./src/redx')
        let redx = new RedX(args)
        redx.isActive((status) => {
            if (status === 'No server available') {
                cb(redx)
            } else {
                console.log('Server already running')
            }
        })
    }
    const ifRedxRunning = function (cb) {
        let RedX = require('./src/redx')
        let redx = new RedX(args)
        redx.isActive((status) => {
            if (status === 'No server available') {
                console.log('No server available')
            } else {
                cb(redx)
            }
        })
    }

    if ((args.length == 1 || args.length == 2) && args[0] == 'start') { // Start RedX
        ifRedxNotRunning(() => { forkRedx() })
    } else if ((args.length == 1 || args.length == 2) && args[0] == 'it') { // Start RedX without forking
        ifRedxNotRunning((redx) => { redx.start() })
    } else if (args.length == 1 && args[0] == 'reload') { // Reload the server
        ifRedxRunning((redx) => { redx.reload() })
    } else if (args.length == 1 && args[0] == 'restart') { // Restart the server
        ifRedxRunning((redx) => { redx.killWorkers(); setTimeout(function () { forkRedx() }, 2000) })
    } else if (args.length == 1 && args[0] == 'stop') { // Stop the server
        ifRedxRunning((redx) => { redx.stop() })
    } else if (args.length == 1 && args[0] == 'status') {
        ifRedxRunning((redx) => { redx.status() })
    } else if (args.length == 1 && args[0] == 'version') {
        console.log(require('./package.json').version)
    } else if (args.length == 2 && args[0] == 'show' && args[1] == 'running-config') {
        ifRedxRunning((redx) => { redx.showRunningConfig() })
    } else if (args.length == 2 && args[0] == 'systemd' && args[1] == 'conf') {
        console.log(require('./src/systemd/create')(process.cwd()))
    } else if (args.length == 2 && args[0] == 'systemd' && args[1] == 'install') {
        let fs = require('fs')
        let systemdConf = require('./src/systemd/create')(process.cwd())
        fs.writeFile('/etc/systemd/system/redx.service', systemdConf, 'utf-8', () => {})
    } else if (args.length > 1 && args[0] == 'cli') { // Run as cli
        ifRedxNotRunning((redx) => { redx.startCli() })
    }
} else {
    // Run as module
    module.exports = require('./src/redx') 
}

