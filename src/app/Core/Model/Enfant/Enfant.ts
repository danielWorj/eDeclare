import { Sexe } from "./Sexe";

export interface Enfant {
    id : number ;
    nom : string ;
    prenom : string ;
    dateNaissance : string ;
    lieuNaissance : string ;
    sexe : Sexe ;
}