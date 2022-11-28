import { Injectable } from '@angular/core';
import { FieldValue, collection, serverTimestamp } from '@angular/fire/firestore';

import { docData } from '@angular/fire/firestore';
import {
  getDownloadURL,
  ref,
  getStorage,
  uploadString,
} from '@angular/fire/storage';
import { Photo } from '@capacitor/camera';

import {
  doc,
  Firestore,
  getDocs,
  setDoc,
  addDoc,
  query,
  orderBy,
} from '@angular/fire/firestore';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';
import { VirtualTimeScheduler } from 'rxjs';
import { format } from 'url';

export interface User {
  uid: string;
  email: string;
}

export interface TimeC {
  ct: FieldValue;
}

export interface Message {
  createdAt: FieldValue;
  id: string;
  from: string;
  msg: string;
  fromName: string;
  myMsg: boolean;
}

export interface Response {
  id: string;
  fromName: string;
  myMsg: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  currentUser: User | any;
  messages: Message[] = [];
  response: Response[] = [];
  storage = getStorage();
  act: TimeC | any = <TimeC>({
    ct: serverTimestamp()
  });

  constructor(private afAuth: Auth, private afs: Firestore) {
    this.afAuth.onAuthStateChanged((user) => {
      this.currentUser = user;
    });
  }

  async signup({ email, password } : { email: any, password: any}): Promise<any> {
    const credential = await createUserWithEmailAndPassword(this.afAuth,
      email,
      password
    );

    const user = credential.user;
    const userDocRef = doc(this.afs, `users/${user.uid}`);

    return setDoc(userDocRef, {
      uid: `${user.uid}`,
      email: user.email,
    });
  }

  signIn({ email, password } : { email: any, password: any}) {
    return signInWithEmailAndPassword(this.afAuth, email, password);
  }

  signOut(): Promise<void> {
    return signOut(this.afAuth);
  }

  addChatMessage(msg: string) {
    return addDoc(collection(this.afs, 'messages'), {
      msg: msg,
      from: this.currentUser.uid,
      createdAt: serverTimestamp(),
    });
  }



  async getChatMessages(users: User[]) {
    console.log(users.length)
    const qy = query(collection(this.afs, 'messages'), orderBy('createdAt'))
    await getDocs(qy).then((msgs) => {
      msgs.docs.forEach((msg) => {
        this.messages.push(msg.data() as Message)
      });
      console.log(this.messages)

      this.messages.map((msg) => {
        console.log(msg)
        msg.fromName = this.getUserForMsg(msg.from, users)
        msg.myMsg = this.currentUser.uid == msg.from;
        msg.createdAt
      });
    })
    console.log(JSON.stringify(this.messages))
    return this.messages
  }

  getUsers() {
    const qy = query(collection(this.afs, 'users'))
    return getDocs(qy);
  }


  private getUserForMsg(msgFromId: string, users: User[]): string {
    for (let usr of users) {
      if (usr.uid == msgFromId) {
        return usr.email;
      }
    }
    return 'Deleted';
  }

  async uploadImage(cameraFile: Photo | any) {
    const user = this.currentUser;
    var curr = Math.random().toString(36).slice(1, 7)
    const path = `chat/${user.uid}/${curr}file.png`;
    const storageRef = ref(this.storage, path);

    try {
      await uploadString(storageRef, cameraFile.base64String, 'base64');

      const imageUrl = await getDownloadURL(storageRef);

      addDoc(collection(this.afs, 'messages'), {
        msg: imageUrl,
        from: this.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      return true;
    } catch (e) {
      return null;
    }
  }


}
