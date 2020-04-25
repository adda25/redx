'use strict'

const net = require('net')

let setAction = function () {}
let getAction = function () {}
let server = undefined

function initServer () {
	server = net.createServer((c) => {
		let dd = '{}'
	  	c.on('data', (data) => {
	  		let _data = JSON.parse(data)
	  		if (_data.action == 'set') {
	  			setAction(_data.data)
	  		} else {
	  			let rd = getAction()
	  			c.write(JSON.stringify(rd))
	  		}
	  	})
	  	c.on('end', () => {
	  	})
	  	//c.pipe(c)
	}).on('error', (err) => {
	  	throw err
	})
}

module.exports = {
	listen (port, setaction, getaction) {
		initServer()
		setAction = setaction
		getAction = getaction
		server.listen(port, () => {
		  //console.log('opened server on', server.address())
		})
	},

	emitStat (port, data) {
		const client = net.createConnection({ port: port }, () => {
		  	client.write(JSON.stringify({action: 'set', data: data}))
		}).on('error', (err) => {
			console.log('No server available')
		}) 
		client.on('data', (data) => {
		  	client.end()
		})
		client.on('end', () => {})
	},

	getStats (port, callback) {
		const client = net.createConnection({ port: port }, () => {
		  	client.write(JSON.stringify({action: 'get'}))
		}).on('error', (err) => {
			console.log('No server available')
		}) 
		client.on('data', (data) => {
			callback(data)
		  	client.end()
		})
	},
}