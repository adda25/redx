'use strict'

class StatCollector {
	constructor () {
		this._initStats()
	}

	add (data) {
		data = JSON.parse(data)
		if (this.stats.servers[data.port] == undefined) {
			this._initStatsFor(data)
		} 
		this._add(data)
	}

	get () {
		this.stats.process = {
			memory: process.memoryUsage().heapUsed / 1000000,
			cpu: process.cpuUsage(),
			uptime: process.uptime()
		}
		Object.values(this.stats.servers).forEach(function (s) {
			s.requestPerSecond = s.totalRequests / 5
		}.bind(this))
		return this.stats
	}

	reset () {
		this._initStats()
	}

	_add (data) {
		this.stats.servers[data['port']].units = data.units
		this.stats.servers[data['port']].totalRequests += data.totalRequests
		Object.keys(data.matches).forEach(function (k) {
			// console.log(k, this.stats.servers[data['port']].matches, data.matches[k])
			if (this.stats.servers[data['port']].matches == undefined) {
				this.stats.servers[data['port']].matches = {}
			}
			if (this.stats.servers[data['port']].matches[k] == undefined) {
				this.stats.servers[data['port']].matches[k] = 0
			}
			this.stats.servers[data['port']].matches[k] += data.matches[k]
		}.bind(this))
	}

	_initStatsFor (data) {
		this.stats.servers[data['port']] = { 
			port: data['port'],
			units: 0,
			totalRequests: 0,
			matches: {}
		}
	}

	_initStats () {
		this.stats = {
			servers: {},
			platform: process.platform,
			process: {
				memory: process.memoryUsage(),
				cpu: process.cpuUsage(),
				uptime: process.uptime()
			}
		}
	}
}
let collector = new StatCollector()

class Stat {
	constructor (master) {
		this.master = master
		this.master._updateStats = this._updateStats
		this.master._getStats = this.get
		this.window = this.master.cfg.stats.window * 1000
		this._runInterval = undefined
	}

	get () {
		return collector.get()
	}

	reset () {
		collector._initStats()
	}

	_updateStats (data) {
		collector.add(data)
	}
}

module.exports = Stat