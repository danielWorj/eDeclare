import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ServerResponse } from '../../Model/Server/ServerResponse';
import { Observable } from 'rxjs';
import { eHAllSystemEndPoints } from '../../Constant/EndPoints';
import { Declaration } from '../../Model/Acte/Declaration';
import { ActeNaissance } from '../../Model/Acte/ActeNaissance';

@Injectable({
  providedIn: 'root',
})
export class ActeService {

  constructor(private http: HttpClient) {}

  // ── Déclarations ────────────────────────────────────────────────────────

  getAllDeclarationByHopital(id: number): Observable<Declaration[]> {
    return this.http.get<Declaration[]>(
      eHAllSystemEndPoints.Acte.Declaration.allHopital + id
    );
  }

  getAllDeclarationByMairie(id: number): Observable<Declaration[]> {
    return this.http.get<Declaration[]>(
      eHAllSystemEndPoints.Acte.Declaration.allMairie + id
    );
  }

  declarationActeNaissance(formData: FormData): Observable<ServerResponse> {
    return this.http.post<ServerResponse>(
      eHAllSystemEndPoints.Acte.Declaration.declare,
      formData
    );
  }

  misAjourDeclarationActeNaissance(formData: FormData): Observable<ServerResponse> {
    return this.http.post<ServerResponse>(
      eHAllSystemEndPoints.Acte.Declaration.update,
      formData
    );
  }

  // ── Actes de naissance ──────────────────────────────────────────────────

  getAllActeNaissanceByMairie(id: number): Observable<ActeNaissance[]> {
    return this.http.get<ActeNaissance[]>(
      eHAllSystemEndPoints.Acte.ActeNaissance.allMairie + id
    );
  }

  /**
   * Crée un nouvel acte de naissance.
   * Endpoint : POST /eHall/api/declaration/acte/create
   */
  creationActeNaissance(formData: FormData): Observable<ServerResponse> {
    return this.http.post<ServerResponse>(
      eHAllSystemEndPoints.Acte.ActeNaissance.declare,
      formData
    );
  }

  /**
   * Met à jour un acte de naissance existant.
   * Endpoint : PUT /eHall/api/declaration/acte/update/{id}
   *
   * @param id      identifiant de l'acte à modifier
   * @param formData données du formulaire (champ "acte" en JSON + fichiers optionnels)
   */
  misAjourActeNaissance(id: number, formData: FormData): Observable<ServerResponse> {
    return this.http.put<ServerResponse>(
      eHAllSystemEndPoints.Acte.ActeNaissance.update + id,
      formData
    );
  }

  /**
   * Supprime un acte de naissance.
   * Endpoint : GET /eHall/api/declaration/acte/delete/{id}
   */
  deleteActeNaissance(id: number): Observable<ServerResponse> {
    return this.http.get<ServerResponse>(
      eHAllSystemEndPoints.Acte.ActeNaissance.delete + id
    );
  }

  downloadActeNaissance(id: number): Observable<Blob> {
  return this.http.get(
    eHAllSystemEndPoints.Acte.ActeNaissance.download + id,
    { responseType: 'blob' }
  );
}
}