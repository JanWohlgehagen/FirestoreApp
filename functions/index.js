const functions = require("firebase-functions");
const admin = require('firebase-admin');

admin.initializeApp({projectId: 'fullstack2023-a8967'})

const app = require('express')();
const cors = require('cors');

app.use(cors());

app.post('/CreateUser',(req, res) => {
    var user = req.body;
    admin.firestore().collection('Users').doc(user.id)
        .set({
            name: user.name,
            email: user.email,
            id: user.id
        })
    res.send("done")
})

app.post('/Message', (req, res) => {
    console.log(req.body)
    var message = req.body;
    admin.firestore().collection(`Chats/${message.chatid}/messages`)
        .add({
            content: message.content,
            timestamp: message.timestamp,
            user: message.user
        }).then(async () => {
        await admin.firestore().collection('Chats/').doc(message.chatid)
            .update({
                messageCounter: message.messageCounter
            })
    })

    res.send("added message" + req.content)
})

exports.api = functions.https.onRequest(app);
