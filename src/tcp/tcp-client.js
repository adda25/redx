'use strict'

const net = require('net')

class TcpClient {

    proxyRequest (x) {
        let client = new net.Socket()
        // client.setTimeout(1000) breaks ssh
        client.connect(x.pass.options.port, x.pass.options.host)
        client.on('data', function(data) {
            x.socket.write(data)
        })
        client.on('timeout', function (data) {            
            client.emit('close')
        })
        client.on('close', function() {
            console.log('Connection closed')
            client.destroy()
        })
        x.socket.pipe(client)
    }
}


module.exports = TcpClient