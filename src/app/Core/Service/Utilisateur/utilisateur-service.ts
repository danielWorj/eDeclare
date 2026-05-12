import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Sexe } from '../../Model/Enfant/Sexe';
import { Observable } from 'rxjs';
import { eHAllSystemEndPoints } from '../../Constant/EndPoints';

@Injectable({
  providedIn: 'root',
})
export class UtilisateurService {
  constructor(private http: HttpClient) {}

  //Sexe
  getAllSexe():Observable<Sexe[]> {
    return this.http.get<Sexe[]>(eHAllSystemEndPoints.Utilisateur.Sexe.all);
  }
}
