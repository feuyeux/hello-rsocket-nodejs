/** Copyright (c) Facebook, Inc. and its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 *
 */

/* eslint-disable sort-keys */

'use strict';
let run = (() => {
  var _ref = _asyncToGenerator(function*(options) {
    const serverOptions = {
      host: options.host,
      port: options.port,
    };

    if (!isClient) {
      const deferred = new _Deferred2.default();
      const server = new _rsocketCore.RSocketServer({
        getRequestHandler: function(socket) {
          runOperation(socket, options);
          return new SymmetricResponder();
        },
        transport: getServerTransport(options.protocol, serverOptions),
      });

      server.start();

      console.log(`Server started on ${options.host}:${options.port}`);
      return deferred.getPromise();
    } else {
      console.log(`Client connecting to ${options.host}:${options.port}`);
      // $FlowFixMe
      const socket = yield connect(options.protocol, serverOptions);

      socket.connectionStatus().subscribe(function(status) {
        console.log('Connection status:', status);
      });

      return runOperation(socket, options);
    }
  });
  return function run(_x) {
    return _ref.apply(this, arguments);
  };
})();
var _Deferred = require('fbjs/lib/Deferred');
var _Deferred2 = _interopRequireDefault(_Deferred);
var _rsocketCore = require('rsocket-core');
var _rsocketFlowable = require('rsocket-flowable');
var _rsocketWebsocketServer = require('rsocket-websocket-server');
var _rsocketWebsocketServer2 = _interopRequireDefault(_rsocketWebsocketServer);
var _rsocketWebsocketClient = require('rsocket-websocket-client');
var _rsocketWebsocketClient2 = _interopRequireDefault(_rsocketWebsocketClient);
var _rsocketTcpServer = require('rsocket-tcp-server');
var _rsocketTcpServer2 = _interopRequireDefault(_rsocketTcpServer);
var _rsocketTcpClient = require('rsocket-tcp-client');
var _rsocketTcpClient2 = _interopRequireDefault(_rsocketTcpClient);
var _yargs = require('yargs');
var _yargs2 = _interopRequireDefault(_yargs);
var _ws = require('ws');
var _ws2 = _interopRequireDefault(_ws);
function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {default: obj};
}
function _asyncToGenerator(fn) {
  return function() {
    var gen = fn.apply(this, arguments);
    return new Promise(function(resolve, reject) {
      function step(key, arg) {
        try {
          var info = gen[key](arg);
          var value = info.value;
        } catch (error) {
          reject(error);
          return;
        }
        if (info.done) {
          resolve(value);
        } else {
          return Promise.resolve(value).then(
              function(value) {
                step('next', value);
              },
              function(err) {
                step('throw', err);
              }
          );
        }
      }
      return step('next');
    });
  };
}
const argv = _yargs2.default
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
function make(data) {
  return {data, metadata: ''};
}
function logRequest(type, payload) {
  console.log(
      `${side} got ${type} with payload: data: ${payload.data || 'null'},
      metadata: ${payload.metadata || 'null'}`
  );
}
class SymmetricResponder {
  fireAndForget(payload) {
    logRequest('fnf', payload);
  }
  requestResponse(payload) {
    logRequest('requestResponse', payload);
    return _rsocketFlowable.Single.error(new Error());
  }
  requestStream(payload) {
    logRequest('requestStream', payload);
    return _rsocketFlowable.Flowable.just(make('Hello '), make('world!'));
  }
  requestChannel(payloads) {
    return _rsocketFlowable.Flowable.error(new Error());
  }
  metadataPush(payload) {
    logRequest('metadataPush', payload);
    return _rsocketFlowable.Single.error(new Error());
  }
}
function getServerTransport(protocol, options) {
  switch (protocol) {
    case 'tcp':
    default:
      return new _rsocketTcpServer2.default(Object.assign({}, options));
    case 'ws':
      return new _rsocketWebsocketServer2.default(Object.assign({}, options));
  }
}
function doOperation(socket, operation, payload) {
  switch (operation) {
    case 'none':
      return _rsocketFlowable.Flowable.never();
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
      return new _rsocketTcpClient2.default(Object.assign({}, options));
    case 'ws':
      return new _rsocketWebsocketClient2.default({
        url: 'ws://' + options.host + ':' + options.port,
        wsCreator: url => {
          return new _ws2.default(url);
        },
      });
  }
}
function runOperation(socket, options) {
  const deferred = new _Deferred2.default();
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
      subscription.request(_rsocketCore.MAX_STREAM_ID);
    },
  });
  return deferred.getPromise();
}
function connect(protocol, options) {
  const client = new _rsocketCore.RSocketClient({
    setup: {
      dataMimeType: 'text/plain',
      keepAlive: 1000000, // avoid sending during test
      lifetime: 100000,
      metadataMimeType: 'text/plain',
    },
    responder: new SymmetricResponder(),
    transport: getClientTransport(protocol, options),
  });
  return client.connect();
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
