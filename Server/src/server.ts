//express server setup
const express = require("express")
const bodyParser = require('body-parser')
const app = express()

const fs = require('fs')

//data from the json file
let settings = require('../data/settings.json')

//settings to make data parsing and connecting work
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Credentials', true)
    next()
})

app.get("/test", (request, response) => {
    response.send("Test Answer")
})

//opens the server on the specified port
app.listen(settings.Port, () => {
    console.log(`Listen on the port ${settings.Port}`)
})