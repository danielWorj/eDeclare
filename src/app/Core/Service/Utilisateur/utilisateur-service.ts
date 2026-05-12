import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Sexe } from '../../Model/Enfant/Sexe';
import { Observable } from 'rxjs';
import { eHAllSystemEndPoints } from '../../Constants/Endpoints';
import { Parent } from '../../Model/User/Parent';

@Injectable({
  providedIn: 'root',
})
export class UtilisateurService {
  constructor(private http: HttpClient) {}

  //Sexe
  getAllSexe():Observable<Sexe[]> {
    return this.http.get<Sexe[]>(eHAllSystemEndPoints.Utilisateur.Sexe.all);
  }

  //Parent 
  getAllParent():Observable<Parent[]>{
    return this.http.get<Parent[]>(eHAllSystemEndPoints.Utilisateur.Parent.all);
  }

  getParentbyId(id:number):Observable<Parent>{
    return this.http.get<Parent>(eHAllSystemEndPoints.Utilisateur.Parent.byId+id);
  }
}
