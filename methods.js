let INR_BALANCES = {
    user1 : {
        balance : 50000,
        locked : 0
    },
    user2 : {
        balance : 0,
        locked : 0
    }
}

let ORDERBOOK = {
    BTC_USDT_10_Oct_2024_9_30: {
             yes: {
                 9.5: {
                     total: 12,
                     orders: {
                         user1: 2,
                         user2: 10
                     }
                 },
                 8.5: {
                     total: 12,
                     orders: {
                         user1: 3,
                         user2: 3,
                         user3: 6
                     }
                 },
             },
    }
 }

 
let STOCK_BALANCES = {
	user1: {
	   "BTC_USDT_10_Oct_2024_9_30": {
		   yes: {
			   quantity: 1,
			   locked: 0
		   }
	   }
	},
	user2: {
		"BTC_USDT_10_Oct_2024_9_30": {
           yes : {
            quantity : 0,
            locked : 10
           },
		   no: {
			   quantity: 3,
			   locked: 4
		   }
	   }
	}
}

export const createUser = (payload) =>{
    const {userId} = payload
    if(INR_BALANCES[userId]){
        return {
            error : "User already exists",
        }
    }
    INR_BALANCES = {
        ...INR_BALANCES,
        [userId] : {
            balance : 0,
            locked  : 0
        }
    }
    STOCK_BALANCES = {
        ...STOCK_BALANCES,
        [userId] : {}
    }
    return {message : `User ${userId} created successfully`, balance : INR_BALANCES[userId]}
}

export const createSymbol = (payload) => {
    const {stockSymbol} = payload
    const users = Object.keys(STOCK_BALANCES);
    for (const user of users){
        STOCK_BALANCES[user] = STOCK_BALANCES[user] || {};
        STOCK_BALANCES[user][stockSymbol] = {
            yes : {
                quantity : 0,
                locked : 0
            },
            no : {
                quantity : 0,
                locked : 0
            }
        }   
    }
    return {
        message : `Symbol ${stockSymbol} created`
    }
}

export const getOrderbook = () => {
    return {ORDERBOOK}
}

export const getInrBalances = () => {
    return {INR_BALANCES}
}

export const getStockBalances = () => {
    return {STOCK_BALANCES}
}

export const getUserInrBalance = (payload) => {
    const userId = payload.userId;
    if(!INR_BALANCES[userId]){
        return {
            error : "User doesnt exist"
        }
    }
    return {
        balance : INR_BALANCES[userId]
    }
}

export const getUserStockBalance = (payload) => {
    const userId = payload.userId;
    if(!INR_BALANCES[userId]){
        return {
            error : "User doesnt exist"
        }
    }
    return {
        balance : STOCK_BALANCES[userId]
    }
}

export const onrampInr = (payload) => {
    const {userId, amount} = payload;
    if(!INR_BALANCES[userId]){
        return {
            error : "User doesnt exist"
        }
    }
    INR_BALANCES[userId]["balance"] += parseInt(amount)
    return{
    message : `Onramped ${userId} with amount ${amount}`,
    balance : INR_BALANCES[userId]
    }
}

export const mintTokens = (payload) => {
    const { userId, stockSymbol, quantity} = payload
    if(!INR_BALANCES[userId]){
        return {
            error : "User doesnt exist"
        }
    }
    const eligible = INR_BALANCES[userId]["balance"] >= quantity * 1000
    if (!eligible){
        return{
            error : "Insufficient balance"
        }
    }
    INR_BALANCES[userId]["balance"] -= quantity * 1000
    STOCK_BALANCES[userId][stockSymbol]["yes"]["quantity"] += quantity
    STOCK_BALANCES[userId][stockSymbol]["no"]["quantity"] += quantity
    return{
        messasge : `Minted ${quantity} 'yes' and 'no' tokens for user ${userId}, remaining balance is ${INR_BALANCES[userId]["balance"]} `,
        balance : STOCK_BALANCES[userId]
    }
}

export const getStockOrderbook = (payload) => {
    const {stockSymbol} = payload;
    if(!ORDERBOOK[stockSymbol]){
        return{
            message : "Stock doesnt exist!"
        }
    }
    return{
        orderBook : ORDERBOOK[stockSymbol]
    }
}

function checkOrderbook(stockSymbol, stockType, price){
    if (!ORDERBOOK[stockSymbol]) ORDERBOOK[stockSymbol] = {};
    if (!ORDERBOOK[stockSymbol][stockType]) ORDERBOOK[stockSymbol][stockType] = {};
    if (!ORDERBOOK[stockSymbol][stockType][price]) {
        ORDERBOOK[stockSymbol][stockType][price] = {
            orders: {},
            total: 0
        };
    }
}
function checkStockBalance(userId, stockSymbol, stockType){
    if(!STOCK_BALANCES[userId][stockSymbol]){
        STOCK_BALANCES[userId][stockSymbol]={};
    }
    if(!STOCK_BALANCES[userId][stockSymbol][stockType]){
        STOCK_BALANCES[userId][stockSymbol][stockType]={quantity:0,locked:0};
    }
}

export const sellOrder = (payload) => {
    const { userId, stockSymbol, quantity, stockType} = payload;
    let {price} = payload
    price = price / 100;

    const eligible = STOCK_BALANCES[userId] &&
    STOCK_BALANCES[userId][stockSymbol] &&
    STOCK_BALANCES[userId][stockSymbol][stockType] &&
    STOCK_BALANCES[userId][stockSymbol][stockType]["quantity"] >= quantity;

    if (!eligible){
        return{
            error : "Insufficient stock balance"
        }
    }
    if(quantity <= 0){
        return{
            error : "Quantity should be > 0"
        }
    }

    STOCK_BALANCES[userId][stockSymbol][stockType]["quantity"] -= quantity
    STOCK_BALANCES[userId][stockSymbol][stockType]["locked"] += quantity

    checkOrderbook(stockSymbol, stockType, price)

    ORDERBOOK[stockSymbol][stockType][price]["orders"][userId] += quantity
    ORDERBOOK[stockSymbol][stockType][price]["total"] += quantity

    return{
        message : `Sell order placed for ${quantity} '${stockType}' options at price ${price}`,
        orderBook : ORDERBOOK[stockSymbol]
    }
}

export const buyOrder = (payload) => {
    const { userId, stockSymbol, quantity, stockType} = payload
    const oppType = stockType === 'yes' ? 'no' : 'yes';
    let {price} = payload;
    price = price / 100;
    const amount = quantity * price * 100;
    
    if( price < 0 || price > 10){
        return{
            error : "Price should be within 0-10"
        }
    }
    const oppPrice = 10 - price
    
    if (!INR_BALANCES[userId]) {
        return{
            error : "User Not found!"
        }
    }

    const eligible = INR_BALANCES[userId].balance >= amount
    if(!eligible){
        return{
            error : "Insufficient balance"
        }
    }
    //lock the INR balance amount 
    INR_BALANCES[userId]['balance'] -= amount
    INR_BALANCES[userId]['locked'] += amount
    //sorted price
    // Ensure stockSymbol, stockType, and price exist in the ORDERBOOK before accessing them
    checkOrderbook(stockSymbol, stockType, price)

    //Sort the price in ascending order
    const sortedPrice = Object.keys(ORDERBOOK[stockSymbol][stockType]).sort((a, b) => parseFloat(a) - parseFloat(b));
    let remaining = quantity;
    let fullyMatched = false;
    if (sortedPrice.length > 0 && price >= sortedPrice[0]){
        for ( const updatedPrice of sortedPrice){
            if( updatedPrice > price) break
            const orders =  ORDERBOOK[stockSymbol][stockType][updatedPrice]["orders"];
            console.log(orders)
            for (const seller in orders){
                console.log("Inside the second loop ", seller)
                if (remaining <= 0){
                    fullyMatched = true;
                    break;
                }
                const currentSeller = orders[seller]

                const valueToReduce = Math.min(currentSeller, remaining)
                //Reduce the values from the orderbook
                ORDERBOOK[stockSymbol][stockType][updatedPrice]['orders'][seller] -= valueToReduce
                ORDERBOOK[stockSymbol][stockType][updatedPrice]['total'] -= valueToReduce

                checkStockBalance(userId, stockSymbol, stockType);
                checkStockBalance(seller, stockSymbol, stockType)
                //update the stock balances for the buyer and the seller
                STOCK_BALANCES[userId][stockSymbol][stockType]['quantity'] += valueToReduce
                STOCK_BALANCES[seller][stockSymbol][stockType]['locked'] -= valueToReduce

                //Update the INR balances
                INR_BALANCES[seller]['balance'] += valueToReduce * updatedPrice * 100 
                INR_BALANCES[userId]['locked'] -= valueToReduce * updatedPrice * 100
                

                remaining -= valueToReduce
                console.log("Remaining value", remaining)

                //Remove the user for qty 0 from orderbook
                if(orders[seller] === 0){
                    delete ORDERBOOK[stockSymbol][stockType][price]['orders'][seller]
                }
                //Remove the stock
                if( ORDERBOOK[stockSymbol][stockType][updatedPrice]['total'] === 0){
                    delete ORDERBOOK[stockSymbol][stockType][updatedPrice]
                }
            }
            if(fullyMatched) break
        }
        if (remaining > 0){
            console.log("Remaining is",remaining)
            // Ensure stockSymbol, oppType, and oppPrice exist in the ORDERBOOK before accessing them
            checkOrderbook(stockSymbol, oppType, oppPrice)

            if (!ORDERBOOK[stockSymbol][oppType][oppPrice]['orders'][userId]) {
                ORDERBOOK[stockSymbol][oppType][oppPrice]['orders'][userId] = 0
            }

            ORDERBOOK[stockSymbol][oppType][oppPrice]['orders'][userId] += remaining
            ORDERBOOK[stockSymbol][oppType][oppPrice]['total'] += remaining
            return{
                message : `Buy order matched partially, ${remaining} remaining`,
                orderbook : ORDERBOOK[stockSymbol]
            }
        }else {
            return {
                message : `Buy order fully matched at price ${price}`,
                orderbook : ORDERBOOK[stockSymbol]
            }
        }
    }else {
        // Ensure stockSymbol, oppType, and oppPrice exist in the ORDERBOOK before accessing them
        checkOrderbook(stockSymbol, oppType, oppPrice)

        ORDERBOOK[stockSymbol][oppType][oppPrice]['orders'][userId] += remaining
        ORDERBOOK[stockSymbol][oppType][oppPrice]['total'] += remaining
        return{
            message : 'Buy Order placed and pending',
            orderbook : ORDERBOOK[stockSymbol]
        }
    }
}