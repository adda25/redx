'use strict'

const net = require('net')
let StatsIPC = require('../ipc/stats')

class TcpServer {
    constructor (args) {
        this.sockets = new Set()
        this._protocol = 'tcp'
        this._port = args.port
        this._units = args.units
        this._debug = args.debug
        this._server = undefined
        this._statsEnable = args.statsEnable || false
        this._stats = {}
        if (this._statsEnable) {
            this._resetStats()
            setInterval(function () {
                StatsIPC.emitStat(60001, JSON.stringify(this._stats))
                this._resetStats()
            }.bind(this), 10000)
        }
        this.init()
    }

    hasUnit (unique) {
        let has = false
        this._units.some(function (u) {
            if (u._unique == unique) {
                has = u
                return true
            }
        }.bind(this))
        return has
    }

    addUnit (unit) {
        this._units.push(unit)
    }

    removeUnit (unit) {
        let _index = -1
        this._units.some(function (u, index) {
            if (u._unique == unit._unique) {
                _index = index
                return true
            }
        }.bind(this))
        if (_index !== -1) {
            this._units.splice(_index, 1)
        }
    }

    updateUnit (unit) {
        let indexToReplace = -1
        this._units.some(function (u, index) {
            if (u._unique == unit._unique) {
                indexToReplace = index
                return true
            }
        }.bind(this))
        if (indexToReplace !== -1) {
            this._units.splice(indexToReplace, 1, unit)    
            return true
        } else {
            return false
        }
    }

    close (callback) {
        for (const socket of this.sockets) {
            socket.destroy()
            this.sockets.delete(socket)
        }
        this._server.close(callback)
    }

    init () {
        if (this._debug) {
            console.log('W->' + process.pid, + Date.now() + ' run ' 
                + this._protocol.toUpperCase() + ' server on', this._port, this._protocol)
        }
        this._startTcpServer()
    }

    _startTcpServer () {
        this._server = net.createServer(function (_req, _res) {
            try {
                if (this._statsEnable == true) {
                    this._stats.totalRequests += 1    
                }
                this._onClientRequest(_req, _res)
            } catch (err) {
                if (this._debug) {console.log(err)}
            }
        }.bind(this))
        this._serverCloseHandler()
        this._server.listen(this._port)
    }

    _serverCloseHandler () {
        this._server.on('connection', function (socket) {
          this.sockets.add(socket)
        
          this._server.once('close', function () {
            this.sockets.delete(socket)
          }.bind(this))
        }.bind(this))
    }

    _onClientRequest (socket) {
        this._match(socket)   
    }

    _match (socket) {
        let matchedUnit = undefined
        this._units.some(function (unit) {
            if ((socket._host == unit._host || unit._host === '*')) {
                matchedUnit = unit
                return true
            } 
        }.bind(this))
        
        if (matchedUnit === undefined) {
            res.setError(502).finalize()
            return
        }
        // Pass to the Unit 
        matchedUnit._execTcp(socket)
    }

    _resetStats () {
        this._stats = {
            port: this._port,
            units: this._units.length,
            totalRequests: 0,
            matches: {}
        }
    }
}

module.exports = TcpServer


