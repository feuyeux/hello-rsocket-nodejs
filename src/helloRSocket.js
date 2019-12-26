const rsocketFlowable = require('rsocket-flowable');

class HelloRSocket {
    constructor(side) {
        this.side = side;
    }

    fireAndForget(payload) {
        logRequest(this.side, 'fnf', payload);
    }

    requestResponse(payload) {
        logRequest(this.side, 'requestResponse', payload);
        return rsocketFlowable.Single.error(new Error());
    }

    requestStream(payload) {
        logRequest(this.side, 'requestStream', payload);
        return rsocketFlowable.Flowable.just(make('Hello '), make('world!'));
    }

    requestChannel(payloads) {
        return rsocketFlowable.Flowable.error(new Error());
    }

    metadataPush(payload) {
        logRequest(this.side, 'metadataPush', payload);
        return rsocketFlowable.Single.error(new Error());
    }
}

function logRequest(side, type, payload) {
    console.log(
        `${side} got ${type} with payload: data: ${payload.data || 'null'},
      metadata: ${payload.metadata || 'null'}`
    );
}

function make(data) {
    return {data, metadata: ''};
}

module.exports = HelloRSocket;