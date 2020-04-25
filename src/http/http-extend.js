'use strict'

let ErrorPage = require('../res/error.js')
let DefaultPage = require('../res/homepage.js')

class HttpExtend {

    static Req (req) {
        req.body = ''
        req.host = req.headers.host
        req.url = req.url
        req.method = req.method
        
        req.macro = {}

        req.setBody = (body) => {
            req.body = body
        }

        req.parseBody = (callback) => {
            const chunks = []
            req.on('data', chunk => chunks.push(chunk))
            req.on('end', () => {
              const data = Buffer.concat(chunks)
              callback(data)
            })
        }

        req.setMacro = (macro) => {
            req.macro = macro
        }

        req.remoteIp = () => {
            let ip = req.headers['x-forwarded-for'] || 
                req.connection.remoteAddress || 
                req.socket.remoteAddress ||
                (req.connection.socket ? req.connection.socket.remoteAddress : null)
            return ip
        }

        req.parseQuery = () => {
            if (req.url == undefined) {
                return {}
            }
            const _s = req.url.split('?')
            if (_s.length !== 2) {
                return {}
            } 
            const _c = _s[1].split('&')
            let query = {}
            _c.forEach(function (c) {
                const _cc = c.split('=')
                query[_cc[0]] = _cc[1]
            })
            return query
        }

        // Headers

        req.op = (operation, key, value) => {
            switch (operation) {
                case 'pass':
                    req.pass(key)
                    break
                case 'set':
                    req.set(key, value)
                    break
                case 'hide':
                    req.hide(key)
                    break
            }
        }

        req.set = (key, value) => {
            if (req.headers !== undefined) {
                req.headers[key] = value
            } 
        }

        req.hide = (key) => {
            if (req.headers[key] == undefined) {
                return
            }
            delete req.headers[key]
        }

        req.get = () => {
            return req.headers
        }

        req.query = req.parseQuery()

        return req
    }

    static Res (res) {
    	res.isStream = false

    	res.setHead = (statusCode, headers, body) => {
    	    res.statusCode = statusCode
    	    res.headers = headers
    	    res.body = body
            return res
    	}

        res.json = (body) => {
            res.statusCode = 200
            if (res.headers == undefined || res.headers == null || Object.keys(res.headers) == 0) {
                res.headers = {}
            }
            res.headers['content-type'] = 'json'
            res.body = JSON.stringify(body)
            return res
        }
	
    	res.setError = (code) => {
    	    let ehtml = ErrorPage(code || 500)
    	    res.setHead(code, {
    	        'Content-Length': 'text/html',
    	        'Content-Length': ehtml.length
    	    }, ehtml)
            return res
    	}
	
    	res.setDefault = () => {
    	    let ehtml = DefaultPage()
    	    res.setHead(200, {
    	        'Content-Length': 'text/html',
    	        'Content-Length': ehtml.length
    	    }, ehtml)
            return res
    	}
	
    	res.finalize = () => {
    	    res.writeHead(res.statusCode, res.headers)
    	    if (res.body !== undefined) {
    	        res.write(res.body)
    	    } 
    	    if (res.isStream === false) {
    	        res.end()    
    	    } 
            return res
    	}

        // Headers
        res.op = (operation, key, value) => {
            switch (operation) {
                case 'pass':
                    res.pass(key)
                    break
                case 'set':
                    res.set(key, value)
                    break
                case 'hide':
                    res.hide(key)
                    break
            }
            return res
        }

        res.set = (key, value) => {
            if (res.headers !== undefined) {
                res.headers[key] = value
            }
            return res 
        }

        res.hide = (key) => {
            if (res.headers[key] == undefined) {
                return
            }
            delete res.headers[key]
            return res
        }

        res.get = () => {
            return res.headers
        }

        return res
    }
}

module.exports = HttpExtend