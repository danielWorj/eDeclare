import { Component, signal } from '@angular/core';
import { Declaration } from '../../../../Core/Model/Acte/Declaration';
import { ActeService } from '../../../../Core/Service/Acte/acte-service';

@Component({
  selector: 'app-declaration',
  imports: [],
  templateUrl: './declaration.html',
  styleUrl: './declaration.css',
})
export class DeclarationC {
  idParent = signal<number>(0); 
  constructor(private acteService : ActeService) {
    this.idParent.set(parseInt(localStorage.getItem("id")!)??0); 
  }

  listDeclaration = signal<Declaration[]>([])
  getAllDeclarationByParent(){
    this.acteService.getAllDeclarationByParent(this.idParent()).subscribe({
      next:(data:Declaration[])=>{
        this.listDeclaration.set(data); 
      }, 
      error:()=>{
        console.log('Fecth all declaration : failed'); 
      }
    });
  }

  
}
