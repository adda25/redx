'use strict'
let Unit = require('../unit')

module.exports = function (_this) {
	let emptyUnit = new Unit(['*:' + _this.cfg.system.alwaysbind + '/'])
	emptyUnit.step(function (x) {
	    x.res.setDefault()
	    x.next()
	})
	_this.units.set(['*:/'], emptyUnit)
}