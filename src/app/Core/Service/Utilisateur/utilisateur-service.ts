import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Sexe } from '../../Model/Enfant/Sexe';
import { Observable } from 'rxjs';
import { eHAllSystemEndPoints } from '../../Constants/Endpoints';
import { Parent } from '../../Model/User/Parent';
import { ServerResponse } from '../../Model/Server/ServerResponse';
import { Utilisateur } from '../../Model/User/Utilisateur';

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

  // CRUD 
  getAllAgent():Observable<Utilisateur[]>{
    return this.http.get<Utilisateur[]>(eHAllSystemEndPoints.Utilisateur.Agent.all);
  }

  getAllAgentByStructure(id:number):Observable<Utilisateur[]>{
    return this.http.get<Utilisateur[]>(eHAllSystemEndPoints.Utilisateur.Agent.allbystructure+id);
  }

  createAgent(request:any):Observable<ServerResponse>{
    return this.http.post<ServerResponse>(eHAllSystemEndPoints.Utilisateur.Agent.create, request);
  }
  
  updateAgent(request:any):Observable<ServerResponse>{
    return this.http.post<ServerResponse>(eHAllSystemEndPoints.Utilisateur.Agent.update, request);
  }

  deleteAgent(id:number):Observable<ServerResponse>{
    return this.http.get<ServerResponse>(eHAllSystemEndPoints.Utilisateur.Agent.delete+id);
  }


}
