const Flowable = require('rsocket-flowable').Flowable;
const Single = require('rsocket-flowable').Single;

const values = [[0, 1, 2, 3], [0, 1, 2, 3], 0, 1, 2, 3];

const flowable = new Flowable(subscriber => {
    // lambda is not executed until `subscribe()` is called
    subscriber.onSubscribe({
        cancel: () => {/* no-op */
        },
        request: n => {
            while (n--) {
                if (values.length) {
                    const next = values.shift();
                    // Can't publish values until request() is called
                    subscriber.onNext(next);
                } else {
                    subscriber.onComplete();
                    break;
                }
            }
        }
    });
});

flowable.subscribe({
    onComplete: () => console.log('done'),
    onError: error => console.error(error),
    onNext: value => console.log(value),
    // Nothing happens until `request(n)` is called
    onSubscribe: sub => sub.request(4),
});
console.log();

function buildResponse(index) {
    let json = {
        id: index,
        value: "hello" + index
    };
    const buf = JSON.stringify(json);
    return {data: buf, metadata: 'NODEJS'};
}

let ids = ['a', 'b', 'c'];
let responses = [];
ids.forEach(id => {
    let response = buildResponse(id);
    responses.push(response);
});

flowable2 = Flowable.just(responses);
flowable2.subscribe({
    onNext: values => {
        try {
            values.forEach(value => {
                const result = JSON.parse(value.data);
                console.log(`data: ${result.id || 'null'}:${result.value || 'null'}, metadata: ${value.metadata}`);
            });
        } catch (e) {
            console.error(e);
        }
    },
    onSubscribe: sub => sub.request(100),
});
console.log();
const single = new Single(subscriber => {
    const id = setTimeout(
        () => subscriber.onComplete('hello!'),
        250,
    );
    // Cancellation callback is optional
    subscriber.onSubscribe(() => clearTimeout(id));
});
single.subscribe({
    onComplete: data => console.log(data),
    onError: error => console.error(error),
    onSubscribe: cancel => {/* call cancel() to stop onComplete/onError */
    },
});