'use strict'

const net = require('net')

class Check {
    check (host, port, callback) {
        let client = new net.Socket()
        client.setTimeout(200)
        client.connect(port, host, function () {
        	client.emit('close')
        	callback(true)
        })
        client.on('error', function (data) {     
        	client.destroy()
            callback(false)
        })
        client.on('timeout', function (data) {            
            client.destroy()
            callback(false)
        })
        client.on('close', function () {
            client.destroy()
        })
    }
}


module.exports = Check