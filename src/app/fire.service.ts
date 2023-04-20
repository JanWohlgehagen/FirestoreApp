import {Injectable} from '@angular/core';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

import * as config from '../../firebaseconfig.js';
import {MatChipEditedEvent, MatChipInputEvent} from "@angular/material/chips";
import {COMMA, ENTER} from "@angular/cdk/keycodes";
import {MatSnackBar} from "@angular/material/snack-bar";


@Injectable({
  providedIn: 'root'
})
export class FireService {

  firebaseApplication;
  firestore: firebase.firestore.Firestore;
  auth: firebase.auth.Auth;
  chatParticipants: Participant[] = [];
  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;

  messages: any[] = [];
  chats: any [] = [];
  user: UserDTO | any;
  openChat: any;
  messageCounter: any;

  constructor() {
    this.firebaseApplication = firebase.initializeApp(config.firebaseConfig);
    this.firestore = firebase.firestore();
    this.auth = firebase.auth();
    this.auth.onAuthStateChanged((user) =>{
      if (user) {
        this.getChats();
        this.setUser();
      }
    })
  }

  async register(email: string, password: string, name: string){
    await this.auth.createUserWithEmailAndPassword(email, password).then(() => {
      let user : UserDTO = {
        email: email,
        name: name,
        id: this.auth.currentUser?.uid+''
      }

      this.firestore.collection(`Users`)
        .add(user)
    })
  }

  async signIn(email: string, password: string){
    await this.auth.signInWithEmailAndPassword(email, password).then(()=> {

    })
  }

  signOut(){
    this.auth.signOut()
    this.user = undefined;
    this.chats = [];
    this.openChat = undefined;
  }


  async getChats() {
    this.firestore
      .collection('Chats')
      .where('owners', 'array-contains', this.auth.currentUser?.email)
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
  }

  CreateNewChat(chatname: any) {
    let tempArray: string [] = [];

    this.chatParticipants.forEach(participant =>{
      tempArray.push(participant.email);
    })

    tempArray.push(this.auth.currentUser?.email+"")


    let chat : ChatDTO = {
      chatname: chatname,
      messageCounter: 0,
      owners: tempArray
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
      user: this.user
    }
    var ChatBoxElement = document.querySelector('#ChatBox'); //Fetch chatbox element from dom
    var ChatInputElement = document.querySelector('#ChatInput'); //Fetch chatbox element from dom

    console.log(this.openChat.id)
    console.log(message)

    await this.firestore.collection(`Chats/${this.openChat.id}/messages`)
      .add(message)

    await this.firestore.collection('Chats/').doc(this.openChat.id)
      .update({
       messageCounter: this.messageCounter+1
      }).then( ()=>{
      this.messageCounter +=1
    })

    // @ts-ignore
    ChatBoxElement.scroll({top: 100, left: 0, behavior: 'smooth'})
    // @ts-ignore
    ChatInputElement.value = '';
  }

  async deleteMessage(id) {
    await this.firestore.collection(`Chats/${this.openChat.id}/messages`).doc(id).delete()
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
      user: data.user,
      id: id
    }
    return messageDTO;
  }

  convertJsonToChatDTO(id: any, data: any): ChatDTO{
    const chatDTO: ChatDTO = {
      chatname: data.chatname,
      messageCounter: data.messageCounter,
      owners: [],
      id: id
    }
    return chatDTO;
  }

  removeParticipant(participant: Participant) {
    const index = this.chatParticipants.indexOf(participant);

    if (index >= 0) {
      this.chatParticipants.splice(index, 1);
    }
  }

  editParticipant(participant: Participant, event: MatChipEditedEvent) {

    const value = event.value.trim();

    // Remove fruit if it no longer has a name
    if (!value) {
      this.removeParticipant(participant);
      return;
    }

    // Edit existing fruit
    const index = this.chatParticipants.indexOf(participant);
    if (index >= 0) {
      this.chatParticipants[index].email = value;
    }
  }

  addParticipant(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      this.chatParticipants.push({email: value});
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  async setUser() {
    var ref = await this.firestore.collection('Users')
      .where('id', '==', this.auth.currentUser?.uid).get()
    var data = ref.docs[0].data()

    this.user = {
      id: data['id'],
      name: data['name'],
      email: data['email']
    }
  }
}


export interface ChatDTO{
  chatname: string;
  messageCounter: number;
  owners: string[];
  id?: string;
}
export interface MessageDTO{
  content: string;
  timestamp: Date;
  user: UserDTO;
  id?: string;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
}

export interface Participant {
  email: string;
}
