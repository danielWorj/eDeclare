import { Structure } from "../Etablissement/Structure";

export interface Utilisateur{
    id: number ; 
    nom : string ; 
    prenom :string ; 
    telephone: string ; 
    email : string ; 
    password : string; 
    creation : string; 
    modification : string; 

    statutUser : StatutUser; 
    roleUser: RoleUser ; 
    structure : Structure; 
}

export interface StatutUser{
    id : number ;
    nom : string ; 
    //1- EN ATTENTE 
    //2- ACTIF 
    //3- BLOQUE 
}

export interface RoleUser{
    id : number ; 
    nom : string ; 
    description : string; 
}