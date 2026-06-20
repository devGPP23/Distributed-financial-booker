const {Server} = require('socket.io');
const Redis = require ('ioredis');
const subscriber = new Redis({ // new connection to redis other than that get set wala so that dono things alag alg ho
    host:'localhost',
    port: 6379
});
// connection and initialization
function initWebSockets(httpServer){
    const io = new Server(httpServer,{ // aise  initialize karte socket.io ko
        cors:{origin:'*'} // we r allowing frontend to connect from any domain
    });
    io.on('connection',(socket)=>{
        console.log(`new client connected:${socket.id}`);
        socket.on('disconnect',()=>{
            console.log(`client disconnected:${socket.id}`);
        });
    });
// pub/sub channels ko sunne ke liye
// pattern match karke sab symbols sunenge jaise BTC, ETH

subscriber.psubscribe('ORDER_BOOK_UPDATE_*',(err,count)=>{
    if(err){
        console.error('Failed to subscribe',err);
        return;
    }
    console.log(`Subscribed to ${count} patterns `);
});

// jab route se message aya aur redis ne suna then usko sabko bhej do
subscriber.on('pmessage',(pattern,channel,message)=>{
    // channel ke naam se symbol (jaise ETH) nikal rahe hai
    const symbol = channel.replace('ORDER_BOOK_UPDATE_','');
    // sabhi connected clients ko naya data bhej do
    io.emit('orderbook_update',{
        symbol: symbol,
        data: JSON.parse(message)
    });
});
}

module.exports = initWebSockets;