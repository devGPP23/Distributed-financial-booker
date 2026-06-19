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
// lets subscribe to pub/sub channels 
//We use subscribe to listen to ALL symbols using a pattern (e.g. ORDER_BOOK_UPDATE_BTC)

subscriber.psubscribe('ORDER_BOOK_UPDATE_*',(err,count)=>{
    if(err){
        console.error('Failed to subscribe',err);
        return;
    }
    console.log(`Subscribed to ${count} patterns `);
});

// 3.jab route se message aya aur redis ne suna then usko broadcast karo
subscriber.on('pmessage',(pattern,channel,message)=>{
    // channel name looks like "ORDER_BOOK_UPDATE_ETH". Let's extract "ETH"
    const symbol = channel.replace('ORDER_BOOK_UPDATE_','');
    // Broadcast the JSON data to ALL connected WebSockets
    io.emit('orderbook_update',{
        symbol: symbol,
        data: JSON.parse(message)
    });
});
}

module.exports = initWebSockets;