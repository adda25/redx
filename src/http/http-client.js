'use strict'

const http = require('http')
const https = require('https')

class HttpClient {

    proxyRequest (x) {
        x.pass.options.protocol == 'https:' ? 
            this._proxyRequestPipe(https, x) :
            this._proxyRequestPipe(http, x)
    }

    _proxyRequestPipe (client, x) {
        try {
            var proxy = client.request(x.pass.options, function (res) {
                res.isStream = true
                try {
                    x.res.writeHead(res.statusCode, res.headers)
                    res.pipe(x.res, {
                      end: true
                    })
                } catch (err) {
                    console.log(err)
                    x.res.isStream = false
                    x.res.setError(500)
                    x.next(false)
                }
            })
            proxy.on('error', function (e) {
                console.log(e)
                x.res.isStream = false
                x.res.setError(502)
                x.next(false)
                proxy.abort()
            })
            proxy.on('timeout', function () {
                console.log('timeout')
                //x.res.isStream = false
                x.res.setError(502)
                x.next(false)
                proxy.abort()
            })
            //proxy.setTimeout(5000)
            x.req.pipe(proxy, {
              end: true
            })
        } catch (err) {
            console.log(err)
            x.res.isStream = false
            x.res.setError(500)
        }
    }
}


module.exports = HttpClient