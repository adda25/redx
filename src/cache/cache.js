'use strict'

class Cache {
	constructor () {
		this.rmap = {}
		// TODO: add remove loop
	}

	add (path, resource) {
		console.log('ADD CACHE', path, resource)
		this.rmap[path] = {r: resource, t: new Date()}
	}

	get (path) {
		const c = this.rmap[path]
		console.log('GET CACHE', path, c)
		return c !== undefined ? c.r : c
	}
}

module.exports = Cache