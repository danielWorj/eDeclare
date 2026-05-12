import { RoleUser } from "./RoleUser";

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

    roleUser:RoleUser ;
    
}