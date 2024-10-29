import express from 'express';
import { v4 as uuid4 } from 'uuid';
import { createClient } from 'redis';

export const app = express();
app.use(express.json())

const client= createClient();
const subscriber = createClient();

const handlePubSub = (uid, timeoutMs = 2000) => {
  return new Promise( (resolve, reject) => {

    const timeout = setTimeout( () => {
      subscriber.unsubscribe(uid);
      reject( new Error('Response Timed out'));
    }, timeoutMs);

    subscriber.subscribe(uid, (data) => {
      clearTimeout(timeout);
      subscriber.unsubscribe(uid);
      resolve(data);
    })
  })
}

const handleResponse = (res, payload) => {
  const { error, message, ...data} = JSON.parse(payload)
  if(error){
    return res.status(404).json({
      message : error
    })
  }
  return res.status(200).json({
    message : message || null,
    data
  })
}

const handleRequests = async(res, method, payload) => {
  const uid = uuid4();
  const data = {
    uid,
    method,
    payload
  }
  try{
    await client.lPush("queue", JSON.stringify(data))
    const response = await handlePubSub(uid)
    handleResponse(res, response);
  }catch(e){
    return res.status(500).json({
      error : e.message
    })
  }
}

//route to create a user
app.get('/', (req, res) => {
  res.status(200).send("Server is up and running");
})

app.post('/user/create/:userId', async (req, res) => {
  const userId = req.params.userId;
  const payload = {userId};
  handleRequests(res, "createUser", payload);
//   const data = {
//     method : "createUser",
//     uid : uid,
//     payload : userId
//   }
//   try{
//     await client.lPush( queue, JSON.stringify(data))
//     const response = await handlePubSub(uid)
//     handleResponse( res, response);
//   }catch(e){
//     res.status(500).json({
//       message : e.message
//     })
//   }
})
  //route to create a stock symbol  
app.post('/symbol/create/:stockSymbol', async(req, res) =>{
  const stockSymbol = req.params.stockSymbol;
  handleRequests(res, "createSymbol", {stockSymbol})
})

//route to get the orderbook
app.get('/orderbook', async(req, res) => {
  handleRequests(res, "getOrderbook")
})

//route to get the inr balances
app.get('/balances/inr', (req, res) => {
  handleRequests(res, "getInrBalances")
})

//route to get all the stock balances
app.get('/balances/stock', (req, res) => {
  handleRequests(res, "getStockBalances")
})

//route to get the inr balance of a specific user
app.get('/balance/inr/:userId', (req, res) => {
  const userId = req.params.userId;
  handleRequests(res, "getUserInrBalance", {userId})
})

// route for onramp
app.post('/onramp/inr', (req, res) => {
  const {userId, amount} = req.body;
  handleRequests(res, "onrampInr", {userId, amount})
})  

app.get('/balance/stock/:userId', (req, res) => {
  const userId = req.params.userId;
  handleRequests(res, "getUserStockBalance", {userId})    
})

app.post('/trade/mint', (req, res) => {
  const { userId, stockSymbol, quantity} = req.body
  handleRequests(res, "mintTokens", {userId, stockSymbol, quantity})
})

app.get('/orderbook/:stockSymbol', (req, res) => {
  const stockSymbol = req.params.stockSymbol;
  handleRequests(res, "getStockOrderbook", {stockSymbol})
})

app.post('/order/sell', (req, res) => {
  const { userId, stockSymbol, quantity, stockType, price} = req.body;
  handleRequests(res, "sellOrder", {userId, stockSymbol, quantity, stockType, price})
})

app.post('/order/buy', (req, res) => {
  const { userId, stockSymbol, quantity, stockType, price} = req.body;
  handleRequests(res, "buyOrder", {userId, stockSymbol, quantity, stockType, price})
})

app.listen(3000, async() => {
  try{
    await Promise.all([
      client.connect(),
      subscriber.connect()]
    )
    console.log("Connected to queue and pub sub")
    console.log("Server is running on port 3000")
  }catch(e){
    console.log("Error connecting to queue/pub sub", e.message)
  }
})
