import { Component } from '@angular/core';
import {FireService} from "./fire.service";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent {
  content: any;
  chatname: any;


  constructor(public fireService: FireService) {

  }

}
