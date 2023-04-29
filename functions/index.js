const functions = require("firebase-functions");
const admin = require('firebase-admin');
const { uuid } = require('uuidv4')


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
    var message = req.body;
    admin.firestore().collection(`Chats/${message.chatid}/messages`)
        .add({
            content: message.content,
            timestamp: message.timestamp,
            user: message.user
        })
    res.send("added message" + req.content)
})

app.put('/Avatar', async (req, res) => {
    var img = req.rawBody;
    var userid = req.headers.userid;

    const bucket = admin.storage().bucket('gs://fullstack2023-a8967.appspot.com/');

    const file = bucket.file(`avatars/${userid}.jpg`)
    const stream = file.createWriteStream({
        resumable: false
    });

    stream.write(Buffer.from(img));
    stream.end();

    const [uploadResult] = await file.getMetadata();
    res.send(uploadResult.mediaLink)
})




exports.api = functions.https.onRequest(app);

exports.onMessageSent = functions.firestore
    .document('Chats/{chatId}/messages/{messageId}')
    .onCreate( async (snap, context) => {
        var chatid = context.params.chatId;
        const ref =  admin.firestore()
            .collection('Chats')
            .doc(chatid)
            .collection('messages');
        const message_counter = await ref.count().get()

        await admin.firestore().collection('Chats/').doc(chatid)
            .update({
                messageCounter: message_counter.data().count
            })
    });


exports.onDeletedSent = functions.firestore
    .document('Chats/{chatId}/messages/{messageId}')
    .onDelete( async (snap, context) => {
        var chatid = context.params.chatId;
        const ref =  admin.firestore()
            .collection('Chats')
            .doc(chatid)
            .collection('messages');
        const message_counter = await ref.count().get()

        await admin.firestore().collection('Chats/').doc(chatid)
            .update({
                messageCounter: message_counter.data().count
            })
    });
