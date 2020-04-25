'use strict'

class Algo {
    static Next (remoteIp, _to, balancing) {
        try {
            let to = _to.filter((t) => { return t.available == true})                
            
            function randomInt(min, max) { 
              return Math.floor(Math.random() * ((max - 1) - min + 1) + min)
            }
            if (to == undefined) {
                return
            }
            switch (balancing) {

                case 'first':
                    return to[0]

                case 'second':
                    return to[1]

                case 'third':
                    return to[2]

                case 'random':
                    return to[randomInt(0, to.length)]

                case 'round-robin':
                    to.sort((a, b) => {
                        return a.balanceHelper.roundRobinCount - b.balanceHelper.roundRobinCount 
                    })
                    to[0].balanceHelper.roundRobinCount += 1
                    return to[0]

                case 'client-ip':
                    let choosen = undefined
                    to.some(function (r) {
                        if (r.balanceHelper.src[remoteIp] !== undefined) {
                            choosen = r
                            return true
                        }
                    })
                    if (choosen === undefined) {
                        to.sort((a, b) => {
                            return a.balanceHelper.srcCount - b.balanceHelper.srcCount 
                        })
                        choosen = to[0]
                        choosen.balanceHelper.src[remoteIp] = 1
                        choosen.balanceHelper.srcCount += 1
                    }
                    return choosen

                default: 
                    return to[0]
            }
        } catch (err) {
            console.log(err)
            return undefined
        }
    }   
}

module.exports = Algo