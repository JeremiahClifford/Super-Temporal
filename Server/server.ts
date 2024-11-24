let net = require('net')

const IP = '127.0.0.1'
const PORT = 4000

let server = net.createServer((socket) => {
    console.log(`Client Connected: ${socket.remoteAddress}: ${socket.remotePort}`)
    socket.write(`Server sees you`)
    //socket.pipe(socket)
})

server.on('close', () => {
    console.log(`Client Disconnected`)
})

server.listen(PORT, IP)