'use strict'

const { exec, execFile } = require('child_process')
let IpFilter = require('./filter/ip-filter')
let MethodFilter = require('./filter/method-filter')
let Cache = require('./cache/cache')
let HttpClient = require('./http/http-client')
let TcpClient = require('./tcp/tcp-client')
let BaseTcpCheck = require('./healthchecks/base-tcp')
let Algo = require('./http/algo')
let Serve = require('./http/serve')

/**
*   Core "Virtual Host" Unit
*/
class Unit {
    constructor (from) {
        this._meta = {}
        this._from = undefined
        this._unique = undefined
        this._to = undefined
        // Allow only one proxy step per unit
        this._proxyActionInserted = false
        this._port = undefined
        this._location = undefined
        this._host = undefined
        this._protocol = 'http'
        this._balance = 'first'
        this._serve = new Serve()
        this._httpClient = new HttpClient()
        this._tcpClient = new TcpClient()
        this._baseTcpCheck = new BaseTcpCheck()
        this._filters = { ip: new IpFilter(), method: new MethodFilter() }
        this._register = { enabled: false, from: [] }
        this._cacheContainer = new Cache()
        this._checksInterval = undefined
        this._step = []
        this.debug = false
        this._use = { check: {time: undefined} }
        this.from(from)
    }

    /**
    *   Set values for settings
    */
    use (args) {
        args = this._parseString(args)
        if (this._use[args[0]] == undefined) {
            this._use[args[0]] = {}
        } 
        this._use[args[0]][args[1]] = args[2] 
        switch (args[0]) {
            case 'check':
                this._use[args[0]][args[1]] = this._use[args[0]][args[1]] * 1000
                this._startChecks()
        }
        return this
    }

    /**
    *   Add log resource to the list
    *   dbgi can be a string or an array.
    *   If the string contains ',' is splitted. 
    */
    log (dbgi) {
        dbgi = this._parseString(dbgi)
        this.step(function (x) {
            dbgi.forEach(function (key) {
                switch (key) {
                    case 'request-headers':
                        this._log(key, x.req.headers)    
                        break   

                    case 'response-headers':
                        this._log(key, x.res.headers)    
                        break   
                }
            }.bind(this))
            x.next()
        }.bind(this), 'log')
        return this
    }

    /**
    *   Define bind port,
    *   host and location
    */
    from (from) {
        from = this._parseString(from)
        let protocol = ''
        if (from.length == 1) {
            from = from[0]
        } else if (from.length == 2) {
            protocol = from[0]
            from = from[1]
        }
        const _loc = (from.split(':')[1]).split('/')
        this._from = from
        this._port = _loc[0]

        let _indexFirstSlash = from.indexOf('/')
        let _locc =  _indexFirstSlash == -1 ? '/' : from.substring(_indexFirstSlash)
        this._location = _locc
        this._host = (from.split(':')[0])
        switch (protocol) {
            case 'ssl':
                this._protocol = 'https'
                break
            case 'tcp':
                this._protocol = 'tcp'
                break
            default:
                this._protocol = 'http'
                break
        }
        this._unique = this._protocol + this._host + this._port + this._location
        return this
    }

    /**
    *   _options are setted
    *   internally, not by the user
    */
    proxy (to, _options = null) {
        to = this._parseString(to)
        if (this._proxyActionInserted == false) {
            this._to = typeof this._to !== 'array' ? [] : this._to    
        }
        let _stepAction = this._proxyRequest
        switch (to[0]) {
            case 'ssl':
                to.shift()
                to.forEach(function (t) { 
                    let newTo = this._makeTo(t, true)
                    let toInsert = true
                    this._to.forEach(function (ut) {
                        if (ut.unique == newTo.unique) {
                            toInsert = false
                        }
                    })
                    if (toInsert == true) {
                        if (_options !== null && _options.registered == true) {
                            newTo.registered = _options.registered
                        } 
                        this._to.push(newTo)     
                    }
                }.bind(this))
                _stepAction = this._proxyRequest
                break
            case 'tcp':
                to.shift()
                to.forEach(function (t) { 
                    this._to.push(this._makeToTcp(t)) 
                }.bind(this))
                _stepAction = this._proxyRequestTcp
                break
            default:
                to.forEach(function (t) { 
                    let newTo = this._makeTo(t, false)
                    let toInsert = true
                    this._to.forEach(function (ut) {
                        if (ut.unique == newTo.unique) {
                            toInsert = false
                        }
                    })
                    if (toInsert == true) {
                        if (_options !== null && _options.registered == true) {
                            newTo.registered = _options.registered
                        } 
                        this._to.push(newTo)     
                    }
                }.bind(this))
                _stepAction = this._proxyRequest
                break
        }
        if (this._proxyActionInserted == false) {
            this._proxyActionInserted = true
            this.step(_stepAction.bind(this))
        }
        return this
    }

    /**
    *   Alias for "proxy"
    */
    to (to) {
        return this.proxy(to)
    }

    /**
    *   min args: [statusCode, location]
    *   max args: [statusCode, 'ssl', location]
    */
    redirect (to) {
        to = this._parseString(to)
        let statusCode = ''
        let newLocation = ''
        let newProtocol = ''
        if (to.length == 2) {
            statusCode = to[0]
            newLocation = to[1]   
            newProtocol = 'http://'
        } else if (to.length == 3) {
            statusCode = to[0]
            newProtocol = to[1] == 'ssl' ? 'https://' : 'http://' 
            newLocation = to[2] 
        } else {
            throw 'Redirect: Not enough arguments'
        }
        this.step(function (x) {
            x.res.setData({location: newProtocol + newLocation}, '')
            x.res.setStatusCode(statusCode)
            x.res.sendBack()
            x.next(false)
        })
        return this
    }

    /**
    *   Set request headers
    */
    request (args) {
        args = this._parseString(args)
        if (args[0] == 'headers' || args[0] == 'header') {
            args.shift()
        }
        this._req(...args)
        return this 
    }

    /**
    *   Set response headers
    */
    response (args) {
        args = this._parseString(args)
        if (args[0] == 'headers' || args[0] == 'header') {
            args.shift()
        }
        this._res(...args)
        return this 
    }

    /** TO VERIFY
    *   Allow the user to make changes
    *   to request and response 
    *   via callback. Valid only in module version
    */
    step (callback) {
        if (typeof callback == 'array') {
            // Called from config file
            callback = require(callback[0])
        }
        this._step.push(callback)
        return this
    }

    deny (args) {
        args = this._parseString(args)
        let _sp = args
        for (var i = 1; i < _sp.length; i += 1) {
            if (this._filters[_sp[0]] == undefined) {
                console.log('Non valid filter', _sp[0])
                return this
            }
            this._filters[_sp[0]].deny(_sp[i])  
        } 
        this.step(function (x) {
            this._filters[_sp[0]].filter(x)    
        }.bind(this))
        return this     
    }

    allow (args) {
        args = this._parseString(args)
        let _sp = args
        if (_sp[0] == 'register') {
            this._setRegister(args)
            return this
        }
        for (var i = 1; i < _sp.length; i += 1) {
            if (this._filters[_sp[0]] == undefined) {
                console.log('Non valid filter', _sp[0])
                return this
            }
            this._filters[_sp[0]].allow(_sp[i]) 
        } 
        this.step(function (x) {
            this._filters[_sp[0]].filter(x)    
        }.bind(this))
        return this 
    }

    balance (type) {
        type = this._parseString(type)
        this._balance = typeof type !== 'array' ? type[0] : type
        this.step(function (x) {
            let remoteIp = x.req == undefined ? x.socket.remoteAddress : x.req.remoteIp()
            x.pass.balanceDestination = Algo.Next(remoteIp, this._to, this._balance)
            x.next()
        }.bind(this))
        return this
    }

    /**
    *   Base webserver
    *   for serving static files
    */
    serve (serveArgs) {
        serveArgs = this._parseString(serveArgs)
        let basepath = ''
        let dir = false
        if (typeof serveArgs != 'string') {
            if (serveArgs.length == 2) {
                if (serveArgs[0] === 'dir') {
                    dir = true
                }
                basepath = serveArgs[1]
            } else {
                basepath = serveArgs[0]
            }
        }
        if (basepath[basepath.length - 1] !== '/' && dir === true) {
            basepath += '/'
        }
        this.step(function (x) {
            let file = basepath + x.req.url.substring(this._location.length)
            try {
                x.pass.serve = {
                    dir: dir,
                    basepath: x.req.url[x.req.url.length - 1] == '/' ? x.req.url.replace(/\/$/, "") : x.req.url, 
                    filename: file
                }
                this._serve.file(x)
            } catch (err) {
                console.log('---->', err)
                x.next()
            }
        }.bind(this), 'serve')
        return this
    }

    /**
    *   EXEC custom scripts
    */
    exec (_args) {
        _args = this._parseString(_args)
        this.step(function (x) {
            try {
                let interpreter = _args[0]
                let cmd = _args[1]
                let argument = _args[2]
                let ar2pass = ''
                if (argument !== undefined && argument[0] == '§') {
                    if (argument == '§query') {
                        ar2pass = JSON.stringify(x.req.query)
                    } else if (argument == '§path') {
                        ar2pass = x.req.url
                    } else if (argument.includes('§query.')) {
                        ar2pass = x.req.query[argument.split('§query.')[1]]
                    }
                }  
                execFile(interpreter, [cmd, ar2pass], function (error, stdout) {
                    try {
                        this._log('exec', interpreter + ' ' + cmd + ' ' + stdout)
                        x.res.setHead(200, {
                            'content-type': 'text'
                        }, stdout)
                        x.next()
                    } catch (err) {
                        console.log(err)
                        x.res.setError(500)
                        x.next(false)
                    }
                }.bind(this))
            } catch (err) {
                console.log(err)
                x.res.setError(500)
                x.next()
            }
        }.bind(this))
        return this
    }

    //             _            _       
    //  _ __  _ __(_)_   ____ _| |_ ___ 
    // | '_ \| '__| \ \ / / _` | __/ _ \
    // | |_) | |  | |\ V / (_| | ||  __/
    // | .__/|_|  |_| \_/ \__,_|\__\___|
    // |_|  
    //
    _cli (cmd, value) {
        if (this[cmd] == undefined) {
            console.log('Undefined command => ' + cmd)
            console.log('Aborting')
            process.exit(1)
        }
        return this[cmd](value)
    }

    /**
    *   Set request headers
    */
    _req (operation, key, value) {
        this.step(function (x) {
            x.req.op(operation, key, value)
            x.next()
        }.bind(this), 'request header')
        return this
    }

    /**
    *   Set response headers
    */
    _res (operation, key, value) {
        this.step(function (x) {
            x.res.op(operation, key, value)
            x.next()
        }.bind(this), 'response header')
        return this
    }

    /**
    *   Called from main
    */
    _setDebug (debug) {
        this._debug = debug
        return this
    }

    /**
    *   Called from main
    */
    _setMacro (macro) {
        this._macro = macro
        return this
    }

    /**
    *   Manage the creations of the self
    *   registered backends
    */
    _setRegister (args) {
        this._register.enabled = true
        let secret = undefined
        if (args.length > 2 && args[1] == 'secret') {
            // We have a secret key
            secret = args[2]
        }
        this.step(function (x) {
            const urlToMatch = this._location[this._location.length - 1] == '/' ? this._location + 'redx/register' : this._location + '/redx/register'
            if (x.req.method == 'POST' && x.req.url == urlToMatch) {
                x.req.parseBody(function (data) {
                    data = data.toString()
                    if (data.includes('redx-self')) {
                        data = data.replace('redx-self', x.req.remoteIpIpv4())
                    }
                    if (secret !== undefined) {
                        if (data.split('::').length > 1 && data.split('::')[1] == secret) {
                            data = this._unique + '-' + data.split('::')[0]
                            console.log(data)
                            process.send({action: 'register', msg: data, pid: process.pid})
                            x.res.finalize()
                        } else {
                            // not valid secret
                            x.res.setError(403)
                            x.res.finalize()
                        }
                    } else {
                        data = this._unique + '-' + data
                        process.send({action: 'register', msg: data, pid: process.pid})
                        x.res.finalize()
                    }
                }.bind(this))
            } else {
                x.next()
            }
        }.bind(this))
    }

    _addRegisteredProxy (data) {
        this.proxy([data], {registered: true})
        this._register.enabled = true
        this.step(function (x) {
            x.next()
        }.bind(this))
    }

    _makeTo (to, ssl) {
        const _host = to.split(':')[0]
        let _protocol = (ssl == undefined || ssl == false) ? 'http:' : 'https:'
        let _oport = to.split(':').length == 2 ? to.split(':')[1] : (_protocol == 'https:' ? '443' : '80')
        let _port = _oport.split('/')[0]
        let _locAry = to.split('/')
        _locAry.shift() 
        let _location = ''
        _locAry.forEach(function (l) {
            l !== '/' ? _location = _location + '/' +  l : _location =  _location + '/'
        })
        return {
            host: _host, 
            port: _port, 
            protocol: _protocol,
            location: _location, 
            balanceHelper: {
                roundRobinCount: 0, // TODO: buffer overflow
                src: {},
                srcCount: 0
            },
            unique: _protocol + _host + _port + _location,
            available: true,
            registered: false
        }
    }

    _makeToTcp (to) {
        const _host = to.split(':')[0]
        let _protocol = 'tcp'
        let _oport = to.split(':').length == 2 ? to.split(':')[1] : '80'
        let _port = _oport.split('/')[0]
        return {
            host: _host, 
            port: _port, 
            protocol: _protocol,
            balanceHelper: {
                roundRobinCount: 0, // TODO: buffer overflow
                src: {},
                srcCount: 0
            },
            unique: _protocol + _host + _port,
            available: true
        }
    }

    _proxyRequest (x) {
        let dst = x.pass.balanceDestination == undefined ? this._to[0] : x.pass.balanceDestination
        if (dst == undefined || dst.available == false) {
            x.res.setError(502)
            x.next(false)
            return
        }
        let targetUrl = dst.location
        let targetPort = dst.port
        let target = dst.host
        let _replacedUrl = x.req.url.replace(this._location, '')
        if (_replacedUrl[0] !== '/') {
            _replacedUrl = '/' + _replacedUrl
        }
        let options = {
            host: target,
            path: _replacedUrl,
            port: targetPort,
            protocol: dst.protocol,
            method: x.req.method,
            headers: x.req.headers,
            insecureHTTPParser: false,
            maxHeaderSize: 81920,
            setHost: false
        }
        x.pass.options = options
        this._httpClient.proxyRequest(x)
    } 

    _proxyRequestTcp (x) {
        let dst = x.pass.balanceDestination == undefined ? this._to[0] : x.pass.balanceDestination
        if (dst == undefined || dst.available == false) {
            x.next(false)
            return
        }
        let targetUrl = dst.location
        let targetPort = dst.port
        let target = dst.host
        let options = {
            host: target,
            path: '/',
            port: targetPort,
            protocol: dst.protocol
        }
        x.pass.options = options
        this._tcpClient.proxyRequest(x)
    } 

    _exec (req, res) {
        req.setMacro(this._macro)
        let obj = {nextCounter: 0, nexts: this._step, req: req, res: res, pass: {}}
        obj.next = function (status = true) {
            if (obj.nextCounter == obj.nexts.length -1 || status == false) {
                res.finalize()
                return
            }
            obj.nextCounter += 1
            try {
                obj.nexts[obj.nextCounter](obj)
            } catch (err) {
                console.log('step error catched', err)
                return
            }
        }.bind(this) 
        this._step[0](obj)
    }

    _execTcp (socket) {
        let obj = {nextCounter: 0, nexts: this._step, socket: socket, pass: {}}
        obj.next = function (status = true) {
            if (obj.nextCounter == obj.nexts.length -1 || status == false) {
                return
            }
            obj.nextCounter += 1
            try {
                obj.nexts[obj.nextCounter](obj)
            } catch (err) {
                console.log('step error catched', err)
                return
            }
        }.bind(this) 
        this._step[0](obj)
    }

    _startChecks () {
        if (this._checksInterval == undefined) {
            this._checksInterval = setInterval(function () {
                this._checkAction()
            }.bind(this), this._use.check.time)
        }
    }

    _stopChecks () {
        if (this._checksInterval != undefined) {
            clearInterval(this._checksInterval)
        }
    }

    _checkAction () {
        if (this._to == undefined) {
            return
        }
        this._to.forEach(function (t, index) {
            this._baseTcpCheck.check(t.host, t.port, function (result) {
                t.available = result
                if (t.registered == true && result == false) {
                    this._to.splice(index, 1)
                }
            }.bind(this))
        }.bind(this))
    } 

    _log (key, mex) {
        if (this._debug) { 
            const timestamp = Date.now()
            console.log('W->' + process.pid, timestamp, key, mex) 
        }
    }

    _parseString(args) {
        if (typeof args == 'string') { args = args.match(/\S+/g) }
        return args
    }
}

module.exports = Unit
