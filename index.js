const express = require('express');
const app = express();

const TOKEN = "YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm";

const port = 9700;
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

db.defaults({ tests: [], running: false }).write()


const FastSpeedtest = require("fast-speedtest-api");

let speedtest = new FastSpeedtest({
    token: TOKEN, // required
    verbose: false, // default: false
    timeout: 10000, // default: 5000
    https: true, // default: true
    urlCount: 5, // default: 5
    bufferSize: 8, // default: 8
    unit: FastSpeedtest.UNITS.Mbps // default: Bps
});

app.use(express.json());
app.use(express.static(__dirname + '/build'));
app.use(express.static(__dirname + '/images'));

const server = require('http').Server(app);
const io = require('socket.io')(server);

app.get('/api/speed/test', (res, req) => {
    speedtest.getSpeed().then(s => {
        console.log({ x: new Date(), y: s.toFixed(0) });
        res.send({ x: new Date(), y: s.toFixed(0) })
    }).catch(e => {
        console.error(e.message);
    });
})

const run = () => {
    console.log(db.get('running').value())
    if (db.get('running').value()) {
        setTimeout(() => {
            speedtest.getSpeed().then(s => {
                console.log({ x: new Date(), y: s.toFixed(0) });
                db.get('tests')
                    .push({ x: new Date(), y: s.toFixed(0) })
                    .write()
                run();
            }).catch(e => {
                console.error(e);
                run();
            });
        }, 1000);
    }
    else {
        console.log('Tests complete.')
    }
}

app.get('/api/speed/start', (res, req) => {
    db.set('running', true).write();
    speedtest.getSpeed().then(s => {
        console.log({ x: new Date(), y: s.toFixed(0) });
        db.get('tests')
            .push({ x: new Date(), y: s.toFixed(0) })
            .write()

        req.send({ x: new Date(), y: s.toFixed(0) })
        run();
    }).catch(e => {
        console.error(e);
        req.send({ erro: "Unknown error, attempting test again." });
        run();
    });
})

app.get('/api/speed/stop', (res, req) => {
    db.set('running', false).write();
    console.log('Tests complete.');
    req.send({ running: false });
})

app.get('/api/speed/history', (res, req) => {
    const history = db.get('tests').value();
    req.send(history);
})

server.listen(port, () => {
    db.update('running', false).write()
    console.log('Fast test running on ' + port)
});