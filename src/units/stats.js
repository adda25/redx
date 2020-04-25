'use strict'
let Unit = require('../unit')
let StatsIPC = require('../ipc/stats')

module.exports = function (_this) {
	let statsUnit = new Unit(['*:' + _this.cfg.system.alwaysbind + _this.cfg.stats.path])
	statsUnit.step(function (x) {
	    StatsIPC.getStats(_this.cfg.stats.port, function (data) {
	    	x.res.setHead(200, 'content-type: json', data)
	   	 	x.next()	    	
	    })
	}.bind(_this))
	_this.units.set(['*:' + _this.cfg.system.alwaysbind + _this.cfg.stats.path], statsUnit)
}