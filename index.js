const express = require("express");
const http = require("http");
const app = express();
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
const server = http.createServer(app);
app.listen()
const socket = require("socket.io");
const io = socket(server);

const users = {};

const socketToRoom = {};

io.on('connection', socket => {
    socket.on("join room", data => {
        if (users[data.roomID]) {
            // const length = users[data.roomID].length;
            // if (length === 2) {
            //     socket.emit("room full");
            //     return;
            // }
            users[data.roomID].push(socket.id);
        } else {
            users[data.roomID] = [socket.id];
        }
        // socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[data.roomID].filter(id => id !== socket.id);
        console.log('users in the room ', usersInThisRoom)
        socket.emit("usersInLink" + data.roomID, usersInThisRoom);
    });

    socket.broadcast.emit('userPresent', 'hello');

    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }
    });

});

server.listen(3030, () => console.log('server is running on port 3030'));