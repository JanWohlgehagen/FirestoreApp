const path = require('path');
const express = require('express');
const port = 8100;
const app = express();
const proxy = require('express-http-proxy');
const nocache = require("nocache");


app.use(express.static(__dirname + '/dist/firestore-app/'));
app.use('/*',proxy('http://localhost:'+port+'/*'));
app.use(nocache());

app.get('/*', function(req, res) {
  res.sendFile(path.join(__dirname, '/dist/firestore-app/'));
})
app.listen(process.env.PORT || port, () => {
  console.log("App working at port : http://localhost:"+port)
});
