import { Component, signal } from '@angular/core';
import { UtilisateurService } from '../../../../Core/Service/Utilisateur/utilisateur-service';
import { Parent } from '../../../../Core/Model/User/Parent';

@Component({
  selector: 'app-profil',
  imports: [],
  templateUrl: './profil.html',
  styleUrl: './profil.css',
})
export class Profil {
  idParent = signal<number>(0); 
  constructor(private utilisateurService : UtilisateurService){
    this.idParent.set(parseInt(localStorage.getItem("id")!)??0); 
  }

  parentSelected = signal<Parent|null>(null); 

  getParentById(){
    this.utilisateurService.getParentbyId(this.idParent()).subscribe({
      next:(data:Parent)=>{
        this.parentSelected.set(data);
      }, 
      error:()=>{
        console.log('Fetch parent by id : failed'); 
      }
    }); 
  }


}
