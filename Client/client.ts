let net = require('net')

const IP = '127.0.0.1'
const PORT = 4000

let client = net.Socket()
client.connect(PORT, IP, () => {
    console.log(`Connected`)
    if (client.write(`Client sees you`)) {
        console.log(`Msg Sent`)
    }
})

client.on('data', (data) => {
    console.log(`Msg Received: ${data}`)
})

client.on('close', () => {
    console.log(`Connection Closed`)
})

setTimeout(function() {
    client.destroy()
}, 5000);