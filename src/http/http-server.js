'use strict'

const fs = require('fs')
const tls = require('tls')
const http = require('http')
const https = require('https')
const url = require('url')
let HttpExtend = require('./http-extend')
let StatsIPC = require('../ipc/stats')

class HttpServer {
    constructor (args) {
        this.sockets = new Set()
        this._protocol = args.protocol
        this._port = args.port
        this._units = args.units
        this._debug = args.debug
        this._server = undefined  
        this._secureContext = {}
        this._statsEnable = args.statsEnable || false
        this._stats = {}
        if (this._statsEnable) {
            this._resetStats()
            setInterval(function () {
                StatsIPC.emitStat(args.statsPort, JSON.stringify(this._stats))
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
        this._protocol === 'http' ? this._startHttpServer() : this._startHttpsServer()
    }

    _startHttpServer () {
        this._server = http.createServer(function (_req, _res) {
            try {
                if (this._statsEnable == true) {
                    this._stats.totalRequests += 1    
                }
                this._onClientRequest(_req, _res, 'http')
            } catch (err) {
                if (this._debug) {console.log(err)}
            }
        }.bind(this))
        this._serverCloseHandler()
        this._server.listen(this._port)
    }

    _startHttpsServer () {
        this._buildSecureContext() 
        let options = {
            SNICallback: function (domain, cb) {
                cb(null, this._secureContext[domain])
            }.bind(this)
        }
        this._server = https.createServer(options, function (_req, _res) {
            try {
                if (this._statsEnable == true) {
                    this._stats.totalRequests += 1    
                }
                this._onClientRequest(_req, _res, 'https')
            } catch (err) {
                if (this._debug) {console.log(err)}
            }
        }.bind(this))
        this._serverCloseHandler()
        this._server.listen(this._port)
    }

    _buildSecureContext () {
        this._secureContext = {}
        this._units.forEach(function (u) {
            this._secureContext[u._host] = this._oneSecureContext(u._use.ssl)
        }.bind(this))
    }

    _oneSecureContext (args) {
        return tls.createSecureContext({
            key:  fs.readFileSync(args.key),
            cert: fs.readFileSync(args.cert),
        })
    }

    _serverCloseHandler () {
        this._server.on('connection', function (socket) {
          this.sockets.add(socket)
        
          this._server.once('close', function () {
            this.sockets.delete(socket)
          }.bind(this))
        }.bind(this))
    }

    _onClientRequest (_req, _res, client) {
        let req = HttpExtend.Req(_req)
        let res = HttpExtend.Res(_res)
        this._match(req, res, client)   
    }

    /**
    *   This function match the request host, port and location
    *   to the right unit. If no correct unit is found, set 502
    */
    _match (req, res, client) {
        let matchedUnit = undefined
        this._units.some(function (unit) {
            if ((req.host == unit._host || unit._host === '*') && req.url.startsWith(unit._location) && 
                (req.url.replace(unit._location, '')[0] == '/' 
                    || req.url.replace(unit._location, '')[0] == '?' 
                    || req.url.replace(unit._location, '')[0] == undefined || unit._location == '/')) {
                matchedUnit = unit
                return true
            } 
        }.bind(this))
        
        if (matchedUnit === undefined) {
            res.setError(502).finalize()
            return
        }
        // Stats
        if (this._statsEnable == true && this._stats.matches[req.host + ':' + matchedUnit._port + matchedUnit._location] == undefined) { 
            this._stats.matches[req.host + ':' + matchedUnit._port + matchedUnit._location] = 0 
        } 
        if (this._statsEnable == true) { 
            this._stats.matches[req.host + ':' + matchedUnit._port + matchedUnit._location] += 1 
        }
        // Pass to the Unit 
        matchedUnit._exec(req, res)
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

module.exports = HttpServer


