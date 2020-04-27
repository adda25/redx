'use strict' 

process.on('warning', e => console.warn(e.stack))

const cluster = require('cluster')
const platform = require('os').platform()

/**
*   Cfg parser
*/
const parser = require('./parser/parser')

/**
*   Units
*/
let Unit = require('./unit')
let EmptyUnit = require('./units/empty')
let StatsUnit = require('./units/stats')
let ReloadUnit = require('./units/reload')

/**
*   General statistic collector
*/
let Stats = require('./stats/statscntl')

/**
*   External coms, used for 
*   hot reloads and stats
*/
let MasterIPC = require('./ipc/master')
let StatsIPC = require('./ipc/stats')

/**
*   Bind servers
*/
let HttpServer = require('./http/http-server')
let TcpServer = require('./tcp/tcp-server')

class RedX {

    /**
    *   Args are the command line options.
    *   If RedX is loaded as module, args
    *   is undefined
    */
    constructor (args) {
        this.args = args
        this.cmds = undefined
        this.isMaster = false
        this.workers = []
        this.macro = {}
        this.units = new Map()
        this.servers = []
        this.serversConfig = []
        this.cfg = {
            system: {workers: 1, debug: true, alwaysbind: 80, reload: false},
            ipc: {port: 60000}, 
            stats: {enable: true, path: '/redx/stats', port: 60001}
        }
        this._runningConfig = ''
        this.stats = undefined
        this._bindPorts = []
    }

    start () {
        this.cmds = parser.cfg(this.args.slice(1)) 
        parser.commands(this, this.cmds)
        this.run()
    }

    startCli () {
        this.cmds = parser.cli(this.args) 
        parser.commands(this, this.cmds)
        this.serversConfig = this._getServerConfig(this)
        this._runOne(this, this.serversConfig)    
    }

    stop () {
        MasterIPC.emitStop(this.cfg.ipc.port)
    }

    reload () {
        MasterIPC.emitReload(this.cfg.ipc.port)
    }

    killWorkers () {
        MasterIPC.emitKillWorkers(this.cfg.ipc.port)
    }

    status () {
        MasterIPC.emitStatus(this.cfg.ipc.port)
    }

    isActive (cb) {
        MasterIPC.emitIsActive(this.cfg.ipc.port, cb)
    }

    showRunningConfig () {
        MasterIPC.emitShowRunningConfig(this.cfg.ipc.port)
    }

    /**
    *   Root redx commands
    */
    configure (args) {
        args = this._parseString(args)
        let what = args[0]
        let key = args[1]
        let value = args[2]
        this.cfg[what][key] = value
        return this
    }

    define (args) {
        args = this._parseString(args)
        let key = args[0]
        let value = args[0]
        this.macro[key] = value
        return this
    }

    from (args) {
        args = this._parseString(args)
        let newUnit = new Unit(args)
        this.units.set(args, newUnit)
        return newUnit
    }

    listen (from) {
        return this.from(from)
    }

    /**
    *   Core cluster function.
    *   Is ugly but it works.
    */
    run () {
        let numCPUs = require('os').cpus().length
        let cfg = this.cfg
        if (cluster.isMaster) {
            this.isMaster = true
            MasterIPC.listen(this.cfg.ipc.port, {
                reload: function () {this._reload()}.bind(this),
                stop: function () {this._stop()}.bind(this),
                killWorkers: function () {this._killWorkers()}.bind(this),
                status: function (cb) {this._status(cb)}.bind(this),
                isActive: function (cb) {this._status(cb)}.bind(this),
                showRunningConfig: function (cb) {this._showRunningConfig(cb)}.bind(this)
            })
            if (cfg.stats.enable == 'true' || cfg.stats.enable == true) {
                this.stats = new Stats(this)
                StatsIPC.listen(cfg.stats.port, 
                    function (data) {this._updateStats(data)}.bind(this),
                    function () {return this._getStats()}.bind(this))
            }
            if (cfg.system.workers !== undefined && cfg.system.workers !== 'auto') {
                  numCPUs = cfg.system.workers
            }
            if (cfg.system.debug) {
                  console.log(`Master ${process.pid} is running with ${numCPUs} workers`
            )}
            for (let i = 0; i < numCPUs; i++) {
                this._configureCluster()
                let worker = cluster.fork()
                worker.on('message', function(msg) { this._recvMsgFromWorker(msg) }.bind(this))
                this.workers.push(worker)
            }
            cluster.on('exit', (_worker, code, signal) => {
                if (cfg.system.debug) {console.log(`worker ${_worker.process.pid} died`)}
                // If a worker die, respawn another
                this._configureCluster()
                let worker = cluster.fork()
                let indexToRemove = -1
                this.workers.some(function (s, index) {
                    if (s.process.pid == _worker.process.pid) {
                        indexToRemove = index
                        return true
                    }
                }.bind(this))
                this.workers.splice(indexToRemove, 1)
                worker.on('message', function(msg) { this._recvMsgFromWorker(msg) }.bind(this))
                this.workers.push(worker)
            })
        } else {
            this.serversConfig = this._getServerConfig(this)
            this._runOne(this, this.serversConfig)
            if (cfg.system.debug) {console.log(`Worker ${process.pid} started`)}
        }
    }

    //             _            _       
    //  _ __  _ __(_)_   ____ _| |_ ___ 
    // | '_ \| '__| \ \ / / _` | __/ _ \
    // | |_) | |  | |\ V / (_| | ||  __/
    // | .__/|_|  |_| \_/ \__,_|\__\___|
    // |_|  
    //
    _configureCluster () {
        cluster.setupMaster({
          exec: __dirname + '/redx.js',
          args: process.argv.slice(2),
          silent: false
        })
    }

    /**
    *   if is master
    */
    _recvMsgFromWorker (msg) {
        if (msg.action !== undefined && msg.action == 'listen-running-config') {
            this._listenRunningConfig(msg.msg)
        } else {
            this.workers.forEach(function (w) { 
                if (w.isConnected() && !w.isDead()) {
                    w.send(msg)     
                } else {
                    console.log('not send because die')
                }
            })  
        }
    }

    _showRunningConfig (cb) {
        cb(this._runningConfig.toString())
    }

    /** 
    *   Workers will call this master function
    *   in order to inform the master of the current
    *   running-config
    */
    _listenRunningConfig (data) {
        this._runningConfig = data
    }

    _getServerConfig (redx) {
        let servers = []
        let defaultUnitsCounter = 0
        if (redx.cfg.stats.enable == 'true' || redx.cfg.stats.enable == true) {
            defaultUnitsCounter += 1
            StatsUnit(redx)
        }
        // Currently disabled, TODO
        if (redx.cfg.system.reload == 'true' || redx.cfg.system.reload == true) {
            defaultUnitsCounter += 1
            ReloadUnit(redx)
        }
        if (redx.units.size <= defaultUnitsCounter) {
            EmptyUnit(redx)
        }
        redx._ports(redx)
        redx.units.forEach (function (u) {
            let server = redx._serverForPort(servers, u._port, u._protocol)
            if (server == false) {
                return
            }
            if (server === undefined) {
                servers.push({
                    protocol: u._protocol,
                    port: u._port,
                    units: [],
                    debug: redx.cfg.system.debug,
                    statsEnable: (redx.cfg.stats.enable == 'true')
                })
            }  
            servers[servers.length -1].units.push(u)
        })
        return servers
    }

    /**
    *   Each worker will call this
    */
    _runOne (redx, servers) {
        if (cluster.isWorker && redx.servers.length == 0) {
            process.on('message', function(mex) {
                if (mex.action !== undefined && mex.action == 'register') {
                    let unique = mex.msg.split('-')[0]
                    this.servers.some(function (s) {
                        let unit = s.hasUnit(unique)
                        if (unit != false) {
                            unit._addRegisteredProxy(mex.msg.split('-')[1], {registered: true})
                        }
                    }.bind(this))
                } else {
                    // Reload
                    //redx._diff()    
                }
            }.bind(redx))
        }
        servers.forEach(function (s) {
            s.statsPort = this.cfg.stats.port
            if (s.protocol.toLowerCase() == 'http' || s.protocol.toLowerCase() == 'https') {
                redx.servers.push(new HttpServer(s)) 
            } else if (s.protocol.toLowerCase() == 'tcp') {
                redx.servers.push(new TcpServer(s)) 
            }
        }.bind(redx))
        // Inform the master about the running config
        if (typeof process.send == 'function') {
            process.send({action: 'listen-running-config', msg: this._stringifyStatus(), pid: process.pid})    
        }
    }

    _cli (cmd, value) {
        if (this[cmd] == undefined) {
            console.log('Undefined command => ' + cmd)
            console.log('Aborting')
            process.exit(1)
        }
        return this[cmd](value)
    }

    _ports (redx) {
        let ports = new Set()
        const toBindPortsIt = redx.units.keys()
        for (var [key, value] of redx.units) {
            ports.add(value._port)
        }       
        redx._bindPorts = Array.from(ports)
    }

    _serverForPort (servers, port, protocol) {
        let server = undefined
        servers.some(function (s) {
            if (s.port === port) {
                if (s.protocol == protocol) {
                    server = s
                    return true                    
                } else {
                    console.log('Conflicting protocol types for port', port, s.protocol, protocol)
                    server = false
                    return true
                }
            }
        })
        return server
    }

    /**
    *   This will be called
    *   when the master receive a 'reload'
    *   message from IPC
    */
    _reload (action) {
        this.workers.forEach(function (w) { w.send('reload') })
    }

    /**
    *   This will be called
    *   when the master receive a 'stop'
    *   message from IPC
    */
    _stop () {
        this._killWorkers()
        process.exit(0)
    }

    /**
    *   This will be called
    *   when the master receive a 'kill-workers'
    *   message from IPC. Used by 'restart'
    */
    _killWorkers () {
        this.workers.forEach(function (w) { w.kill() })
    }

    _status (cb) {
        cb ('Redx master pid ' + process.pid.toString() + ' running with ' + this.workers.length.toString() + ' workers')
    }

    /**
    *   Calc the differences between two configurations
    *   at reload
    */
    _diff () {
        console.log('Init reload')
        let newcmds = parser.cfg(this.args.slice(1))
        let redx = new RedX(this.args) 
        parser.commands(redx, newcmds)
        let newservers = this._getServerConfig(redx)
        
        let toUpdate = []
        let toAdd = []
        let toRemove = []
        let _omatched = []
        newservers.forEach(function (ns, nindex) {
            let present = false
            this.serversConfig.forEach(function (os, oindex) {
                if (os.protocol == ns.protocol && os.port == ns.port) {
                    _omatched.push(oindex)
                    present = true
                    toUpdate.push([oindex, ns])    
                }
            }.bind(this))
            if (present == false) {
                toAdd.push(ns)
            }
        }.bind(this))

        // Remove old bind servers
        for (var i = 0; i < this.serversConfig.length; i+= 1) {
            if (!_omatched.includes(i)) {
                let toRemoveIndex = -1
                this.servers.some(function (s, index) {
                    if (s._protocol == this.serversConfig[i].protocol 
                            && s._port == this.serversConfig[i].port) {
                        s.close()
                        toRemoveIndex = index
                        return true
                    }
                }.bind(this))
                this.servers.splice(toRemoveIndex, 1)
            }
        }

        // Now update units
        let unitsMatched = []
        toUpdate.forEach(function (u) {
            this.serversConfig[u[0]] = u[1]
            this.servers.forEach(function (s, index) {
                if (s._protocol == this.serversConfig[u[0]].protocol 
                        && s._port == this.serversConfig[u[0]].port) {
                    s._units = u[1].units
                }
            }.bind(this))
        }.bind(this))

        // Now add new bind servers
        this._bindPorts = redx._bindPorts
        this._runOne(this, toAdd)
        this.serversConfig = newservers
    }

    /**
    *   Super ugly functions used by: 
    *       redx show running-config 
    */
    _stringifyStatus () {
        let str = 'RedX Running config\n'
        str += 'Servers: ' + this.servers.length
        this.servers.forEach(function (s) {
            str += '\nServer bind ' + s._protocol + ' ' + s._port + '\n'
            s._units.forEach(function (u) {
                if (u._to != undefined) {
                    str += 'Unit proxy \n'
                    u._to.forEach(function (t) {
                        str += t.protocol + ' ' + t.host + ' ' + t.port + '\n'
                    })
                } else {
                    str += 'Unit serve or exec \n'
                }
            }) 
        })
        return str
    }

    /**
    *   Transform args from string (when commands
    *   are coming from JS module) to array (like when
    *   coming from CLI or CFG).
    */
    _parseString(args) {
        if (typeof args == 'string') { args = args.match(/\S+/g) }
        return args
    }
}

if (require.main === module) {
    const args = process.argv.slice(2)
    let redx = new RedX(args)
    redx.start()
} else {
    module.exports = RedX
}

