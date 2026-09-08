const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./config/dbConnect");
const initializeSocket = require("./service/socketService");
const authRoutes = require('./routers/authRoute');
const statusRoutes = require('./routers/statusRoutes');

const chatRoutes = require('./routers/chatRoute');
const PORT = process.env.PORT;
const http = require('http');
const app = express();
const frontendOrigin = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');


const server = http.createServer(app);
const io = initializeSocket(server);
app.use((req,res,next)=>{
    req.io = io;
    req.socketUserMap = io.socketUserMap;
    next();
})

app.use(cors({
    origin: frontendOrigin,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/status', statusRoutes);

connectDB();

server.listen(PORT,()=>{
    console.log(`server running on port ${PORT}`)
});
