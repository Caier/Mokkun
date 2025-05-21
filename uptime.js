const express = require('express')
const app = express()

app.listen(3000, () => console.log("listening..."));
app.get('/', (req,res) => {
    res.send("Running...")
});