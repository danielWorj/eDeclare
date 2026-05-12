import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Etablissement } from '../../Model/Etablissement/Etablissement';
import { eHAllSystemEndPoints } from '../../Constant/EndPoints';
import { ServerResponse } from '../../Model/Server/ServerResponse';
import { Mairie } from '../../Model/Etablissement/Mairie';
import { Hopital } from '../../Model/Etablissement/Hopital';

@Injectable({
  providedIn: 'root',
})
export class EtablissementService {
  constructor(private http : HttpClient) {}

  //CRUD Mairie
  getAllMairie():Observable<Mairie[]> {
    return this.http.get<Mairie[]>(eHAllSystemEndPoints.structure.Mairie.all);
  }

  getMairieByid(id:number): Observable<Mairie> {
    return this.http.get<Mairie>(eHAllSystemEndPoints.structure.Mairie.byid + id);
  }

  createMairie(request:any): Observable<ServerResponse> {
    return this.http.post<ServerResponse>(eHAllSystemEndPoints.structure.Mairie.create, request);
  }

  updateMairie(request:any): Observable<ServerResponse> {
    return this.http.post<ServerResponse>(eHAllSystemEndPoints.structure.Mairie.update, request);
  }

  deleteMairie(id:number): Observable<ServerResponse> {
    return this.http.delete<ServerResponse>(eHAllSystemEndPoints.structure.Mairie.delete + id);
  }
  

  //CRUD Hopital
  getAllHopital():Observable<Hopital[]> {
    return this.http.get<Hopital[]>(eHAllSystemEndPoints.structure.Hopital.all);
  }

  getHopitalByid(id:number): Observable<Hopital> {
    return this.http.get<Hopital>(eHAllSystemEndPoints.structure.Hopital.byid + id);
  }

  createHopital(request:any): Observable<ServerResponse> {
    return this.http.post<ServerResponse>(eHAllSystemEndPoints.structure.Hopital.create, request);
  }

  updateHopital(request:any): Observable<ServerResponse> {
    return this.http.post<ServerResponse>(eHAllSystemEndPoints.structure.Hopital.update, request);
  }

  deleteHopital(id:number): Observable<ServerResponse> {
    return this.http.delete<ServerResponse>(eHAllSystemEndPoints.structure.Hopital.delete + id);
  }
}
