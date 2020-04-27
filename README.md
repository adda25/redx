<img src="https://webadmin.promfacility.eu/uploads/018e8a986030489ea5fc97190e124277.png" alt="RedX Logo" width="150px">


**Vanilla Node.JS Reverse Proxy and Application Server**

Using CLI or configuration file:

```sh
redx cli from *:8080 \
         request set host promfacility.eu \
         request set x-forwarded-proto https \
         proxy ssl promfacility.eu 
```

As module:

```js
let RedX = require ('@tsadda25/redx')
let x = new RedX()

x.from('*:8080')
.request('set host promfacility.eu')
.request('set x-forwarded-proto https')
.proxy('ssl promfacility.eu')

x.run()
```

[Explore the source code](https://redx.promfacility.eu)


## Content
**[1. Introduction](#heading--1)**

**[2. Command table](#heading--2)**

  * [2.1. Commands cheat sheet](#heading--2-1)

  * [2.2. Define custom commands](#heading--2-2)

**[3. How to](#heading--3)**
	
  * [3.1. Proxy HTTP](#heading--3-1)

  * [3.2. Proxy HTTPS](#heading--3-2)
  
  * [3.3. Proxy TCP](#heading--3-3)
  
  * [3.4. Serve files](#heading--3-4)

  * [3.5. Exec custom script](#heading--3-5)
  
  * [3.6. Hot reload](#heading--3-6)

  * [3.7. Balance request](#heading--3-7)

  * [3.8. Filter request](#heading--3-8)

  * [3.9. Modify the HTTP/S headers](#heading--3-9)

  * [3.10. Auto register backends](#heading--3-10)

**[4. Install](#heading--4)**
	
  * [4.1. Binary / Systemd](#heading--4-1)

  * [4.2. NPM](#heading--4-2)

  * [4.3. Docker](#heading--4-3)

**[5. Todo](#heading--5)**

  * [5.1. Caveats](#heading--5-1)


<div id="heading--1"/>

## Why

I wrote this software with the aim of creating a reverse proxy that would satisfy all my needs and tastes. Using the I/O potential of Node, I tried to create a simple, fun and logical system to configure, but powerful enough to replace Nginx and HAProxy, software that I use and love a lot, in many operational contexts.

RedX is currently in the alpha stage, so: Expect major delays ahead :D

## Concepts

**RedX** provide to you three different interfaces:

* CLI: rapid prototyping and testing 
* CFG File: long running server
* Node module: integrate **RedX** in your code

CLI and CFG can be used both running the code from your
Node enviroment or using the packaged app or as Docker container.

**In every interface mode, you configure *RedX* chaining 
commands, called *step* in the source code. Step presents
Fluent Interface, so you chain the step you need in order to accomplish
the job. There is no predefined order, and no one will check the 
commands order for you => Read the docs**

**In the CFG mode, if no file is specified, *RedX* will search for
the default conf file, named redx.conf, that must be located in the same
directory of the executable*

### Scalability

**RedX** uses the Nodes's cluster feature to fork multiple worker process
that shares the ports. The default number of workers is equal to the vCPU number.

Every commucation between master, workers and cli goes through IPC channels.

<div id="heading--2-1"/>

### Commands cheat sheet

| command   | args                                   | description                                                  | example                                   |
|-----------|----------------------------------------|--------------------------------------------------------------|-------------------------------------------|
| configure | [what, key, value]                     | set RedX general options                                     | configure system workers 8                |
| define    | [key, value]                           | define custom macros                                         | define query ...                          |
| run       | null                                   | start the port binding                                       | run                                       |
| from      | [*ssl*(opt), host:port/location]       | create a new unit                                            | from virtualhost.com:80/login             |
| use       | [...options]                           | use additional features                                      | use checks 1                              |
| log       | [...options]                           | set what to log                                              | log request-headers proxy-request         |
| redirect  | [code, target]                         | redirect                                                     | redirect 302 http://localhost:8080        |
| allow     | [type, value]                          | allow only the specified values for type                     | allow ip 192.168.1.1                      |
| deny      | [type, value]                          | deny only the specified values for type                      | deny ip 192.168.1.1                       |
| balance   | [type]                                 | in case of multiple backends per unit, balance it using type | balance client-ip                         |
| proxy     | [*ssl*(opt), ...host:port/location ]   | proxy the request to the backend                             | proxy ssl google.com yahoo.com            |
| serve     | [dir(opt), localpath]                  | serve the localpath. if *dir* is present, allow the search   | serve dir /absolutepath                   |
| exec      | [interpeter, pathtoscript, argstopass] | execute an external script                                   | exec python /absolute/script/aa.py §query |
| request   | [type, what, key, value]               | modify the content of the request                            | request hide host                         |


<div id="heading--2-2"/>

### Custom step

In all three interfaces, you can command a custom *step*.
On the Node module inteface, this is a callback that you define.
In the other two interfaces, CLI and standalone, you *require* a JavaScript
file, and the content of the file is executed when needed.

So *RedX* is programmable in JavaScript.


```js
let RedX = require ('@tsadda25/redx')
let x = new RedX()

x.from('*:8080')
.step((x) => {
	console.log(x.req.headers, x.req.query)
	x.next()
})
.proxy('amedeosetti.com')

x.run()
```

```sh
redx from *:8080 step /path/to/file.js proxy amedeosetti.com
```

<div id="heading--3"/>

## How To

For the more concise syntax, all the examples here 
reported are in the CFG syntax,
but should be easy for you to replicate the example
in JS. In the example folder there are two files,
one in JS and one in CFG, that represents the same
configuration. 

<div id="heading--3-1"/>

### Proxy HTTP

```
# Match port
#
from *:8080
proxy amedeosetti.com

# Match domain and port
#
from yourdomain:8080
proxy amedeosetti.com

# Match domain, port and location
#
from yourdomain:8080/as
proxy amedeosetti.com
```

<div id="heading--3-2"/>

### Proxy HTTPS

```
# HTTPS to HTTPS
# Match domain yourproxydomain.com
#
from ssl yourproxydomain.com:443
use ssl key /AbolutePathToKey/yourproxydomain-key.pem 
use ssl cert /AbolutePathToCrtChained/yourproxydomain.pem
request set host yourdomain.com 
proxy ssl yourdomain.com

# HTTPS to HTTP
#
from ssl yourproxydomain.com:443
use ssl key /AbolutePathToKey/yourproxydomain-key.pem 
use ssl cert /AbolutePathToCrtChained/yourproxydomain.pem
request set host yourdomain.com 
proxy yourdomain.com

# HTTP to HTTPS
#
from *:8080
request set host yourdomain.it 
request set x-forwarded-proto https
proxy ssl yourdomain.com
```

<div id="heading--3-3"/>

### Proxy TCP

```
# Proxy to MySQL cluster
#
from tcp *:3306
balance round-robin
proxy tcp mysql01.local:3306 mysql02.local:3306 mysql03.local:3306

# Proxy to MQTT broker
#
from tcp *:1883 
proxy tcp 10.10.10.1:1883
```

<div id="heading--3-4"/>

### Serve files

```
# Serve a dir
#
from *:80
serve dir /AbsolutePath/filesToServe 

# Serve only direct matches,
# every request not matched will end in 403
#
from *:80/myfile.json
serve /AbsolutePath/filesToServe/myfile.json
```

<div id="heading--3-5"/>

### Exec custom scripts

```
# We will execute a Python script
#
from *:80
exec python3 /AbsolutePath/script.py 

# Same but passing query to script
#
from *:80/myfile.json
exec python3 /AbsolutePath/script.py §query
```

<div id="heading--3-6"/>

### Hot reload

```sh
./redx reload
```

or with systemd:

```sh
service redx reload
```

NB:
Currently HTTPS certificates are NOT reloaded,
so if you change your HTTPS virtual host,
you need to do an hard restart, loosing the
running connections. This will be fixed soon.

<div id="heading--3-7"/>

### Balance request

| mode |  description | available |
|-|-|-|
| first | select the first backend    | Proxy to HTTP,HTTPS,TCP |
| second | select the second backend  | Proxy to HTTP,HTTPS,TCP |
| third | select the third backend    | Proxy to HTTP,HTTPS,TCP |
| random | select random backend      | Proxy to HTTP,HTTPS,TCP |
| round-robin | follow round robin scheme for backend selection | Proxy to HTTP,HTTPS,TCP |
| client-ip | select the backend based on the request remote ip | Proxy to HTTP,HTTPS,TCP |
| session | cooming soon | Proxy to HTTP,HTTPS |

```
from *:8080
request set host promfacility.eu
request set x-forwarded-proto https
balance client-ip
proxy ssl promfacility.eu promfacility.it
```

*You should balance before proxing the request,
because balancing after proxing could be ineffective :D.
Remember that every step is executed in the order you defined.*

**The following example is wrong, will run but will not
balance!**

```
# WRONG
# 
from *:8080
request set host promfacility.eu
request set x-forwarded-proto https
proxy ssl promfacility.eu promfacility.it
balance client-ip
```

<div id="heading--3-8"/>

### Basic IP filtering

```
# Allow only localhost (::1)
#
from *:8080
allow ip ::1
proxy amedeosetti.com

# Deny some IP
#
from *:8080
deny ip 192.168.1.1 192.168.1.2 192.168.1.3
proxy amedeosetti.com
```

CIDR filtering will come soon.

### HTTP Method filtering

Methods specified are case insensitive.

```
# Allow only GET and HEAD methods
#
from *:8080
allow method get head
proxy amedeosetti.com

# Allow POST, PUT, DELETE methods
#
from *:8080
deny method post put delete
proxy amedeosetti.com
```

<div id="heading--3-9"/>

### Modify the request headers

By default all the request headers are passed
to the backends, so you only need to change or hide
the values that you don't want to pass.

```
from *:8080
request set host amedeosetti.com
request hide referer
request set user-agent "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36"
proxy amedeosetti.com
```

In the user-agent header, we used the *""* in order to escapes spaces in the string.
Without the *""*, (X11; would be interpreted as another command.


<div id="heading--3-10"/>

### Auto register the backends

*RedX* allow the backends to self register to be proxied.
You need to allow this behaviour (*allow register*) like this:

```
# RedX host IP is: 10.10.10.1
#
from *:8282 
allow register
use check time 1
balance client-ip
```

We use the check time in order to auto de-register the dead
backends. One check every second.

Now from every backend you want to register,
make a simple curl POST request to the RedX host,
to the Unit you allowed to be registered, like:

*curl --data "backendIpOrHostname:backendServicePort" http://redxhost.local:8282/redx/register*

```
curl --data "10.10.10.10:4000" http://10.10.10.1:8282/redx/register
curl --data "10.10.10.11:4002" http://10.10.10.1:8282/redx/register
```

If you want to authenticate the registration, you can set a *secret*,
like this:

```
# RedX host IP is: 10.10.10.1
#
from *:8282 
allow register secret YOUR_SUPER_SECRET
use check time 1
balance client-ip
```

and then make the registration request including the secret:

```
curl --data "10.10.10.10:4000::YOUR_SUPER_SECRET" http://10.10.10.1:8282/redx/register  # => return 200
curl --data "10.10.10.11:4002" http://10.10.10.1:8282/redx/register # => return 403, because no secret is provided
```

If your backend is Node app, you can use the module [redx-backend-client](https://github.com/adda25/redx-backend-client) in order to automate this feature.

<div id="heading--4"/>

## Install 

<div id="heading--4-1"/>

### Binaries (Neither Node nor NPM required)

```sh
wget https://redx.promfacility.eu/release/x64/linux/redx # or: x64/macos/redx, x64/win/redx (win never tested) 

./redx start # *start* will fork the master redx process and exit
./redx start custom_conf_file.conf
./redx it custom_conf_file.conf # same as start but without fork => InTeractive
./redx status
./redx reload
./redx restart
./redx stop
./redx cli your_commands
```

If you want to use *systemd* to manage RedX, after
the binary download type these commands:

```sh
./redx systemd conf # check yourself the prebuilt conf for systemd
./redx systemd install # install the service for systemd
systemctl enable redx
service redx start
service redx reload
service redx restart
service redx stop
service redx status
```


<div id="heading--4-2"/>

### Using NPM:

As module:

```sh
npm i --save @tsadda25/redx
redx start
redx start file.conf
redx it
redx it file.conf
redx stop
redx reload
redx restart
redx version
```

Or globally

```sh
npm i -g @tsadda25/redx
```

### From source:

```sh
git clone https://github.com/adda25/redx.git
cd redx
npm pack
npm i -g redx-0.0.1.tgz
```

<div id="heading--4-3"/>

### Using Docker

Change the ports and the source volume configuration file according to
your needs. 

```sh
git clone https://github.com/adda25/redx.git
cd redx
docker build . -t redx
docker run -p80:80 -v$(pwd)/yourconfig.conf:/usr/src/app/redx.conf redx
```


## Package the source [To make an executable]

In order to make a package,
you need PKG from Zeit installed globally:

```sh
npm install -g pkg 
```

then:

```
git clone https://github.com/adda25/redx.git
cd redx
npm install
pkg index.js -t node12-linux-x64
pkg index.js -t node12-macos-x64 
pkg index.js -t node12-win-x64 
```

<div id="heading--5"/>

## Todos

- Unit testing (already on the move)
- Allow extending RedX with your core module (For instance, using your balance class)
- Improve stats
- Sessions
- Cache
- Rewrite urls 
- UDP Proxy
- Web Socket (already on the move)
- Web Control Panel (already on the move)
- Log/Syslog
- Federations of RedX on multiple hosts


<div id="heading--6"/>

## License

RedX is released under the MIT license. See the file LICENSE.txt for the license text.
