'use strict'

let fs = require('fs')
let files = require('../res/files')
let mime = require('./mime-map')

class Serve {

    file (x) { 
    	let filename = x.pass.serve.filename
    	let dir = x.pass.serve.dir
        var filePath = decodeURI(filename)
        try {
            if (fs.existsSync(filePath)) {
                var stat = fs.statSync(filePath)
                if (!stat.isFile()) {
                	if (dir == true) {
                		this.dir(x, x.pass.serve.basepath, filePath) 
                		return
                	} else {
                		throw 'Directory mapping is not allowed, specify a file'	
                	}
                }
                var readStream = fs.createReadStream(filePath)
                let fileExtension = filePath.split('.')
                fileExtension = fileExtension[fileExtension.length - 1]
                mime[fileExtension]
                readStream.pipe(x.res)
                x.res.isStream = true
                x.res.setHead(200, 
                    {
                        'content-length': stat.size,
                        'content-type': mime[fileExtension] || 'application/octet-stream',
                    })
                x.next()
            } else {
                x.res.setError(404)
                x.next()
            }
        } catch (err) {
            console.log('->', err)
            x.res.setError(403)
            x.next()
        }
    }

    dir (x, basepath, filePath) {
    	filePath = decodeURI(filePath)
    	basepath = decodeURI(basepath)
    	fs.readdir(filePath, function (err, _files) {
    		if (_files == undefined) {
    			x.res.setError(422)
    			return
    		}
    		_files = _files.map((f) => { return { link: basepath + '/' + f, name: f } })
    		let page = files(basepath, _files)
            x.res.setHead(200, {
                'Content-Type': 'text/html',
                'Content-Length': Buffer.from(page).length
            }, page)
    		x.next()    		
    	})
    }
}

module.exports = Serve
