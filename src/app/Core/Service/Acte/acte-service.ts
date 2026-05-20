import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ServerResponse } from '../../Model/Server/ServerResponse';
import { Observable } from 'rxjs';
import { Declaration } from '../../Model/Acte/Declaration';
import { ActeNaissance } from '../../Model/Acte/ActeNaissance';
import { eHAllSystemEndPoints } from '../../Constants/Endpoints';
import { PieceJointeDeclaration } from '../../Model/Acte/PieceJointeDeclaration';

@Injectable({
  providedIn: 'root',
})
export class ActeService {

  constructor(private http: HttpClient) {}

  // ══════════════════════════════════════════════════════════════════════
  // DÉCLARATIONS
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Récupère toutes les déclarations d'une mairie.
   * GET /declaration/all/bymairie/{id}
   */
  getAllDeclarationByParent(id: number): Observable<Declaration[]> {
    return this.http.get<Declaration[]>(
      eHAllSystemEndPoints.Acte.Declaration.allParent + id
    );
  }

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

  /**
   * Crée une nouvelle déclaration de naissance.
   * POST /declaration/create
   */
  declarationActeNaissance(formData: FormData): Observable<ServerResponse> {
    return this.http.post<ServerResponse>(
      eHAllSystemEndPoints.Acte.Declaration.declare,
      formData
    );
  }

  /**
   * Met à jour une déclaration existante.
   * POST /declaration/update
   */
  misAjourDeclarationActeNaissance(formData: FormData): Observable<ServerResponse> {
    return this.http.post<ServerResponse>(
      eHAllSystemEndPoints.Acte.Declaration.update,
      formData
    );
  }

  /**
   * Supprime une déclaration par son identifiant.
   * DELETE /declaration/delete/{id}
   */
  deleteDeclaration(id: number): Observable<ServerResponse> {
    return this.http.delete<ServerResponse>(
      eHAllSystemEndPoints.Acte.Declaration.delete + id
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // ACTES DE NAISSANCE
  // ══════════════════════════════════════════════════════════════════════

  getAllActeNaissanceByMairie(id: number): Observable<ActeNaissance[]> {
    return this.http.get<ActeNaissance[]>(
      eHAllSystemEndPoints.Acte.ActeNaissance.allMairie + id
    );
  }

  /**
   * Crée un nouvel acte de naissance.
   * POST /declaration/acte/create
   */
  creationActeNaissance(formData: FormData): Observable<ServerResponse> {
    return this.http.post<ServerResponse>(
      eHAllSystemEndPoints.Acte.ActeNaissance.declare,
      formData
    );
  }

  /**
   * Met à jour un acte de naissance existant.
   * PUT /declaration/acte/update/{id}
   */
  misAjourActeNaissance(id: number, formData: FormData): Observable<ServerResponse> {
    return this.http.put<ServerResponse>(
      eHAllSystemEndPoints.Acte.ActeNaissance.update + id,
      formData
    );
  }

  /**
   * Supprime un acte de naissance.
   * GET /declaration/acte/delete/{id}
   */
  deleteActeNaissance(id: number): Observable<ServerResponse> {
    return this.http.get<ServerResponse>(
      eHAllSystemEndPoints.Acte.ActeNaissance.delete + id
    );
  }

  /**
   * Télécharge le PDF d'un acte de naissance.
   * GET /declaration/acte/download/{id}
   */
  downloadActeNaissance(id: number): Observable<Blob> {
    return this.http.get(
      eHAllSystemEndPoints.Acte.ActeNaissance.download + id,
      { responseType: 'blob' }
    );
  }
  //Pieces jointes 
findPieceJointes(id:number):Observable<PieceJointeDeclaration[]>{
  return this.http.get<PieceJointeDeclaration[]>(eHAllSystemEndPoints.Acte.Declaration.PieceJointe.allbydeclaration+id);
}
}