'use strict';
const Deferred = interopRequireDefault(require('fbjs/lib/Deferred'));
const rsocketCore = require('rsocket-core');

const rsocketWebsocketServer = interopRequireDefault(require('rsocket-websocket-server'));
const rsocketWebsocketClient = interopRequireDefault(require('rsocket-websocket-client'));
const rsocketTcpServer = interopRequireDefault(require('rsocket-tcp-server'));
const rsocketTcpClient = interopRequireDefault(require('rsocket-tcp-client'));
const yargs = interopRequireDefault(require('yargs'));
const ws = interopRequireDefault(require('ws'));
const HelloRSocket = require('./helloRSocket');

const argv = yargs.default
    .usage('$0 --host <host> --port <port>')
    .options({
        host: {default: '0.0.0.0', describe: 'server hostname.', type: 'string'},
        port: {default: 8080, describe: 'server port.', type: 'string'},
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
            default: 'stream',
            describe: 'the operation to perform.',
            choices: ['none', 'stream'],
        },
        payload: {default: 'Hi!', describe: 'the payload to send.', type: 'string'},
    })
    .choices('protocol', ['ws', 'tcp'])
    .help().argv;
const isClient = argv.mode === 'client';
const side = isClient ? 'Client' : 'Server';

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
                    runOperation(socket, options);
                    return new HelloRSocket(side);
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
                console.log('Connection status:', status);
            });
            return runOperation(socket, options);
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

function doOperation(socket, operation, payload) {
    switch (operation) {
        case 'none':
            return rsocketFlowable.Flowable.never();
        case 'stream':
        default:
            console.log(`Requesting stream with payload: ${payload}`);
            return socket.requestStream({data: payload, metadata: ''});
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

function runOperation(socket, options) {
    const deferred = new Deferred.default();
    let subscription;
    doOperation(socket, options.operation, options.payload).subscribe({
        onComplete() {
            console.log('onComplete()');
            deferred.resolve();
        },
        onError(error) {
            console.log('onError(%s)', error.message);
            deferred.reject(error);
        },
        onNext(payload) {
            console.log('onNext(%s)', payload.data);
        },
        onSubscribe(_subscription) {
            subscription = _subscription;
            subscription.request(rsocketCore.MAX_STREAM_ID);
        },
    });
    return deferred.getPromise();
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
        responder: new HelloRSocket(side),
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

function interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
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
