import { Component } from '@angular/core';
import {FireService} from "./fire.service";
import {COMMA, ENTER} from "@angular/cdk/keycodes";
import {MatChipEditedEvent, MatChipInputEvent} from "@angular/material/chips";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {
  content: any;
  chatname: any;
  email: string = '';
  password: string = '';
  name: string = '';



  constructor(public fireService: FireService) {

  }

}

