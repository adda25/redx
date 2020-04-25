'use strict'

let fs = require('fs')
let path = require('path')
let commands = require ('../magic/magic').commands()
let operators = require ('../magic/magic').operators()

function parseCfg (filename) {
    try {
        let file = 'redx.conf'
        if (filename !== undefined) {
            file = filename
        } 
        var contents = fs.readFileSync(path.join(file), 'utf8')
        let cmds = []
        contents = contents.split('\n')
        let _contents = contents.map((r) => { return r.match(/\S+/g)})
        let _args = []
        _contents.forEach(function (c) {
            if (c !== null  && c[0][0] !== '#') {
                _args.push(c)
            }
        })
        let args = []
        _args.forEach (function (cmd) {
            args = args.concat(cmd)
        })
        let isCommand = false
        let lastFrom = ''
        let escaping = false
        for (var i = 0; i < args.length; i +=1) {
            if (isCommand == true && commands.includes(args[i])) {
                console.log('Error, two commands in row without values:', args[i-1], args[i], 'at', lastFrom)
                process.exit()
            }
            if (commands.includes(args[i])) {
                if (args[i] == 'from') {
                    lastFrom = args[i+1]
                }
                cmds.push({cmd: args[i], value: []})
                isCommand = true
            } else if (args[i] !== null && args[i][0] !== '#') {
                // Allow the user to use string with spaces as unique values
                if (args[i][0] == operators.escapeString && escaping == false) {
                    cmds[cmds.length - 1].value.push(args[i].substr(1)) 
                    escaping = true
                } else if (escaping == true && args[i][args[i].length - 1] !== operators.escapeString) {
                    cmds[cmds.length - 1].value[cmds[cmds.length - 1].value.length - 1] += ' ' + args[i]
                } else if (escaping == true && args[i][args[i].length - 1] === operators.escapeString) {
                    cmds[cmds.length - 1].value[cmds[cmds.length - 1].value.length - 1] += ' ' + args[i].substring(0, args[i].length - 1)
                    escaping = false
                } else {
                    cmds[cmds.length - 1].value.push(args[i])   
                }
                isCommand = false
            }
        }
        return cmds
    } catch (err) {
        return []
    }
}

function parseCli (args) {
    let cmds = []
    let isCommand = false
    let lastFrom = ''
    for (var i = 0; i < args.length; i +=1) {
        if (isCommand == true && commands.includes(args[i])) {
            console.log('Error, two commands in row without values:', args[i-1], args[i], 'at', lastFrom)
            process.exit()
        }
        if (commands.includes(args[i])) {
            if (args[i] == 'from') {
                lastFrom = args[i+1]
            }
            cmds.push({cmd: args[i], value: []})
            isCommand = true
        } else {
            cmds[cmds.length - 1].value.push(args[i])
            isCommand = false
        }
    }
    return cmds
}

module.exports = {
	cfg (args) {
        let file = undefined
        if (args !== undefined && args[0] === 'check') {
            args.shift()
        }
        file = args == undefined ? undefined : args[0]
        let cmds = parseCfg(file)
        return cmds
	},

	cli (args) {
        if (args[0] === 'cli') {
            args.shift()
        }
        let cmds = parseCli(args)
        return cmds
	},

	commands (redx, cmds) {
        let revUnit = undefined
        redx.units = new Map()
        cmds.forEach(function (c) {
            if (revUnit == undefined) {
                revUnit = redx._cli(c.cmd, c.value)
            } else if (c.cmd === 'from') {
                revUnit = redx._cli(c.cmd, c.value)
            } else {
                revUnit = revUnit._cli(c.cmd, c.value)
            }
        }.bind(redx))
        return redx
	}
}