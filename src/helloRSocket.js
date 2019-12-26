const Deferred = interopRequire(require('fbjs/lib/Deferred'));
const rsocketFlowable = require('rsocket-flowable');
const rsocketCore = require('rsocket-core');

class HelloRSocket {
    constructor(side) {
        this.side = side;
    }

    metadataPush(payload) {
        logRequest(this.side, 'metadataPush', payload);
    }

    fireAndForget(payload) {
        logRequest(this.side, 'fnf', payload);
    }

    requestResponse(payload) {
        logRequest(this.side, 'requestResponse', payload);
        return rsocketFlowable.Single.of(mockPayload(payload));
    }

    requestStream(payload) {
        logRequest(this.side, 'requestStream', payload);
        return rsocketFlowable.Flowable.just(mockPayload('Hello '), mockPayload('world!'));
    }

    requestChannel(payloads) {
        logRequest(this.side, 'requestChannel', payloads);
        return rsocketFlowable.Flowable.just(
            mockPayload('Hello '),
            mockPayload('你好'));
    }

    runOperation(socket, options) {
        const deferred = new Deferred.default();
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
            onSubscribe(subscription) {
                try {
                    subscription.request(rsocketCore.MAX_STREAM_ID);
                } catch (e) {
                }
            },
        });
        return deferred.getPromise();
    }
}

function doOperation(socket, operation, payload) {
    console.log(`Requesting with payload: ${payload}`);
    switch (operation) {
        default:
            return rsocketFlowable.Flowable.never();
        case 'mp':
            return socket.metadataPush({metadata: 'PUSH'});
        case 'fnf':
            return socket.fireAndForget({data: 'FNF'});
        case 'rr':
            return socket.requestResponse(mockPayload(payload));
        case 'rs':
            return socket.requestStream(mockPayload(payload));
        case 'rc':
            return socket.requestChannel(rsocketFlowable.Flowable.just(mockPayload('Hello '), mockPayload('world!')));
    }
}

function logRequest(side, type, payload) {
    console.log(`${side} got ${type} with payload: data: ${payload.data || 'null'},metadata: ${payload.metadata || 'null'}`);
}

function mockPayload(data) {
    return {data, metadata: 'NODEJS'};
}

function interopRequire(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
}

module.exports = HelloRSocket;