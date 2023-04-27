const functions = require("firebase-functions");
const admin = require('firebase-admin');

admin.initializeApp({projectId: 'fullstack2023-a8967'})

const app = require('express')();
const cors = require('cors');

app.use(cors());

app.post('/CreateUser',(req, res) => {
    setUser(req.body)
    res.send("done")
})


function setUser(user) {
    admin.firestore().collection('Users').doc(user.id)
        .set({
            name: user.name,
            email: user.email,
            id: user.id
        })
}

exports.api = functions.https.onRequest(app);
