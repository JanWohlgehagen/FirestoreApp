import { Injectable } from '@angular/core';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

import * as config from '../../firebaseconfig.js';

@Injectable({
  providedIn: 'root'
})
export class FireService {

  firebaseApplication;
  firestore: firebase.firestore.Firestore;
  messages: any[] = [];
  chats: any [] = [];
  openChatId: any;
  messageCounter: any;
  constructor() {
    this.firebaseApplication = firebase.initializeApp(config.firebaseConfig);
    this.firestore = firebase.firestore();
    this.getChats();
  }


  async getChats() {
    this.firestore
      .collection('Chats')
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change =>{
          if(change.type=="added"){
            this.chats.push({id: change.doc.id, data: change.doc.data()});
          }
          if (change.type=="modified"){
            const index = this.messages.findIndex(document => document.id!= change.doc.id);
            this.chats[index] = {
              id: change.doc.id,
              data: change.doc.data()
            }
          }
          if (change.type=="removed"){
            this.chats = this.chats.filter(m => m.id != change.doc.id);
          }
        })
      })
  }

  getMessagesFromChat(id, messagecounter) {
    this.openChatId = id;
    this.messageCounter = messagecounter;

    this.messages = [];
    this.firestore
      .collection(`/Chats/${id}/messages`)
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change =>{
          if(change.type=="added"){
            this.messages.push({id: change.doc.id, data: change.doc.data()});
          }
          if (change.type=="modified"){
            const index = this.messages.findIndex(document => document.id!= change.doc.id);
            this.messages[index] = {
              id: change.doc.id,
              data: change.doc.data()
            }
          }
          if (change.type=="removed"){
            this.messages = this.messages.filter(m => m.id != change.doc.id);
          }
        })
      })
  }

  CreateNewChat(chatname: any) {
    let chat : ChatDTO = {
      chatname: chatname,
      messageCounter: 0
    }
    console.log(this.openChatId)
    this.firestore.collection(`Chats`)
      .add(chat)
  }

  async sendMessage(content: any) {
    let message : MessageDTO = {
      content: content,
      timestamp: new Date().toString(),
      userid: '2'
    }

    await this.firestore.collection(`Chats/${this.openChatId}/messages`)
      .add(message)

    this.firestore.collection('Chats/').doc(this.openChatId)
      .update({
       messageCounter: this.messageCounter+1
      }).then( ()=>{
      this.messageCounter +=1
    })

  }

  DeleteChat(messagesId: any) {
    this.firestore.collection('Chats').doc(messagesId).delete()

  }
}

export interface ChatDTO{
  chatname: string;
  messageCounter: number;
}
export interface MessageDTO{
  content: string;
  timestamp: string;
  userid: string;
}
