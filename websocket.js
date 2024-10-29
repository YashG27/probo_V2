import express from "express"
import { WebSocketServer } from "ws"
import { createClient } from "redis"

const subscriber = createClient();
const app = express()
app.get("/", (req, res) => {
    res.send("Server is running")
})
const httpServer = app.listen(8080)

let subscriptions = {
    stock : {
        connections : []
    }
};

async function startServer(){
    try{
        await subscriber.connect()
        console.log("Subscriber client connected")
    }catch(e){
        console.log("Error connecting to redis", e.message)
    }
}
startServer()

const handleSubscription = (ws, data) => {
    const symbol = data.symbol
    if(data.method === "SUBSCRIBE"){
        if(!subscriptions[symbol]){
            subscriptions[symbol] ={ connections : [] };
        }
        subscriptions[symbol]["connections"].push(ws)
        if(subscriptions[symbol]["connections"].length === 1){
            console.log("Subscribing on the pub sub to chanel", symbol)
            subscriber.subscribe(symbol, (message) => {
                console.log(message)
                for( const conn of subscriptions[symbol]["connections"]){
                    try{
                        conn.send(message)
                    }catch(e){
                        console.log(e)
                    }
                }
            })
        }
    }
    if(data.method === "UNSUBSCRIBE"){
        const index = subscriptions[symbol]["connections"].indexOf(ws);
        if(!index){
            ws.send('Subscription does not exist');
            return ;
        }
        delete subscriptions[symbol]["connections"][index];
        ws.send("Unsubscribed successfully")
        if(subscriptions[symbol]["connections"].length === 0){
            console.log("Unsubscribing on the pub sub to chanel", symbol)
            subscriber.unsubscribe(symbol)
        }
    }
}

const wss = new WebSocketServer( {server : httpServer})
wss.on('connection', async (ws) => {
    ws.send("Connected succesfully");
    ws.on('error', console.error);
    ws.on('message', (message) => {
        const parsed = JSON.parse(message);
        handleSubscription(ws, parsed);
    })
    ws.on('close', () => {
        const index = subscriptions[symbol]["connections"].indexOf(ws);
        for ( let symbol in subscriptions){
        subscriptions[symbol].connections = subscriptions[symbol].connections.filter( (data) => data !== ws)
    }
        delete subscriptions[symbol]["connections"][index];
    })
});