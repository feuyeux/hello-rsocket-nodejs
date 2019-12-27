'use strict';
const Deferred = interopRequire(require('fbjs/lib/Deferred'));
const rsocketCore = require('rsocket-core');
const rsocketWebsocketServer = interopRequire(require('rsocket-websocket-server'));
const rsocketWebsocketClient = interopRequire(require('rsocket-websocket-client'));
const rsocketTcpServer = interopRequire(require('rsocket-tcp-server'));
const rsocketTcpClient = interopRequire(require('rsocket-tcp-client'));
const yargs = interopRequire(require('yargs'));
const ws = interopRequire(require('ws'));

const HelloRSocket = require('./helloRSocket');

const argv = yargs.default
    .usage('$0 --host <host> --port <port>')
    .options({
        host: {default: '0.0.0.0', describe: 'server hostname.', type: 'string'},
        port: {default: 7878, describe: 'server port.', type: 'string'},
        protocol: {
            default: 'tcp',
            describe: 'the protocol.',
            choices: ['ws', 'tcp'],
        },
        mode: {
            default: 'client',
            describe: 'the protocol.',
            choices: ['client', 'server'],
        },
        operation: {
            default: 'rr',
            describe: 'the operation to perform.',
            choices: ['mp', 'fnf', 'rr', 'rs', 'rc'],
        }
    })
    .choices('protocol', ['ws', 'tcp'])
    .help().argv;

const isClient = argv.mode === 'client';
const helloRSocket = new HelloRSocket();

let run = (() => {
    let ref = asyncToGenerator(function* (options) {
        const connectOptions = {
            host: options.host,
            port: options.port,
        };

        if (!isClient) {
            const deferred = new Deferred.default();
            const server = new rsocketCore.RSocketServer({
                getRequestHandler: function (socket) {
                    //helloRSocket.runOperation(socket, options);
                    return helloRSocket;
                },
                transport: getServerTransport(options.protocol, connectOptions),
            });
            server.start();
            console.log(`Server started on ${options.host}:${options.port}`);
            return deferred.getPromise();
        } else {
            console.log(`Client connecting to ${options.host}:${options.port}`);
            // $FlowFixMe
            const socket = yield connect(options.protocol, connectOptions);
            socket.connectionStatus().subscribe(function (status) {
                console.debug('Connection status:', status);
            });
            return helloRSocket.runOperation(socket, options);
        }
    });
    return function run(_x) {
        return ref.apply(this, arguments);
    };
})();

function getServerTransport(protocol, options) {
    switch (protocol) {
        case 'tcp':
        default:
            return new rsocketTcpServer.default(Object.assign({}, options));
        case 'ws':
            return new rsocketWebsocketServer.default(Object.assign({}, options));
    }
}

function getClientTransport(protocol, options) {
    switch (protocol) {
        case 'tcp':
        default:
            return new rsocketTcpClient.default(Object.assign({}, options));
        case 'ws':
            return new rsocketWebsocketClient.default({
                url: 'ws://' + options.host + ':' + options.port,
                wsCreator: url => {
                    return new ws.default(url);
                },
            });
    }
}

function connect(protocol, options) {
    const client = new rsocketCore.RSocketClient({
        setup: {
            dataMimeType: 'application/octet-stream',
            metadataMimeType: 'application/octet-stream',
            // ms btw sending keepalive to server
            keepAlive: 60000,
            // ms timeout if no keepalive response
            lifetime: 180000,
        },
        responder: helloRSocket,
        transport: getClientTransport(protocol, options),
    });
    return client.connect();
}

function asyncToGenerator(fn) {
    return function () {
        let gen = fn.apply(this, arguments);
        return new Promise(function (resolve, reject) {
            function step(key, arg) {
                let info = gen[key](arg);
                let value = info.value;
                if (info.done) {
                    resolve(value);
                } else {
                    return Promise.resolve(value).then(
                        function (value) {
                            step('next', value);
                        },
                        function (err) {
                            step('throw', err);
                        }
                    );
                }
            }

            return step('next');
        });
    };
}

function interopRequire(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
}

console.debug = function () {
}

Promise.resolve(run(argv)).then(
    () => {
        console.log('exit');
        process.exit(0);
    },
    error => {
        console.error(error.stack);
        process.exit(1);
    }
);
