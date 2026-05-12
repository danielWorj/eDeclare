import { RoleUser } from "./Utilisateur";

export interface Parent {
    id : number ;
    nom : string ;
    prenom : string ;
    telephone : string ;
    email : string ;
    password_hash : string ;
    creation:string ;
    modification:string ;
    status : boolean ;
    profession:string ; 
    domicile : string; 
    dateNaissance:string; 
    lieuNaissance:string; 

    roleUser:RoleUser ;
    
}