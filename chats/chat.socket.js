var socket_io = require("socket.io");
var socketioJwt = require("socketio-jwt");
const client = require('../helpers/mongodb');
const { ObjectId } = require('mongodb');
var xss = require("xss");
var io = socket_io();
var socketApi = {};
var chatId_MessageCount = 0
const chatService = require('./chat.service');
const conf = require('../config.json');
const event = require('events');
class MyEmitter extends event.EventEmitter { }
const myEmitter = new MyEmitter();

socketApi.io = io;

io.use(
  socketioJwt.authorize({
    secret: conf.secret,
    handshake: true,
  })
);


io.on("connection", async (socket) => {
  try {
    socket.join(socket.decoded_token.userid);

    socket.on("chats", async (msg) => {
      try {

        if (!msg.to && !msg.message && msg?.images.length===0 && !msg.chatid) {
          var msg = JSON.parse(msgParsing);
        }
        console.log("🚀 ~ socket.on ~ msg:", msg);


        if (msg.to && (msg?.message || msg?.images.length>0) && msg.chatid) {
          var result = await chatService.validateConversation(
            socket.decoded_token.userid,
            msg.to,
            msg.chatid
          );

          console.log("result.hasOwnProperty(`error`)", result);

          if (!result.hasOwnProperty("error")) {
            msg.message = xss(msg.message);
            msg.from = socket.decoded_token.userid;
            console.log("msg.images", msg.images);

            var chat = new Object();
            chat.message = msg.message;
            chat.images = msg.images;
            chat.from = new ObjectId(socket.decoded_token.userid);
            chat.to = new ObjectId(msg.to);
            chat.chat_id = new ObjectId(msg.chatid);
            chat.t = new Date();

            msg.t = chat.t;

            result = await chatService.insertchat(chat);

            if (!result.hasOwnProperty("error")) {
              io.to(msg.to).emit("messages", msg);

              let id = chat.chat_id + "_" + chat.to;
              let msg_id = "m_" + chat.chat_id + "_" + chat.to;
              let msg_id_from = "m_" + chat.chat_id + "_" + chat.from;

              io.to(socket.decoded_token.userid).emit("messages", msg);

              var data = new Object({
                chat_id: chat.chat_id,
                receiver_id: chat.to,
                token: socket.encoded_token,
                message: chat.message,
              });

              //await SendMessage(data);
            }
          }
        }
      } catch (err) {
        console.log(err);
      }
    });

    // socket.on("location", async (data) =>{
    //   console.log(data)
    // })
    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  } catch (err) {
    console.log(err);
  }
});


module.exports = socketApi;
