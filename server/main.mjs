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

    const senders = new Map();

    function getSenders(id) {
        if(!senders.has(id)) {
            senders.set(id, new Set());
        }
        return senders.get(id);
    }

    function boradcast(id, event, data) {
        const senders = getSenders(id);
        for(let sender of senders) {
            sender.send(event, data);
        }
    }

    function handleSender(socket) {
        const senders = getSenders(socket.roomId);
        senders.add(socket);
    }

    function handleDisconnect(socket) {
        const senders = getSenders(socket.roomId);
        if(senders.has(socket)) {
            senders.delete(socket);
            console.log('sneder diconnected');
        }
    }

    const requests = {};

    io.on("connection", (socket) => {
        socket.on('disconnect', e => {
            handleDisconnect(socket);
        });

        const originHref = new URL(socket.handshake.headers.referer);
        const roomId = originHref.search.slice(1);
        socket.roomId = roomId;

        socket.on("message", (type, data) => {
            switch(type) {
                case 'requestPreview':
                    const reqid = uuidv4();
                    requests[reqid] = reqData => {
                        socket.send('previewOffer', { 
                            clientId: reqData.clientId,
                            description: reqData.description,
                            id: reqid
                        });
                    }
                    boradcast(socket.roomId, 'createOffer', { id: reqid });
                    break;
                case 'offer':
                    if(requests[data.id]) {
                        requests[data.id](data);
                    }
                    break;
                case 'answer':
                    boradcast(socket.roomId, 'answer', data);
                    break;
                case 'boradcast':
                    handleSender(socket);
                    console.log("sneder connected");
                    break;
            }
        });
    });

    app.use('/', express.static(path.resolve('./public')));

    console.log('App listening on ' + PORT);
    server.listen(PORT);
}

main();
