'use strict' 

class MethodFilter {
    constructor (allow, deny) {
        this._deny = []
        this._allow = []
    }

    allow (value) {
        this._allow.push(value)
    }

    deny (value) {
        this._deny.push(value)
    }

    filter (x) {
        if (this._deny.length == 0 && this._allow.length == 0) {
            x.next()
            return
        } 
        let alreadySent = false
        this._deny.some(function (method) {
            if (method.toLowerCase() == x.req.method.toLowerCase()) {
                alreadySent = true
                x.res.setError(403)
                x.next(false)
                return true
            }
        })
        if (alreadySent == true) {
            return
        }
        let found = false
        if (this._allow.length == 0) {
            found = true
        } else {
            this._allow.forEach(function (method) {
                if (method.toLowerCase() == x.req.method.toLowerCase()) {
                    found = true
                }
            })            
        }
        if (found == false) {
            x.res.setError(403)
            x.next(false)
        } else {
            x.next()
        }
    }
}

module.exports = MethodFilter