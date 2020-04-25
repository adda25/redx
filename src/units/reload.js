'use strict'
let Unit = require('../unit')

module.exports = function (_this) {
	let unit = new Unit(['*:' + _this.cfg.system.alwaysbind + _this.cfg.reload.path])
	unit.step(function (x) {
		_this.reload()
	    x.res.setHead(200, 'Content-Type: json', JSON.stringify({}))
	    x.next()
	}.bind(_this))
	_this.units.set(['*:' + _this.cfg.system.alwaysbind + _this.cfg.reload.path], unit)
}