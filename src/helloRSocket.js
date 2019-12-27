const Deferred = interopRequire(require('fbjs/lib/Deferred'));
const rsocketFlowable = require('rsocket-flowable');
const rsocketCore = require('rsocket-core');

const hellos = ["Hello", "Bonjour", "Hola", "こんにちは", "Ciao", "안녕하세요"];

class HelloRSocket {
    metadataPush(payload) {
        logRequest('>> metadataPush', payload);
    }

    fireAndForget(payload) {
        logRequest('>> fnf', payload);
    }

    requestResponse(payload) {
        logRequest('>> requestResponse', payload);
        const request = JSON.parse(payload.data);
        let response = buildResponse(request.id);
        return rsocketFlowable.Single.of(response);
    }

    requestStream(payload) {
        logRequests('>> requestStream', payload);
        const request = JSON.parse(payload.data);
        let ids = request.ids;
        /*
        let responses = [];
        ids.forEach(id => {
            let response = buildResponse(id);
            responses.push(response);
        });
        return rsocketFlowable.Flowable.just(responses);*/
        return rsocketFlowable.Flowable.just(buildResponse(ids[0]), buildResponse(ids[1]), buildResponse(ids[2]));
    }

    requestChannel(payloads) {
        /*logRequests('>> requestChannel', payloads);
        payloads.subscribe({
            onNext(payload) {
                return rsocketFlowable.Flowable.just(buildResponse(payload.data));
            }
        });*/
        return rsocketFlowable.Flowable.just(buildResponse(1));
    }

    runOperation(socket, options) {
        const deferred = new Deferred.default();
        this.doRequest(socket, options, deferred);
        return deferred.getPromise();
    }

    doRequest(socket, options, deferred) {
        let operation = options.operation;
        switch (operation) {
            default:
                return rsocketFlowable.Flowable.never();
            case 'mp':
                return socket.metadataPush({metadata: 'PUSH'});
            case 'fnf':
                return socket.fireAndForget(buildRequest(1));
            case 'rr':
                return socket.requestResponse(buildRequest(1)).subscribe({
                    onError(error) {
                        console.log('requestResponse onError(%s)', error.message);
                        deferred.reject(error);
                    },
                    onComplete(payload) {
                        logResponse('<< requestResponse', payload);
                    }
                });
            case 'rs':
                return socket.requestStream(buildRequests([1, 2, 3])).subscribe({
                    onComplete() {
                        console.log('requestStream onComplete');
                        deferred.resolve();
                    },
                    onError(error) {
                        console.log('requestStream onError(%s)', error.message);
                        deferred.reject(error);
                    },
                    onNext(payload) {
                        logResponse('<< requestStream', payload);
                    },
                    onSubscribe(subscription) {
                        try {
                            console.log("request n=" + rsocketCore.MAX_STREAM_ID);
                            subscription.request(rsocketCore.MAX_STREAM_ID);
                        } catch (e) {
                        }
                    },
                });
            case 'rc':
                let flow = rsocketFlowable.Flowable.just(buildRequests([1, 2, 3]));
                return socket.requestChannel(flow).subscribe({
                    onComplete() {
                        console.log('requestChannel onComplete');
                        deferred.resolve();
                    },
                    onError(error) {
                        console.log('requestChannel onError(%s)', error.message);
                        deferred.reject(error);
                    },
                    onNext(payload) {
                        logResponse('<< requestChannel', payload);
                    },
                    onSubscribe(subscription) {
                        try {
                            subscription.request(rsocketCore.MAX_STREAM_ID);
                        } catch (e) {
                        }
                    },
                });
        }
    }
}

function logRequest(msg, payload) {
    const result = JSON.parse(payload.data);
    console.log(`${msg} data: ${result.id || 'null'}, metadata: ${payload.metadata || 'null'}`);
}

function logRequests(msg, payload) {
    const result = JSON.parse(payload.data);
    console.log(`${msg} data: ${result.ids || 'null'}, metadata: ${payload.metadata || 'null'}`);
}

function logResponse(msg, payload) {
    const result = JSON.parse(payload.data);
    console.log(`${msg} data: ${result.id || 'null'}:${result.value || 'null'}, metadata: ${payload.metadata || 'null'}`);
}

function logResponses(msg, payload) {
    try {
        payload.forEach(value => {
            const result = JSON.parse(value.data);
            console.log(`${msg} data: ${result.id || 'null'}:${result.value || 'null'}, metadata: ${value.metadata}`);
        });
    } catch (e) {
        console.error(e);
    }
}

function buildRequest(index) {
    console.debug("index=" + index);
    let json = {
        id: index
    };
    const buf = JSON.stringify(json);
    console.debug("buf=" + buf);
    return {data: buf, metadata: 'NODEJS'};
}

function buildRequests(indices) {
    let json = {
        ids: indices
    };
    const buf = JSON.stringify(json);
    console.debug("buf=" + buf);
    return {data: buf, metadata: 'NODEJS'};
}

function buildResponse(index) {
    console.debug("index=" + index);
    let json = {
        id: index,
        value: hellos[index]
    };
    const buf = JSON.stringify(json);
    console.debug("buf=" + buf);
    return {data: buf, metadata: 'NODEJS'};
}

function interopRequire(obj) {
    return obj && obj.__esModule ? obj : {default: obj};
}

console.debug = function () {
}

module.exports = HelloRSocket;