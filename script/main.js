const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

io.on("connection", (socket) => {
    console.log("New client connected");

    socket.on("draw", (data) => {
        socket.broadcast.emit("draw", data);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected");
    });
});

server.listen(3001, () => {
    console.log("Server is running on port 3001");
});
