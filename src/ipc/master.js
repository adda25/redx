'use strict'

const net = require('net')

let reloadAction = function () {}
let stopAction = function () {}
let statusAction = function () {}
let killWorkersAction = function () {}
let showRunningConfigAction = function () {}
let isActiveAction = function () {}

const server = net.createServer((c) => {
  	c.on('data', (data) => {
  	  	switch (data.toString()) {
  	  		case 'reload':
  	  			c.write(Buffer.from('Done'))	
  	  			reloadAction()
  	  			break
  	  		case 'stop':
  	  			c.write(Buffer.from('Done'))	
  	  			stopAction()
  	  			break
  	  		case 'kill-workers':
  	  			c.write(Buffer.from('Done'))	
  	  			killWorkersAction()
  	  			break
  	  		case 'status':
  	  			let st = statusAction(function (st) {
  	  				c.write(Buffer.from(st))	
  	  			})
  	  			break
  	  		case 'is-active':
  	  			isActiveAction(function (st) {
  	  				c.write(Buffer.from(st))	
  	  			})
  	  			break
  	  		case 'show-running-config':
  	  			let src = showRunningConfigAction(function (st) {
  	  				c.write(Buffer.from(st))	
  	  			})
  	  			break
  	  	}
  	})
  	c.on('end', () => {})
  	//c.pipe(c)
}).on('error', (err) => {
  	throw err
})

module.exports = {
	listen (port, actions) {
		reloadAction = actions.reload
		stopAction = actions.stop
		statusAction = actions.status
		killWorkersAction = actions.killWorkers
		isActiveAction = actions.isActive
		showRunningConfigAction = actions.showRunningConfig
		server.listen(port, () => {})
		server.on('data', (data) => {
			console.log('-->', data)
		})
	},

	emitReload (port) {
		const client = net.createConnection({ port: port }, () => {
		  	client.write('reload')
		}).on('error', (err) => {
			console.log('No server available')
		}) 
		client.on('data', (data) => {
		  	console.log(data.toString())
		  	client.end()
		})
		client.on('end', () => {})
	},

	emitStop (port) {
		const client = net.createConnection({ port: port }, () => {
		  	client.write('stop')
		}).on('error', (err) => {
			console.log('No server available')
		}) 
		client.on('data', (data) => {
		  	console.log(data.toString())
		  	client.end()
		})
		client.on('end', () => {})
	},

	emitKillWorkers (port) {
		const client = net.createConnection({ port: port }, () => {
		  	client.write('kill-workers')
		}).on('error', (err) => {
			console.log('No server available')
		}) 
		client.on('data', (data) => {
		  	console.log(data.toString())
		  	client.end()
		})
		client.on('end', () => {})
	},

	emitStatus (port) {
		const client = net.createConnection({ port: port }, () => {
		  	client.write('status')
		}).on('error', (err) => {
			console.log('No server available')
		}) 
		client.on('data', (data) => {
		  	console.log(data.toString())
		  	client.end()
		})
		client.on('end', () => {})
	},

	emitIsActive (port, cb) {
		const client = net.createConnection({ port: port }, () => {
		  	client.write('is-active')
		}).on('error', (err) => {
			//console.log('No server available')
			cb ('No server available')
		}) 
		client.on('data', (data) => {
			cb (data.toString())
		  	client.end()
		})
		client.on('end', () => {})
	},

	emitShowRunningConfig (port) {
		const client = net.createConnection({ port: port }, () => {
		  	client.write('show-running-config')
		}).on('error', (err) => {
			console.log('No server available')
		}) 
		client.on('data', (data) => {
		  	console.log(data.toString())
		  	client.end()
		})
		client.on('end', () => {})
	}
}