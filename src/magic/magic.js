'use strict' 

const _commands = [
    'configure',
    'define', 
    'run', 
    'mark',
    'from',
    'log',
    'use',
    'allow',
    'deny',
    'balance',
    'to',
    'proxy',
    'redirect',
    'serve',
    'step',
    'exec',
    'replace',
    'request',
    'response'
]

const _operators = {
    escapeString: '"'
}

module.exports = {
    commands () {
        return _commands
    },

    operators () {
        return _operators
    }
}