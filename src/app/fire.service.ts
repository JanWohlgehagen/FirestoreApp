import {Injectable} from '@angular/core';
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
  openChat: any;
  messageCounter: any;
  constructor() {
    this.firebaseApplication = firebase.initializeApp(config.firebaseConfig);
    this.firestore = firebase.firestore();
    this.getChats();
  }


  async getChats() {
    this.firestore
      .collection('Chats')
      .orderBy('messageCounter', 'desc')
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change =>{
          let chat: ChatDTO = this.convertJsonToChatDTO(change.doc.id, change.doc.data());
          if(change.type=="added"){
            this.chats.push(chat);
          }
          if (change.type=="modified"){
            const index = this.chats.findIndex(document => document.id.toString() == change.doc.id.toString());
            this.chats[index] = chat
            console.log(this.openChat)
          }
          if (change.type=="removed"){
            this.chats = this.chats.filter(m => m.id != chat.id);
          }
        })
      })
  }

  getMessagesFromChat(id, messagecounter) {
    this.openChat = this.chats.find(chat => chat.id == id);
    this.messageCounter = messagecounter;

    this.messages = [];
    this.firestore
      .collection(`/Chats/${id}/messages`)
      .orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
        snapshot.docChanges().forEach(change =>{
          let message: MessageDTO = this.convertJsonToMessageDTO(change.doc.id, change.doc.data());
          if(change.type=="added"){
            this.messages.push(message);
          }
          if (change.type=="modified"){
            const index = this.messages.findIndex(document => document.id!= change.doc.id);
            this.messages[index] = message;
          }
          if (change.type=="removed"){
            this.messages = this.messages.filter(m => m.id != message.id);
          }
        })
      })
    console.log(this.openChat)
  }

  CreateNewChat(chatname: any) {
    let chat : ChatDTO = {
      chatname: chatname,
      messageCounter: 0
    }

    this.firestore.collection(`Chats`)
      .add(chat)
  }

  async sendMessage(content: any) {
    if (this.openChat.id == undefined)
      return

    let message : MessageDTO = {
      content: content,
      timestamp: new Date(),
      userid: '2'
    }
    var ChatBoxElement = document.querySelector('#ChatBox'); //Fetch chatbox element from dom
    var ChatInputElement = document.querySelector('#ChatInput'); //Fetch chatbox element from dom

    await this.firestore.collection(`Chats/${this.openChat.id}/messages`)
      .add(message)

    await this.firestore.collection('Chats/').doc(this.openChat.id)
      .update({
       messageCounter: this.messageCounter+1
      }).then( ()=>{
      this.messageCounter +=1
    })
    // @ts-ignore
    ChatBoxElement.scrollTop = ChatBoxElement.scrollHeight; //scroll to bottom of the chat box
    // @ts-ignore
    ChatInputElement.value = '';

  }

  DeleteChat(chat_id: any) {
    this.firestore.collection('Chats').doc(chat_id).delete()
    if(this.openChat) {
      if (chat_id === this.openChat.id) {
        this.openChat = undefined;
      }
    }
  }

  async clearOpenChat(chat_id) {
    var snapshot = await this.firestore.collection(`Chats/${chat_id}/messages`)
      .where('timestamp', '<', new Date).get();

    // Delete documents in a batch
    const batch = this.firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    await this.firestore.collection('Chats/').doc(this.openChat.id)
      .update({
        messageCounter: 0
      });

  }

  convertJsonToMessageDTO(id: any, data: any): MessageDTO{
    const messageDTO: MessageDTO = {
      content: data.content,
      timestamp: data.timestamp.toDate(),
      userid: data.user,
      id: id
    }
    return messageDTO;
  }

  convertJsonToChatDTO(id: any, data: any): ChatDTO{
    const chatDTO: ChatDTO = {
      chatname: data.chatname,
      messageCounter: data.messageCounter,
      id: id
    }
    return chatDTO;
  }
}


export interface ChatDTO{
  chatname: string;
  messageCounter: number;
  id?: string;
}
export interface MessageDTO{
  content: string;
  timestamp: Date;
  userid: string;
  id?: string;
}
