import express from 'express';
import { Server as IoServer } from "socket.io";
import path from 'path';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 3000;

async function main() {
    const app = express();
    const server = http.Server(app);
    const io = new IoServer(server);

    let senders = [];

    const requests = {};

    io.on("connection", (socket) => {
        console.log("socket connected");

        socket.on("message", (type, data) => {
            switch(type) {
                case 'requestPreview':
                    const reqid = uuidv4();
                    requests[reqid] = description => {
                        socket.send('previewOffer', { description, id: reqid });
                    }
                    for(let sender of senders) {
                        sender.send('createOffer', { id: reqid });
                    }
                    break;
                case 'offer':
                    if(requests[data.id]) {
                        requests[data.id](data.description);
                    }
                    break;
                case 'answer':
                    for(let sender of senders) {
                        sender.send('answer', data);
                    }
                    break;
                case 'boradcast':
                    senders.push(socket);
                    console.log("sneder connected");
                    break;
            }
        });
    });

    app.use('/', express.static(path.resolve('./public')));
    app.use('/', (req, res) => {
        res.sendFile(path.resolve('./public/index.html'));
    });

    console.log('App listening on ' + PORT);
    server.listen(PORT);
}

main();
