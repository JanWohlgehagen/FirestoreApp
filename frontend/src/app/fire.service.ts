import {Injectable} from '@angular/core';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import 'firebase/compat/storage';
import 'firebase/compat/functions';

import * as config from '../../firebaseconfig.js';
import {MatChipEditedEvent, MatChipInputEvent} from "@angular/material/chips";
import {COMMA, ENTER} from "@angular/cdk/keycodes";
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class FireService {

  firebaseApplication;
  firestore: firebase.firestore.Firestore;
  auth: firebase.auth.Auth;
  storage: firebase.storage.Storage;
  functions: firebase.functions.Functions;


  chatParticipants: Participant[] = [];
  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  messages: any[] = [];
  chats: any [] = [];
  user: UserDTO | any;
  openChat: any;
  placeholderAvatarURL = 'https://e7.pngegg.com/pngimages/59/644/png-clipart-silhouette-avatar-line-art-silhouette-animals-vexel.png';
  UserAvatar: string = this.placeholderAvatarURL;
  baseAxiosURL: string = 'http://127.0.0.1:5001/fullstack2023-a8967/us-central1/api/'

  constructor() {
    this.firebaseApplication = firebase.initializeApp(config.firebaseConfig);
    this.firestore = firebase.firestore();
    this.auth = firebase.auth();
    this.storage = firebase.storage();
    this.functions = firebase.functions();

    this.firestore.useEmulator('localhost', 8081)
    this.auth.useEmulator('http://localhost:9099')
    this.storage.useEmulator('localhost', 9199)
    this.functions.useEmulator('localhost', 5001)


    this.auth.onAuthStateChanged((user) =>{
      if (user) {
        this.getChats();
        this.setUser();
        this.getUserAvatar();
      }
    })
  }

  async register(email: string, password: string, name: string){
    await this.auth.createUserWithEmailAndPassword(email, password)
      .then((result) => {
        if (result.user) {
          return result.user.updateProfile({
            displayName: name
          }).then(() => {
            let user : UserDTO = {
              email: email,
              name: this.auth.currentUser?.displayName+'',
              id: this.auth.currentUser?.uid+''
            }
            console.log(user)
            axios.post(this.baseAxiosURL+'CreateUser', user).then(success => {
              console.log(success)
            }).catch(err => {
              console.log(err)
            })
          })
        } else return
      }).catch(function(error) {
      console.log(error);
    });
  }

  async signIn(email: string, password: string){
    await this.auth.signInWithEmailAndPassword(email, password)
  }

  signOut(){
    this.auth.signOut()
    this.user = undefined;
    this.chats = [];
    this.openChat = undefined;
    this.UserAvatar = this.placeholderAvatarURL;
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

  q;
  getMessagesFromChat(id) {
    this.openChat = this.chats.find(chat => chat.id == id);

    this.messages = [];
    if(this.q) {
      this.q();
    }
    this.q = this.firestore
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
        });
        this.fetchAvatars();
      })

  }

  private fetchAvatars() {
    let map : Pair [] = []

     this.messages.forEach(async (m) => {
       const found = map.some(el => el.key === m.user.id);
       if (!found){
        await this.storage.ref('avatars').child(m.user.id).getDownloadURL().then( res =>{
          let pair : Pair = {
            key: m.user.id,
            value: res
          }
          map.push(pair)
        }).catch(() => {
          let pair : Pair = {
            key: m.user.id,
            value: this.placeholderAvatarURL
          }
          map.push(pair)
        })
       }
       var pair  = map.find(p => p.key == m.user.id)
       if (pair){
         m.avatarURL = pair.value
       }
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

    let message : PostMessageDTO = {
      content: content,
      timestamp: new Date(),
      user: this.user,
      chatid: this.openChat.id,
      messageCounter: this.openChat.messageCounter+1
    }

    var ChatBoxElement = document.querySelector('#ChatBox'); //Fetch chatbox element from dom
    var ChatInputElement = document.querySelector('#ChatInput'); //Fetch chatbox element from dom


    axios.post(this.baseAxiosURL+'Message', message).then(success => {

    }).catch(err => {
      console.log(err)
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

  convertJsonToMessageDTO(id: any, data: any): MessageDTO {
    const messageDTO: MessageDTO = {
      content: data.content,
      timestamp: data.timestamp,
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

    // Remove participant if it no longer has a name
    if (!value) {
      this.removeParticipant(participant);
      return;
    }

    // Edit existing participant
    const index = this.chatParticipants.indexOf(participant);
    if (index >= 0) {
      this.chatParticipants[index].email = value;
    }
  }

  addParticipant(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our participant
    if (value) {
      this.chatParticipants.push({email: value});
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  async setUser() {
    var ref = await this.firestore.collection('Users')
      .where('id', '==', this.auth.currentUser?.uid).get()
    var data = await ref.docs[0].data()

    this.user = {
      id: data['id'],
      name: data['name'],
      email: data['email']
    }
  }

  async getUserAvatar () {
    try {
      let avatar = await (await this.storage.ref('avatars').child(this.auth.currentUser?.uid + '').getDownloadURL());
      this.UserAvatar = avatar
    } catch(e){

    }


  }

  async updateUserAvatar ($event) {
    const img = $event.target.files[0];
    const uploadTast = await this.storage
      .ref('avatars')
      .child(this.auth.currentUser?.uid+'')
      .put(img)
    this.UserAvatar = await uploadTast.ref.getDownloadURL()
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
  avatarURL?: string;
  id?: string;
}
export interface PostMessageDTO{
  content: string;
  timestamp: Date;
  user: UserDTO;
  avatarURL?: string;
  id?: string;
  chatid?: string;
  messageCounter: number
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
}

export interface Participant {
  email: string;
}

export interface Pair {
  key: string;
  value: string;
}
