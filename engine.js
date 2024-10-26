import { createClient } from "redis";
const client = createClient();
const publisher = createClient();

import {
    createUser,
    createSymbol,
    getInrBalances,
    getStockBalances,
    getOrderbook,
    getStockOrderbook,
    getUserInrBalance,
    getUserStockBalance,
    onrampInr,
    mintTokens,
    sellOrder,
    buyOrder,
} from "./methods.js"

async function pollQueue(){
    try{
        const task = await client.brPop('queue', 0);
        if(task.element){
            console.log("Current task is", JSON.parse(task.element))
            await processRequest(JSON.parse(task.element))
        }
    }catch(e){
        console.log(e)
    }
    pollQueue()
}
async function start(){
    try{
        await Promise.all([
            client.connect(),
            publisher.connect()
        ])
        console.log("Engine connnected to redis and pub sub")
        pollQueue()
    }catch(e){
        console.log("Error connecting ", e.message)
    }
}
start()

const processRequest = async (task) => {
    let processedData;
    switch (task.method){
        case "createUser":
            processedData = createUser(task.payload);
            await publisher.publish(task.uid, JSON.stringify(processedData));
            break;
        case "createSymbol":
            processedData = createSymbol(task.payload);
            await publisher.publish(task.uid, JSON.stringify(processedData));
            break;
        case "getOrderbook":
            processedData = getOrderbook();
            await publisher.publish(task.uid, JSON.stringify(processedData));
            break;
        case "getInrBalances":
            processedData = getInrBalances();
            await publisher.publish(task.uid, JSON.stringify(processedData));
            break;
        case "getStockBalances":
            processedData = getStockBalances();
            await publisher.publish(task.uid, JSON.stringify(processedData));
            break;
        case "getUserInrBalance":
            processedData = getUserInrBalance(task.payload);
            await publisher.publish(task.uid, JSON.stringify(processedData));
            break;
        case "getUserStockbalance":
            processedData = getUserStockBalance(task.payload);
            await publisher.publish(task.uid, JSON.stringify(processedData));
            break;
        case "onrampInr":
            processedData = onrampInr(task.payload);
            await publisher.publish(task.uid, JSON.stringify(processedData));
            break;
        case "mintTokens":
            processedData = mintTokens(task.payload);
            await publisher.publish(task.uid, JSON.stringify(processedData));
            break;
        case "getStockOrderbook":
            processedData = getStockOrderbook(task.payload);
            await publisher.publish(task.uid, JSON.stringify(processedData));
            break;
        case "sellOrder":
            processedData = sellOrder(task.payload);
            await publisher.publish(task.uid, JSON.stringify(processedData));
            await publisher.publish(task.payload.stockSymbol, JSON.stringify(processedData.orderbook));
            break;
        case "buyOrder":
            processedData = buyOrder(task.payload);
            await publisher.publish(task.uid, JSON.stringify(processedData));
            console.log(processedData.orderbook)
            await publisher.publish(task.payload.stockSymbol, JSON.stringify(processedData.orderbook));
            break;
    }
}