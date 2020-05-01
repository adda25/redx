'use strict'

const http = require('http')
const https = require('https')
const os = require('os')

class EyeClient {
	constructor (stats, cfg) {
		this._stats = stats
		this._cfg = cfg
		this._eyeLoop = undefined
		this._init()
	}

	_init () {
		if (this._eyeLoop !== undefined) { return }
		this._eyeLoop = setInterval(function () {
			this._eyeStatus()
		}.bind(this), this._cfg.frequency)
	}

	_eyeStatus () {
		if (this._cfg.servers === undefined) { return }
		if (typeof this._cfg.servers == 'string') {this._cfg.servers = [this._cfg.servers]}
		let st = this._stats.get()
		st.hostname = os.hostname()
		st.token = this._cfg.token
		let payload = Buffer.from(JSON.stringify(st))
		this._cfg.servers.forEach(function (s) {
			this._httpRequest({
            	host: s.split('//')[1].split(':')[0],
            	path: '/redx/server/status',
            	port: s.split(':')[2],
            	protocol: s.split('//')[0],
            	headers: {'content-type': 'application/json', 'content-length': Buffer.byteLength(payload)},
            	method: 'POST',
			}, payload)
		}.bind(this))
		this._stats.reset()
	}

	_httpRequest (eye, payload) {
        try {
        	console.log(eye)
        	let client = eye.protocol == 'http:' ? http : https
            var request = client.request(eye, function (res) {
     			console.log(res.statusCode)
            })
            request.on('error', function (e) {
                console.log(e)
                request.abort()
            })
            request.on('timeout', function () {
                console.log('timeout')
                request.abort()
            })
            request.write(payload)
            request.setTimeout(5000)
        } catch (err) {
            console.log(err)
        }
	}
}

module.exports = EyeClient