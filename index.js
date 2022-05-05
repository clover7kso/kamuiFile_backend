import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import path from "path";
const __dirname = path.resolve();

const CORS_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https//woony.ml";

const PATH_URL = process.env.NODE_ENV === "development" ? "/" : "/backend";

let app = express();
let server = http.createServer(app);
let io = new Server(server, {
  path: PATH_URL,
  cors: {
    origin: [CORS_URL],
    methods: ["GET", "POST"],
  },
});

app.use(cors());
const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

function generateRandomCode(n) {
  let str = "";
  for (let i = 0; i < n; i++) {
    str += Math.floor(Math.random() * 10);
  }
  return str;
}

const users = {};

const socketToRoom = {};

io.on("connection", (socket) => {
  //console.log("connection: " + socket);
  socket.on("create room", () => {
    const roomID = generateRandomCode(6);
    //console.log("create room: " + roomID);
    users[roomID] = [socket.id];
    socketToRoom[socket.id] = roomID;
    //console.log(users[roomID]);
    socket.timeout(30000).emit("create room done", roomID, (err, response) => {
      if (err) socket.disconnect();
    });
  });

  socket.on("join room", (roomID) => {
    //console.log("join room");
    //console.log(users[roomID]);
    if (users[roomID]) {
      const length = users[roomID].length;
      if (length === 2) {
        socket.emit("room full");
        return;
      }
      users[roomID].push(socket.id);
    }
    socketToRoom[socket.id] = roomID;
    //console.log(users[roomID]);

    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);
    //console.log("usersInThisRoom");
    //console.log(usersInThisRoom);

    socket.emit("all users", usersInThisRoom);
  });

  socket.on("sending signal", (payload) => {
    //console.log("sending signa: ");
    //console.log(payload);
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on("returning signal", (payload) => {
    //console.log("returning signal: ");
    //console.log(payload);
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on("disconnect", () => {
    //console.log("disconnect: ");
    const roomID = socketToRoom[socket.id];
    delete users[roomID];
    delete socketToRoom[socket.id];
  });
});

server.listen(PORT, () => {
  console.log(`server running on ${PORT}`);
});
